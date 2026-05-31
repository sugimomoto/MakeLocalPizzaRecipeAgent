# Slice 9 設計 — アプリ層レートリミット

> 対応 requirements: [requirements.md](./requirements.md) v1.0
> 想定リリース: v0.9.0
> 関連 Issue: [#2](https://github.com/sugimomoto/MakeLocalPizzaRecipeAgent/issues/2)

---

## 0. 概観

Slice 9 では **4 つの層**に変更を加える:

| 層 | 内容 |
| --- | --- |
| **0. Firebase Admin SDK 導入** | 既存 repo は client-side Firestore のみ。本 Slice で `firebase-admin` を新規導入し、server-side から Firestore に書き込む経路を作る |
| **A. 共通 middleware** | `withRateLimit` 新設。`withAuthOptional` の内側にネスト |
| **B. route handler** | 3 ルート (`quicktap/sessions`, `quicktap/sessions/[id]/reroll`, `recipes/[candidateId]`) で `withRateLimit` を適用 |
| **C. クライアント** | 3 hook (`use-quicktap-stream`, `use-recipe-detail-stream`, reroll 周り) で 429 を catch → Toast |

Firestore に `rate_limits` collection を新設し、TTL ポリシーで自動削除させる。

### 0.1 Firebase Admin SDK 導入の判断 (2026-05-30 追記)

実装着手時に「現 repo に Admin SDK が未導入で、Firestore 書き込みは client-only」と判明。
代替案として Cloud Run in-memory store (instance 単位) も検討したが、max-instances=5 で
最悪 5x の許容 (詳細 25/h = \$1/h × 24h × 30d = **\$720/月の頭打ち**) となり、個人開発として
許容できないリスク。

→ **Admin SDK を新規導入**して Firestore instance 間共有カウンタを実装する判断。
工数 +1-2h 想定 (依存追加 / ADC 認証 / Cloud Run SA 確認 / テスト)。

長期的なコントロール性 (将来 reCAPTCHA Enterprise / Cloud Armor 等を入れる際の
共通基盤としても使える) を優先。

```
[client fetch] → [withAuthOptional] → [withRateLimit] → [handler]
                       ↓                     ↓
                  AuthSubject            Firestore tx
                  (uid/guest)            counter +1
                                              ↓ over limit?
                                              ↓
                                           429 + Retry-After
```

---

## 1. アーキテクチャ

### 1.1 middleware ネスト順序

```ts
export const POST = withAuthOptional(
  withRateLimit({ limit: 5, routeKey: '/api/recipes/[id]' }, async (req, ctx) => {
    // 既存ハンドラ
  }),
);
```

- **外側**: `withAuthOptional` (AuthSubject 解決)
- **内側**: `withRateLimit` (AuthSubject を見て key を決定)
- ハンドラ本体は最内。limit 超過時は handler を**呼ばない** (= Vertex AI コスト発生せず)

`withAuthOptional` 自体には変更なし。`AuthedHandler<T>` 型を再利用し、`withRateLimit` も同じシグネチャを返す HOF として実装する。

### 1.2 主要モジュール

| パス | 役割 |
| --- | --- |
| `src/lib/rate-limit/store.ts` | `RateLimitStore` interface + Firestore 実装 + Memory 実装 (テスト用) |
| `src/lib/rate-limit/key.ts` | `resolveRateLimitKey(request, subject)` — 優先順位ロジック |
| `src/lib/rate-limit/bucket.ts` | `hourBucket(now: Date): string` — `YYYYMMDDHH` (UTC) |
| `src/lib/http/with-rate-limit.ts` | `withRateLimit({...}, handler)` HOF |
| `src/lib/firebase/admin.ts` (**新規**) | Firebase Admin SDK の初期化 + `getAdminFirestore()` |

### 1.3 IP 抽出

Cloud Run は `X-Forwarded-For` を信頼可能 (GFE 経由)。実装:

```ts
function extractIp(request: Request): string | null {
  const xff = request.headers.get('x-forwarded-for');
  if (!xff) return null;
  // 先頭 = original client IP (Cloud Run 標準)
  return xff.split(',')[0]?.trim() || null;
}
```

ローカル開発 (`pnpm dev`) では XFF が無い → key は `anonymous` → memory store ですべてカウントしない動作にする (`MemoryStore` のオプション)。

---

## 2. ドメイン型 / Firestore

### 2.1 型定義

新規ファイル: `src/lib/rate-limit/types.ts`

```ts
/** rate-limit が対象とする論理 route の識別子。Firestore に書き込まれる。 */
export type RateLimitRouteKey =
  | '/api/quicktap/sessions'
  | '/api/quicktap/sessions/[id]/reroll'
  | '/api/recipes/[candidateId]';

/** rate-limit の判定 key。優先順位: auth > guest > ip > anonymous */
export type RateLimitKey =
  | { kind: 'auth'; uid: string }
  | { kind: 'guest'; guestSessionId: string }
  | { kind: 'ip'; ip: string }
  | { kind: 'anonymous' }; // ローカル開発 / 不明な request

export type RateLimitDecision =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };
```

### 2.2 Firestore スキーマ

```
rate_limits/{docId}:
  count: number              # 当該 hour bucket でのリクエスト数
  limit: number              # しきい値スナップショット
  routeKey: string           # RateLimitRouteKey
  bucket: string             # YYYYMMDDHH (UTC)
  keyKind: 'auth'|'guest'|'ip'
  keyValue: string           # uid / sessionId / ip
  createdAt: Timestamp       # 初回 inc 時
  updatedAt: Timestamp       # 最終 inc 時
  expiresAt: Timestamp       # TTL ポリシー対象 (createdAt + 2h)
```

**doc ID 規約**: `${bucket}_${keyKind}_${keyValue}_${routeShortKey}`
- 例: `2026053015_guest_abc123_recipes`
- `/` などを sanitize する: `routeKey` → `routeShortKey` の対応表を `bucket.ts` で持つ:

```ts
const ROUTE_SHORT: Record<RateLimitRouteKey, string> = {
  '/api/quicktap/sessions': 'qt-sessions',
  '/api/quicktap/sessions/[id]/reroll': 'qt-reroll',
  '/api/recipes/[candidateId]': 'recipes',
};
```

### 2.3 Firestore TTL ポリシー

- フィールド: `rate_limits.expiresAt`
- 設定: `gcloud firestore fields ttls update expiresAt --collection-group=rate_limits --enable-ttl`
- TTL 反映遅延: Google ドキュメント上 max 24h、実際は ~数時間で削除される
- (デプロイ後に gcloud で 1 回設定すれば永続。terraform 化は本 Slice ではしない)

### 2.4 Security Rules

`firestore.rules` に追記:

```javascript
// Slice 9: アプリ層レートリミット (Admin SDK のみ R/W)
match /rate_limits/{docId} {
  allow read, write: if false;
}
```

---

## 3. middleware: `withRateLimit`

### 3.1 シグネチャ

新規ファイル: `src/lib/http/with-rate-limit.ts`

```ts
export type WithRateLimitConfig = {
  limit: number;                    // 1 hour あたり最大件数
  routeKey: RateLimitRouteKey;      // route 識別子
  windowSeconds?: number;           // default 3600
  /** test injection */
  store?: RateLimitStore;
  now?: () => Date;
};

export function withRateLimit<T>(
  config: WithRateLimitConfig,
  handler: AuthedHandler<T>,
): AuthedHandler<T>;
```

### 3.2 動作

```ts
return async (request, ctx) => {
  const store = config.store ?? getFirestoreRateLimitStore();
  const now = (config.now ?? (() => new Date()))();
  const key = resolveRateLimitKey(request, ctx.subject);
  const bucket = hourBucket(now);

  const decision = await store.tryConsume({
    bucket, key, routeKey: config.routeKey, limit: config.limit, now,
  });

  if (!decision.allowed) {
    return new Response(JSON.stringify({
      error: {
        code: 'RATE_LIMITED',
        message: 'しばらく時間をおいてから再度お試しください',
        retryAfter: decision.retryAfterSeconds,
      },
    }), {
      status: 429,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'retry-after': String(decision.retryAfterSeconds),
        'x-ratelimit-limit': String(config.limit),
        'x-ratelimit-remaining': '0',
      },
    });
  }

  // Cloud Logging (運用観測用)
  ctx.rateLimitRemaining = decision.remaining;

  return handler(request, ctx);
};
```

### 3.3 `AuthedRequestContext` 拡張

既存 `src/lib/http/with-auth.ts` の型に optional フィールド追加:

```ts
export type AuthedRequestContext = {
  subject: AuthSubject;
  rateLimitRemaining?: number;  // Slice 9 で追加
};
```

handler 側でレスポンスヘッダに `X-RateLimit-Remaining: {n}` を載せたい場合に使う (optional)。

### 3.4 retryAfter の計算

```ts
function secondsUntilNextHour(now: Date): number {
  const next = new Date(now);
  next.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
  return Math.ceil((next.getTime() - now.getTime()) / 1000);
}
```

= 「次の hour bucket まで何秒か」を `Retry-After` として返す。

---

## 4. Firestore Store 実装

新規ファイル: `src/lib/rate-limit/store.ts`

### 4.1 interface

```ts
export type TryConsumeInput = {
  bucket: string;
  key: RateLimitKey;
  routeKey: RateLimitRouteKey;
  limit: number;
  now: Date;
};

export interface RateLimitStore {
  tryConsume(input: TryConsumeInput): Promise<RateLimitDecision>;
}
```

### 4.2 Firestore 実装

```ts
export class FirestoreRateLimitStore implements RateLimitStore {
  constructor(private db: Firestore) {}

  async tryConsume({ bucket, key, routeKey, limit, now }: TryConsumeInput) {
    const docId = buildDocId(bucket, key, routeKey);
    const docRef = this.db.collection('rate_limits').doc(docId);
    const expiresAt = new Date(now.getTime() + 2 * 3600 * 1000);

    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      const currentCount = snap.exists ? (snap.data()?.count as number ?? 0) : 0;

      if (currentCount >= limit) {
        return {
          allowed: false as const,
          retryAfterSeconds: secondsUntilNextHour(now),
        };
      }

      if (snap.exists) {
        tx.update(docRef, { count: currentCount + 1, updatedAt: now });
      } else {
        tx.set(docRef, {
          count: 1, limit, routeKey, bucket,
          keyKind: key.kind, keyValue: keyValueOf(key),
          createdAt: now, updatedAt: now, expiresAt,
        });
      }

      return { allowed: true as const, remaining: limit - (currentCount + 1) };
    });
  }
}
```

### 4.3 Memory 実装 (テスト + ローカル fallback)

```ts
export class MemoryRateLimitStore implements RateLimitStore {
  private counts = new Map<string, number>();

  async tryConsume({ bucket, key, routeKey, limit, now }: TryConsumeInput) {
    const id = buildDocId(bucket, key, routeKey);
    const current = this.counts.get(id) ?? 0;
    if (current >= limit) {
      return { allowed: false, retryAfterSeconds: secondsUntilNextHour(now) };
    }
    this.counts.set(id, current + 1);
    return { allowed: true, remaining: limit - (current + 1) };
  }
}
```

### 4.4 ストア選択ロジック

```ts
let _store: RateLimitStore | null = null;
export function getRateLimitStore(): RateLimitStore {
  if (_store) return _store;
  if (process.env.AGENT_MODE === 'mock' || process.env.NODE_ENV === 'test') {
    _store = new MemoryRateLimitStore();
  } else {
    _store = new FirestoreRateLimitStore(getAdminFirestore());
  }
  return _store;
}
```

- **mock モードや test では Memory** (= Firestore Emulator 不要)
- 本番 (`AGENT_MODE=http`) のみ Firestore

---

## 5. route handler 統合

### 5.1 `/api/recipes/[candidateId]/route.ts`

```ts
// Slice 8 の最後の状態
export const POST = withAuthOptional(async (request, ctx) => { ... });
```

↓

```ts
export const POST = withAuthOptional(
  withRateLimit(
    { limit: 5, routeKey: '/api/recipes/[candidateId]' },
    async (request, ctx) => { ... },
  ),
);
```

### 5.2 `/api/quicktap/sessions/route.ts` / `[id]/reroll/route.ts`

同パターンで `limit: 10`。

### 5.3 limit 定数の集約

`src/lib/rate-limit/limits.ts`:

```ts
import type { RateLimitRouteKey } from './types';

export const RATE_LIMITS: Record<RateLimitRouteKey, number> = {
  '/api/quicktap/sessions': 10,
  '/api/quicktap/sessions/[id]/reroll': 10,
  '/api/recipes/[candidateId]': 5,
};
```

route handler 側は `RATE_LIMITS['/api/recipes/[candidateId]']` で参照。
limit 調整時はこの 1 ファイルだけ書き換えればよい。

---

## 6. クライアント側 429 ハンドリング

### 6.1 共通エラー型

既存の API エラー形 (`{ error: { code, message } }`) は維持。
429 は `code === 'RATE_LIMITED'` で見分ける。

### 6.2 ストリーム系 hook の改修

対象: `src/hooks/use-quicktap-stream.ts` / `use-recipe-detail-stream.ts`

NDJSON ストリームを開始する `fetch` 直後で:

```ts
const res = await fetch(url, { method: 'POST', body, signal });

if (res.status === 429) {
  const retryAfter = Number(res.headers.get('retry-after') ?? '60');
  const minutes = Math.max(1, Math.ceil(retryAfter / 60));
  toast.push({
    kind: 'warning',
    message: `混雑しています。あと約 ${minutes} 分後にお試しください。`,
  });
  dispatch({ type: 'error', error: 'RATE_LIMITED' });
  return;
}

// 既存処理: !res.ok の判定はその後
```

### 6.3 reroll ハンドリング

reroll は専用 hook が無く CandidatesClient 内 fetch のはず。同パターンで 429 を catch。

### 6.4 Toast 文言

| 状況 | 文言 |
| --- | --- |
| 詳細生成 429 | 「混雑しています。あと約 X 分後にお試しください。」(warning) |
| 候補生成 429 | 同上 |
| reroll 429 | 「振り直しは 1 時間に 10 回までです。あと約 X 分後にお試しください。」 |

文言は `src/lib/rate-limit/toast.ts` にまとめて hook から参照。

---

## 7. 観測性 (Cloud Logging)

### 7.1 ログ出力

`withRateLimit` で:

- allowed 時: 既存と同様 (per-request log)
- 429 時: 1 行追加

```ts
// 429 時
log({
  severity: 'WARNING',
  message: 'rate_limited',
  context: {
    routeKey: config.routeKey,
    keyKind: key.kind,
    bucket,
    limit: config.limit,
    retryAfterSeconds: decision.retryAfterSeconds,
  },
});
```

これで Cloud Logging で `severity=WARNING AND jsonPayload.message=rate_limited` を絞れば 429 件数が時系列で見える。

### 7.2 Cloud Monitoring (任意・別 Slice)

将来 custom metric として `rate_limit/429_count` を Push する。今 Slice では log-based metric で代替可能なのでスコープ外。

---

## 8. テスト方針

### 8.1 ユニットテスト (Vitest)

| ファイル | カバー範囲 |
| --- | --- |
| `src/lib/rate-limit/store.test.ts` | `MemoryRateLimitStore`: 連続 inc / limit 超過 / 別 bucket / 別 key / 別 route |
| `src/lib/rate-limit/key.test.ts` | 優先順位 (auth > guest > ip > anonymous) / XFF パース |
| `src/lib/rate-limit/bucket.test.ts` | `hourBucket(now)` の境界跨ぎ / UTC 計算 / `secondsUntilNextHour` |
| `src/lib/http/with-rate-limit.test.ts` | 429 レスポンス形 / Retry-After / ヘッダ / 既存ハンドラへの非干渉 |

### 8.2 route handler 統合テスト

既存の `app/api/*/route.test.ts` に「rate-limit が効いている」テストを 1 件ずつ追加:

- `POST /api/recipes/[id]` を 5 回 → 6 回目は 429
- `Retry-After` ヘッダがある
- Memory store を inject

### 8.3 hook 側テスト

既存 `use-recipe-detail-stream.test.tsx` / `use-quicktap-stream.test.tsx` に
「fetch が 429 を返すとき Toast が出て stream は error 状態になる」を追加。

### 8.4 E2E

journey は 1 セッションあたり 1〜2 件の限度内に収まるため、現状の `journey.spec.ts` には影響なし。新規 E2E は追加しない (limit 超過まで叩くのは production-build E2E では現実的でない)。

---

## 9. ロールアウト・互換性

- **既存ユーザ影響**: limit は通常使用の N 倍に設定 → 影響なし
- **API 互換性**: 200/4xx は維持。429 が**新規追加**されるだけ。既存クライアントは 429 を「不明エラー」として落とすが Toast を出して終わる
- **Firestore**: 新規 collection なので既存に影響なし
- **デプロイ手順**:
  1. main へ push (PR は分けずに 1 Slice = 数コミット)
  2. デプロイ完了後、`gcloud firestore fields ttls update expiresAt --collection-group=rate_limits --enable-ttl` を 1 度実行 (CLI からの手動オペ)
  3. 数時間後に Firestore コンソールで TTL 動作を確認

---

## 10. 影響を受けるファイル一覧

### 新規

- `src/lib/rate-limit/types.ts`
- `src/lib/rate-limit/key.ts` + `.test.ts`
- `src/lib/rate-limit/bucket.ts` + `.test.ts`
- `src/lib/rate-limit/store.ts` + `.test.ts` (Memory のみカバー / Firestore はモック)
- `src/lib/rate-limit/limits.ts`
- `src/lib/rate-limit/toast.ts` (Toast 文言ヘルパ)
- `src/lib/http/with-rate-limit.ts` + `.test.ts`

### 改修

- `src/lib/http/with-auth.ts` — `AuthedRequestContext` に `rateLimitRemaining?: number` を追加
- `app/api/recipes/[candidateId]/route.ts` — `withRateLimit` 適用
- `app/api/quicktap/sessions/route.ts` — `withRateLimit` 適用
- `app/api/quicktap/sessions/[id]/reroll/route.ts` — `withRateLimit` 適用 (パス要確認)
- `app/api/recipes/[candidateId]/route.test.ts` — 429 ケース追加
- `app/api/quicktap/sessions/route.test.ts` — 429 ケース追加
- `src/hooks/use-quicktap-stream.ts` — 429 catch + Toast
- `src/hooks/use-quicktap-stream.test.tsx` — テスト追加
- `src/hooks/use-recipe-detail-stream.ts` — 429 catch + Toast
- `src/hooks/use-recipe-detail-stream.test.tsx` — テスト追加
- `firestore.rules` — `rate_limits` を Admin SDK のみに
- `docs/product-requirements.md` — §5.5 後に「§5.6 レートリミット」追加 / 改訂履歴
- `docs/glossary.md` — 「レートリミット」「hour bucket」用語追加

### 後続オペ (コード外)

- `gcloud firestore fields ttls update expiresAt --collection-group=rate_limits --enable-ttl` を本番 1 回

---

## 11. オープン論点

- **(O-1) 各 hook の fetch を共通ラップするか?**
  3 hook で 429 ハンドリングがコピーになるので、`fetchOrThrowOnRateLimit(url, init, toast)` のような小さなラッパを作るのも選択肢。
  → **MVP では各 hook に直接実装**して、共通化は重複が辛くなってからで OK
- **(O-2) hour bucket vs sliding window**
  hour bucket は実装シンプルだが境界跨ぎで実質 2x 許可される。MVP は hour bucket で進め、計測で問題があれば sliding window に切替
- **(O-3) Firestore TTL の操作を IaC 化するか?**
  Terraform で `google_firestore_field` リソースが使える。MVP は gcloud で 1 回叩く形にして、定着したら Slice 10+ で IaC 化
- **(O-4) `anonymous` key の扱い**
  ローカル dev で XFF 無し + auth 無し + guest 無しは `anonymous` になる。Memory store ではカウントするが、anonymous は全リクエストで同 key となるため limit にすぐ当たる。
  → Memory store の `anonymous` key だけはカウントしない (= 常に allowed) という選択もアリ。MVP では「dev では `AGENT_MODE=mock` なので middleware を skip するか、limit を 100 など緩めて影響を消す」方針

---

## 12. 改訂履歴

| 日付 | 版 | 変更 |
| --- | --- | --- |
| 2026-05-30 | 1.0 | requirements.md v1.0 を基に初版 |
