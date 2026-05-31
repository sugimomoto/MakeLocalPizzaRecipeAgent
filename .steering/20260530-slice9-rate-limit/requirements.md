# Slice 9 要求 — アプリ層レートリミット (guestSessionId / IP per-hour)

> 作成日: 2026-05-30
> ステータス: **v1.0** (Issue #2 で設計議論済 / 着手前の確定版)
> 想定リリース: v0.9.0
> 関連 Issue: [#2 feat: アプリ層レートリミット](https://github.com/sugimomoto/MakeLocalPizzaRecipeAgent/issues/2)
> 前提: [Issue #1 (closed)](https://github.com/sugimomoto/MakeLocalPizzaRecipeAgent/issues/1) — Cloud Run / Vertex AI Quota の現状調査結果に基づく

---

## 1. 背景と目的

### 1.1 解決する課題

公開 URL から認証なしで叩ける `/api/recipes/[id]` は 1 リクエストで
**Gemini Flash + Imagen ≒ \$0.04-0.05** のコストがかかる。

Issue #1 の調査で以下が判明した:

- **Cloud Run max-instances は十分絞られている** (web=5 / agent=3)
- **しかし Vertex AI 側は Quota だけでは絞れない**
  - Gemini 2.5 Flash の per-project quota は **存在しない** (Google shared dynamic pool)
  - Imagen 4 は default **20 RPM** = 最悪 \$48/h ペース (月予算 \$30 に対して過剰)

つまり**アプリ層で per-user / per-IP の使用上限**を設けない限り、
ボット 1 台で月予算を一夜にして燃やせる構造になっている。

### 1.2 Slice 9 のスコープ宣言

- ✅ **Firestore ベースの per-hour カウンタ**を実装し、route handler 単位で
  「同じ key からの 1 時間あたりリクエスト数」を上限化する
- ✅ Imagen を伴う `/api/recipes/[id]` は**特に厳しめ** (5/h)
- ✅ Firestore TTL を活用してカウンタは自動的に消滅させる (コレクション肥大回避)
- ✅ 429 Too Many Requests + `Retry-After` ヘッダで標準的に返す
- ✅ フロント側で 429 を catch し、Toast で残り時間を案内
- ❌ reCAPTCHA Enterprise (Phase C / 別 Slice)
- ❌ Cloud Armor / Cloudflare (本格運用時)
- ❌ 認証ユーザの「課金 plan で limit 緩和」 (将来構想)

### 1.3 関連: ハッカソン評価軸

- **「とどける」 (DevOps 実装力)**: 公開 URL を運用する以上、コスト保護は基本動作。
  Cloud Logging に 429 件数が出ることで「コスト爆発をどう守っているか」が
  審査時にデモ可能になる
- **「まわす」**: Cloud Monitoring 経由で 429 メトリクスを観測する余地を残す

---

## 2. ペルソナとユーザストーリー

### US-9-1 (主): 通常ユーザは影響を受けない
> **通常のホストユーザ**として、レシピ生成・詳細表示・振り直しを
> 通常の使用ペース (1 セッションで数件) で行う限り、レートリミットの
> 存在を意識せずに使い続けられる。

→ limits は「個人 1 人の通常使用」を十分カバーする余裕で設定する (詳しくは §3.2)。

### US-9-2 (主): 暴走ユーザだけが抑制される
> **悪意あるボット / 暴走スクリプト**として 1 IP から短時間に大量リクエストを
> 送ると、しきい値を超えたタイミングで 429 が返り、Vertex AI / Imagen への
> 課金リクエストが止まる。

→ 429 が返るまでに支払うコストは「上限の N 倍以下」に収まる。

### US-9-3 (補助): 制限に達したユーザへの誠実な案内
> **誤って高頻度操作してしまったユーザ**として、429 を受け取った時に
> 「しばらく待ってください (あと X 分)」というメッセージで状況が分かり、
> アプリが壊れたわけではないことが伝わる。

→ `Retry-After` ヘッダの値を使ってフロントが Toast を出す。

### スコープ外の US

- 「課金ユーザは limit を 10 倍にしてほしい」(将来 v2)
- 「organization 単位で limit を共有する」(B2B 想定、将来)

---

## 3. 機能要件

### FR-9-1: レートリミット middleware

新規ファイル: `src/lib/http/with-rate-limit.ts`

```ts
withRateLimit({ limit, windowSeconds: 3600 }, handler)
```

- 既存の `withAuthOptional` の **内側**にネスト (= AuthSubject 解決後に key を決定)
- key の優先順位:
  1. `auth:{uid}` (Firebase Auth 認証済の場合)
  2. `guest:{guestSessionId}` (ゲストヘッダあり)
  3. `ip:{X-Forwarded-For 先頭 IP}` (Cloud Run が付与)
- bucket: `YYYYMMDDHH` (UTC、1 時間単位)
- 1 req あたりの処理: Firestore transaction で `count` を +1 し、
  上限超過なら 429 を即座に return (= ハンドラを呼ばない)

### FR-9-2: per-route limits (案)

| route | limit (per hour) | 根拠 |
|---|---|---|
| `POST /api/quicktap/sessions` | **10** | Gemini Flash × 3 案 = 1 req で \$0.003 |
| `POST /api/quicktap/sessions/[id]/reroll` | **10** | 同上 |
| `POST /api/recipes/[candidateId]` | **5** | Gemini Flash + **Imagen 1 枚** = \$0.04 (高) |
| `GET /api/locales`, `/api/locales/[id]/ingredients` | (制限なし) | 静的データ + キャッシュ |
| `GET /api/health` | (制限なし) | 監視用 |

「同 user/IP が 1 時間で 5 件詳細生成 = \$0.20」を上限とし、ユーザ 1,000 人/h 同時に limit いっぱい使っても \$200/h で済む計算。

### FR-9-3: 429 レスポンス形

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "しばらく時間をおいてから再度お試しください",
    "retryAfter": 1800
  }
}
```

ヘッダ:
- `Retry-After: <秒>` (HTTP 標準)
- `Content-Type: application/json`
- `X-RateLimit-Limit: <limit>` (任意・運用補助)
- `X-RateLimit-Remaining: 0`

### FR-9-4: Firestore スキーマ

```
rate_limits/
  {hour_bucket}_{key}/
    count: number              # 当該 hour bucket でのリクエスト数
    limit: number              # しきい値スナップショット (運用補助)
    routeKey: string           # 「どの route の制限か」 (運用補助)
    createdAt: Timestamp
    expiresAt: Timestamp       # TTL ポリシーで自動削除 (createdAt + 2h)
```

- doc ID: `${hourBucket}_${key}` (例: `2026053015_guest:abc123_/api/recipes`)
- TTL: 2 時間 (1 時間枠 + 1 時間バッファ) で Firestore TTL ポリシー設定

### FR-9-5: フロント側 429 ハンドリング

- 共通 fetch wrapper (or 各 hook) で `status === 429` を検知
- `useToast` で warning kind の Toast を表示:
  - 例: 「混雑しています。あと 23 分後にお試しください」
  - `Retry-After` ヘッダの秒を分に変換 (端数切り上げ)
- 影響範囲: `useQuickTapStream` / `useRecipeDetailStream` / `useReroll`
  あたりのストリーム開始時 fetch

### FR-9-6: Firestore Security Rules

```javascript
// rate_limits/{docId}
match /rate_limits/{docId} {
  allow read, write: if false;  // Admin SDK (server) only
}
```

クライアントから直接 R/W されることはない (server-side のみ)。

---

## 4. 非機能要件・制約

### NFR-9-1: パフォーマンス影響

- 1 req あたり **Firestore transaction 1 回** (~30-80ms 追加)
- 既存ストリーミング系 API のレイテンシ目標 (詳細 30 秒以内) に余裕で収まる

### NFR-9-2: Firestore コスト

- 同 user/h あたり 最大 ~30 R/W (limit 上限内)
- 1,000 user/h で 30,000 ops/h × 24h × 30d = ~22M ops/月
  - **Firestore 無料枠 50,000 reads/day を超える可能性大** → 注意点として認識
  - 軽減策: hour-key を `cache-control` し、in-memory LRU で同 process 内の連続 inc を集約 (オプション)
  - MVP では Firestore 直接 R/W、観測 (Cloud Monitoring) でコストを確認

### NFR-9-3: race condition 対応

- `runTransaction` で count を atomic increment
- 競合時はリトライ (Firestore 自動リトライに依存、最大 5 回)

### NFR-9-4: クロックドリフト

- `hour_bucket` の境界跨ぎでカウンタがリセットされる
  → ユーザは「ちょうど境界で 6 件目がブロックされる」「次の bucket では即解除」を体験
- これは仕様として許容 (UI の Toast で「あと X 分」を案内するので困らない)

### NFR-9-5: テスト容易性

- middleware は injectable な `Now()` / `RateLimitStore` を受け取る形にし、
  unit test では in-memory mock を差し替えられるようにする

---

## 5. 受け入れ条件

### AC-9-1: 通常ユーザの体験
- 同一 IP / sessionId から **1 時間 5 件以内**の詳細生成リクエストは
  すべて 200 で通る (5 件目までは limit に当たらない)

### AC-9-2: 暴走ユーザの抑制
- 同一 IP / sessionId から **1 時間に 6 件目以降**の詳細生成は 429 を返す
- 429 のレスポンスボディは `RATE_LIMITED` エラーコード + `Retry-After` ヘッダを持つ

### AC-9-3: hour bucket リセット
- 429 が返った後、次の hour bucket (UTC 切替時) では即座にカウンタがリセットされ、
  同 user/IP から再度 5 件まで許可される

### AC-9-4: route 別 limit
- `/api/quicktap/sessions` は 10/h、`/api/recipes/[id]` は 5/h で
  独立にカウントされる (別 route だから別 doc)

### AC-9-5: key 優先順位
- Auth ヘッダがある場合は `auth:{uid}` でカウント
- 無ければ `guest:{sessionId}` でカウント
- 両方無ければ `ip:{xff}` でカウント

### AC-9-6: フロント側挙動
- 429 を受け取ったとき、警告 Toast が表示される
- Toast には `Retry-After` から計算した「あと X 分」の文言が含まれる
- それ以外のアプリ動作 (現在画面の描画) には影響を与えない

### AC-9-7: テスト
- middleware 単体テスト: limit / reset / 多 route 並行 / key 優先順位
- E2E (smoke): 既存 journey が 429 にぶつからずに通る (limit 設計値が現実的か)
- agent / next.js 全体テスト緑

### AC-9-8: TTL 自動削除
- Firestore TTL ポリシーで `expiresAt` 経過後に doc が削除される
- (実機確認は Firestore コンソールで TTL 動作開始まで最大 24h かかるため、設定確認のみ)

---

## 6. 想定リスクと対策

| # | リスク | 対策 |
|---|---|---|
| R-9-1 | Firestore リード/ライトコストが想定以上 | Cloud Monitoring で観測。問題ならプロセス内 LRU 集約に切替 |
| R-9-2 | hour 境界跨ぎでユーザ体験が悪い (5 件 + すぐ 5 件で実質 10 件) | 仕様として許容。気になれば sliding-window に切替 (将来) |
| R-9-3 | Cloud Run の X-Forwarded-For が信用できない | Cloud Run は GFE 経由なので XFF 先頭は信頼可能。Knative の標準動作に依拠 |
| R-9-4 | ゲストセッションが localStorage クリアで「別人」になる | これは仕様 = 「別人として再カウント」で問題なし (ボット対策は IP 軸で残る) |
| R-9-5 | 同一 NAT 配下の正規ユーザが巻き添えで 429 | guestSessionId / auth uid を先に見るので、cookie/localStorage を持つ通常ユーザは IP 軸で巻き添えにならない。`ip:` フォールバックは「初回・無 cookie・無 auth」のみ |
| R-9-6 | Firestore TTL の遅延で hot collection 化 | TTL ポリシーは Google が 24h 以内に削除を保証。コレクション肥大は 3-4 日で頭打ち |

---

## 7. スコープ外 (将来 Slice)

- reCAPTCHA Enterprise (score-based) でボットを更に弾く (Phase C)
- Cloud Armor / Cloudflare で network 層を保護 (本格運用)
- 認証済ユーザの limit 緩和 (将来課金 plan 想定)
- sliding-window レートリミット (境界跨ぎの厳密制御)
- per-route 動的 limit 調整 (admin UI からチューニング)
- 429 件数の Cloud Monitoring custom metric 化 (今は logging で足りる)

---

## 8. 次のステップ

1. ✅ requirements.md v1.0 確定 (本書、ユーザレビュー待ち)
2. ⏳ `design.md` 作成 — middleware 設計詳細・Firestore 構造・テスト設計
3. ⏳ `tasklist.md` 作成 — フェーズ分解
4. ⏳ 実装 → 検証 → デプロイ
5. ⏳ Issue #2 クローズ + 改訂履歴

---

## 9. 改訂履歴

| 日付 | 版 | 変更 |
| --- | --- | --- |
| 2026-05-30 | 1.0 | Issue #2 の設計議論を確定版に。Issue #1 (Quota 調査結果) と整合 |
