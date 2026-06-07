# Slice 10 — 共有リンク (Share Link) design

> requirements.md と対の設計書。Firestore スキーマ・API 契約・Server Component の責務分割
> を確定する。visual design は Claude Design 出力に応じて DetailMakeCTA 隣接 UI と
> `/share/[shareId]` のレイアウトを後追い調整する想定。

---

## 1. 全体アーキテクチャ

```
┌─ 詳細画面 (/recipes/[candidateId]) ─────────────────────────┐
│  生成完了                                                    │
│   └─ X で共有 (CTA)                                          │
│        └─ 確認モーダル                                       │
│             └─ POST /api/share (apiFetch)                    │
│                  ├─ withAuthOptional → uid または guest      │
│                  ├─ withRateLimit (share キー / 5回/h)       │
│                  └─ Admin SDK → shared_recipes/{shareId}     │
│        └─ 戻り URL を X Web Intent (新タブ) に挿す           │
└──────────────────────────────────────────────────────────────┘

┌─ 公開閲覧 (/share/[shareId]) — Server Component ─────────────┐
│  Admin SDK → shared_recipes/{shareId} を fetch               │
│   ├─ なければ notFound()                                     │
│   └─ generateMetadata で OGP + Twitter Card                  │
└──────────────────────────────────────────────────────────────┘

Firestore:
   shared_recipes/{shareId}   ← API 経由 Admin SDK のみ書き込み、public read
   share_index/{ownerKey}_{candidateId}  ← べき等性のためのインデックス
```

---

## 2. データモデル

### 2.1 `shared_recipes/{shareId}`

公開閲覧用のスナップショット。書き込みは Admin SDK のみ、read は public。

```ts
type SharedRecipe = {
  shareId: string;                 // UUID v4
  // 所有者 (取消機能は今スコープ外だが、将来追加時に必要なので最初から持つ)
  ownerUid?: string;               // 認証ユーザの場合
  ownerGuestSessionId?: string;    // ゲストの場合
  // 公開用 snapshot
  candidateId: string;
  title: string;
  concept: string;
  story: { headline: string; body: string };
  meta: { servings: string; difficulty: string; time: string };
  materials: Array<{ name: string; amount: string }>;
  steps: string[];
  imageUrl: string;                // GCS の公開 URL
  prefecture: string;
  strategy: 'exploit' | 'tune' | 'explore';
  sharedAt: Timestamp;             // serverTimestamp
};
```

### 2.2 `share_index/{indexKey}` — べき等性インデックス

`indexKey = "{ownerScope}:{ownerId}:{candidateId}"`

- ownerScope = `'auth'` または `'guest'`
- ownerId = uid または guestSessionId

Doc 内容:
```ts
{ shareId: string }
```

API が「同じ owner + candidateId で既に発行済の `shareId` があるか」を 1 read で判定するための
インデックス。candidateId 由来の hash でも良いが、明示的に doc を作る方が運用しやすい。

### 2.3 Firestore Security Rules 追加

```
match /shared_recipes/{shareId} {
  allow read: if true;
  allow write: if false;  // Admin SDK 経由のみ
}
match /share_index/{indexKey} {
  allow read, write: if false;  // 完全に internal
}
```

`firestore.rules` に追記し、Issue #15 (CI 自動化) と並行進行中なので
**今回は手動 `firebase deploy --only firestore:rules --project=makelocalpizzarecipeagent`** で適用する。

---

## 3. API 契約

### 3.1 `POST /api/share`

#### Request

```http
POST /api/share
Content-Type: application/json
x-mlpr-guest-session-id: guest_<uuid>           // ゲスト時必須
Authorization: Bearer <ID Token>                // 認証時は付与 (任意)

{
  "candidateId": "c_2_e6f631",
  "title": "...",
  "concept": "...",
  "story": { "headline": "...", "body": "..." },
  "meta": { "servings": "...", "difficulty": "...", "time": "..." },
  "materials": [ ... ],
  "steps": [ ... ],
  "imageUrl": "https://storage.googleapis.com/.../recipes/c_2_e6f631.png",
  "prefecture": "宮城県",
  "strategy": "exploit",
  "localeId": "miyagi"
}
```

#### Response

```http
200 OK
{ "shareId": "a4b8...", "url": "https://furusato-pizza.jp/share/a4b8..." }

400 Bad Request           # body 検証 NG
401 Unauthorized          # uid も guestSessionId も無い (= 想定外、`withAuthOptional` 通過しない)
429 Too Many Requests     # rate limit (Retry-After ヘッダ付き)
500                       # Firestore 書込み失敗
```

#### 実装フロー

```
1. withAuthOptional → { uid? , guestSessionId? } を確定
   - 両方無ければ 401 (anonymous は不可、guest session UUID は client が自動発行)
2. withRateLimit (RATE_LIMIT_CONFIG['/api/share']) で 5/h 判定
3. body を Zod スキーマで検証
4. ownerScope + ownerId + candidateId から indexKey を作り、share_index/{indexKey} を get
   - 既存があればその shareId を返す (べき等)
5. なければ:
   - shareId = crypto.randomUUID()
   - Admin SDK で shared_recipes/{shareId} に snapshot + sharedAt を write
   - share_index/{indexKey} に { shareId } を write
6. レスポンスに { shareId, url } を返す
```

### 3.2 認証経路

- 既存 `withAuthOptional` (Slice 9) は uid と guestSessionId のうち片方を確実に返す
- ID Token がついていれば auth ユーザ、無ければ guest として扱う
- 両方無いケースは「guestSessionId が無い未認証クライアント」=
  fetch ヘルパ `apiFetch` を経由していない異常系。401 で弾く

### 3.3 レートリミット

`RATE_LIMIT_CONFIG` に追加:

```ts
'/api/share': {
  limit: 5,
  routeKey: '/api/share',
},
```

ウィンドウは既存と同じ 1 時間。

---

## 4. Server Component `/share/[shareId]`

### 4.1 ルーティングと描画

- `app/share/[shareId]/page.tsx` を Server Component で実装
- `dynamic = 'force-dynamic'` は使わず、デフォルトの **動的レンダリング** に任せる
  (`shareId` は URL の動的セグメント、`params` は build 時不確定 → 自動で動的)
- 認証は要らない (Firebase Auth Web SDK は client component で再判定するため、
  Server で直接 ID Token を見ない)

### 4.2 fetch 経路

```
/share/[shareId] (RSC)
  ↓
fetchSharedRecipe(shareId) — Admin SDK の Firestore client を使う
  ↓
shared_recipes/{shareId} を get
  ↓ 該当なし → import { notFound } from 'next/navigation'; notFound();
```

Admin SDK は Slice 9 で `firebase-admin` 入れているので追加 install 不要。

### 4.3 generateMetadata

```ts
export async function generateMetadata({ params }: { params: { shareId: string } }) {
  const snap = await fetchSharedRecipe(params.shareId);
  if (!snap) return { title: '見つかりませんでした' };

  const ogImage = snap.imageUrl;
  const title = `${snap.title} — ふるさとピザ帳`;
  const description = snap.story.headline || snap.concept.slice(0, 100);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/share/${params.shareId}`,
      images: [{ url: ogImage, width: 1024, height: 1024 }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}
```

### 4.4 描画コンテンツ

- ScreenHero: タイトル + prefecture chip + 戦略 (strategy seal)
- ヒーロー画像 (`imageUrl`、4:3 表示)
- ストーリーカード (headline + body)
- MetaStrip (人数 / 難易度 / 時間)
- 材料リスト
- 手順リスト
- フッタ CTA「ふるさとピザ帳で作る →」(internal Link to `/local`)
- 「ふるさとピザ帳」ヘッダロゴ + 「← TOP に戻る」(internal Link to `/`)

既存 `app/recipes/[candidateId]/_components/DetailClient.tsx` のサブコンポーネント
(`RecipeHero`, `MaterialList`, `StepList`, `StoryCard`) を流用する。

ただし `/share/[shareId]` は Server Component なので、それらが Client Component なら
そのまま import 可。 saved / 認証連動の部分 (ハート / DetailMakeCTA / FurusatoSection 等)
は使わない。

---

## 5. 詳細画面 CTA + 確認モーダル

### 5.1 状態マシン

```
'idle'         — 詳細生成中、CTA disabled
'ready'        — 生成完了、未共有、CTA active
'confirming'   — 確認モーダル表示中
'publishing'   — POST /api/share 中 (CTA + モーダル disabled)
'shared'       — 発行済、CTA は「X で再共有」に
```

### 5.2 配置

`DetailClient.tsx` の DetailMakeCTA カードの **直下** に `ShareCard` (Client Component) を
追加。レイアウトとしては:

```
[ 作ってみる (DetailMakeCTA) ]
[ X で共有 (ShareCard)       ]
```

DetailMakeCTA と視覚的に並列の小さなセカンダリ CTA として扱う。

### 5.3 確認モーダル

`SignInModalProvider` と同じ `ToastProvider` 配下のオーバレイ表示。
内容:

> インターネット上に公開します
> このレシピは X 等の SNS に貼ると誰でも閲覧できる URL になります。
> 一度公開すると、現バージョンでは取り消しできません。
>
> [ キャンセル ]  [ 公開して X で共有 ]

公開後の挙動:
- POST 成功 → shareId 取得 → X Web Intent を `window.open(intentUrl, '_blank', 'noopener,noreferrer')` で開く
- Toast「共有 URL を作成しました」

### 5.4 Web Intent ビルダ

```ts
function buildXIntentUrl(args: {
  title: string;
  storyHeadline: string;
  shareUrl: string;
}): string {
  const lines = [
    `🍕 ${truncate(args.title, 40)}`,
    truncate(args.storyHeadline, 80),
    '#ふるさとピザ帳 #地元ピザ',
  ];
  const text = lines.filter(Boolean).join('\n');
  const params = new URLSearchParams({ text, url: args.shareUrl });
  return `https://x.com/intent/post?${params.toString()}`;
}
```

合計を約 200 字に抑え、URL の t.co 短縮 23 字を加えても 280 字以内に余裕で収まる。
unit test で各 truncate を検証する。

---

## 6. GA4 イベント

`src/lib/analytics/track.ts` の `TrackEventName` を拡張:

```ts
'share_intent'      // CTA タップ (確認モーダル open)
'share_published'   // shareId 発行成功
'share_page_view'   // /share/[shareId] mount (Client wrapper か useEffect)
```

`/share/[shareId]` は Server Component だが、トラッキング用に小さな
`<SharePageAnalytics shareId={...} />` Client Component を差し込んで
`useEffect` で 1 回だけ送信する (equipment と同じパターン)。

---

## 7. 既存資産の流用

| 流用するもの | 出所 |
|---|---|
| `withAuthOptional` | `src/lib/auth/middleware.ts` (Slice 9) |
| `withRateLimit` + `RATE_LIMIT_CONFIG` | `src/lib/rate-limit/limits.ts` |
| `apiFetch` (guest header 自動付与) | `src/lib/http/api-fetch.ts` (Slice 9.1) |
| Admin SDK `getAdminFirestore()` | `src/lib/firebase/admin.ts` (Slice 9) |
| `RecipeHero` / `MaterialList` / `StepList` / `StoryCard` | `src/components/recipe/*` |
| `trackEvent` | `src/lib/analytics/track.ts` |
| `getOrCreateGuestSessionId` | `src/lib/localstorage/guest-session.ts` |

---

## 8. ファイル一覧 (追加)

```
.steering/20260606-share-link/
  requirements.md (作成済)
  design.md       (本ファイル)
  tasklist.md     (次)

app/
  share/
    [shareId]/
      page.tsx                   ← Server Component + generateMetadata
      _components/
        SharePageView.tsx        ← 描画 (Server)
        SharePageAnalytics.tsx   ← GA4 useEffect (Client)
        SharePageView.module.css
  api/
    share/
      route.ts                   ← POST handler
  recipes/[candidateId]/_components/
    ShareCard.tsx                ← 詳細画面の「X で共有」CTA + モーダル (Client)
    ShareCard.module.css
    ShareConfirmModal.tsx        ← モーダル本体 (Client)

src/
  domain/
    share.ts                     ← SharedRecipe / 入出力スキーマ (Zod) / 定数
  lib/
    firebase/
      shared-recipe.ts           ← Admin SDK の read/write ヘルパ (server only)
    share/
      build-x-intent.ts          ← X Web Intent ビルダ + テスト
      build-x-intent.test.ts
  hooks/
    use-share.ts                 ← 詳細画面側で POST /api/share を叩く Client Hook

firestore.rules                  ← shared_recipes / share_index ルール追加
src/lib/rate-limit/limits.ts     ← '/api/share' エントリ追加
src/lib/rate-limit/types.ts      ← RateLimitRouteKey に '/api/share' 追加
src/lib/analytics/track.ts       ← TrackEventName に 3 イベント追加

app/sitemap.ts                   ← '/share/[shareId]' は動的 + 無限 → sitemap には載せない
app/robots.ts                    ← /share/ は allow (= public 索引 OK)

docs/architecture.md             ← API 一覧追記
docs/functional-design.md        ← Slice 10 章追加
```

---

## 9. リスクと緩和

| リスク | 緩和 |
|---|---|
| クローラの暴走 (1 URL あたり数百 req/sec) | Cloud Run min-instances=0 + Firestore キャッシュ |
| 不適切コンテンツの公開 | LLM 出力なので影響限定的、必要なら Issue ベース通報 |
| X 仕様変更で intent URL が壊れる | builder を関数で分離 + unit test、変更時は 1 箇所 |
| Firestore 書込み失敗で UI が hang | client 側に 10s タイムアウト + 失敗 Toast |
| Imagen 画像 URL の期限切れ (将来署名付き化されたら) | snapshot に既に URL を保存しているので閲覧側は変わらず可、ただし切れたら画像出ない → 受容 |

---

## 10. テスト戦略

| レイヤ | テスト内容 |
|---|---|
| `build-x-intent.test.ts` | 文字数上限・改行・タイトル切り詰め境界・URLEncode |
| `shared-recipe.test.ts` | Admin SDK ヘルパの読み書き (Firestore emulator) |
| `api/share/route.test.ts` | 認証経路 / レート / べき等 / 400 / 200 |
| `firestore.rules.spec.ts` | shared_recipes は public read / client write 不可 |
| Playwright (オプション) | 詳細画面 → モーダル → 確認 → 戻り URL でカードを開ける |

---

## 11. デプロイ手順

1. Slice 10 コード一式を main にマージ → 既存 GitHub Actions で Cloud Run へ自動 deploy
2. **手動** で `firebase deploy --only firestore:rules --project=makelocalpizzarecipeagent`
   (Issue #15 完了前のため手動)
3. 動作確認:
   - 未ログインで /recipes/[id] → CTA → モーダル → 公開 → /share/[id] が見える
   - 認証ログイン後同様に動作
   - X.com で /share/[id] を投稿 → カード展開 (Twitter Card Validator)
4. GA4 リアルタイムで `share_intent` / `share_published` / `share_page_view` が来ている
   ことを確認
