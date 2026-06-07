# Slice 10 — 共有リンク (Share Link) tasklist

> design.md と 1:1 対応。Phase 単位で小さくコミット → push → 1 動作確認、を繰り返す。

---

## Phase 1 — ドメイン + Admin SDK + Firestore Rules

- [ ] T-1001 `src/domain/share.ts` 作成
  - `SharedRecipeSnapshot` 型
  - 入力 Zod スキーマ `ShareRequestSchema`
  - 出力 `{ shareId, url }` の型
  - `buildShareIndexKey(ownerScope, ownerId, candidateId)`
- [ ] T-1002 `src/lib/firebase/shared-recipe.ts` 作成 (Server only)
  - `createSharedRecipe(adminDb, params): Promise<{ shareId, isNew }>`
  - `getSharedRecipe(adminDb, shareId): Promise<SharedRecipeSnapshot | null>`
  - Admin SDK を `firebase/admin.ts` 経由で取得 (lazy)
- [ ] T-1003 `firestore.rules` に `shared_recipes` / `share_index` を追加
- [ ] T-1004 ローカル emulator で rules unit test (vitest.config.rules.ts)
- [ ] T-1005 `pnpm typecheck && pnpm test` パス確認

**DoC**: Admin SDK ヘルパで shared_recipes に doc を書ける + Rules で client write が deny

**コミット**: `feat(slice10): SharedRecipe ドメイン + Admin SDK ヘルパ + Firestore Rules`

---

## Phase 2 — API + クライアントヘルパ + レートリミット

- [ ] T-1006 `src/lib/rate-limit/types.ts` の `RateLimitRouteKey` に `/api/share` を追加
- [ ] T-1007 `src/lib/rate-limit/limits.ts` の `RATE_LIMIT_CONFIG` に `/api/share` (5 / 1h) 追加
- [ ] T-1008 `app/api/share/route.ts` 作成
  - `withAuthOptional(withRateLimit('/api/share', handler))` で包む
  - Zod 検証 → 401 / 400 / 429 / 200 を返す
  - べき等性: share_index/{key} を get → あれば既存 shareId 返却、なければ create + index 書き込み
- [ ] T-1009 `src/hooks/use-share.ts` 作成
  - `apiFetch('/api/share', { method: 'POST', body: JSON.stringify(...) })` の薄ラッパ
  - 429 を Toast (既存 `buildRateLimitToastMessage` 流用)
  - 状態: 'idle' | 'publishing' | 'shared' | 'error'
- [ ] T-1010 `app/api/share/route.test.ts` 作成
  - 401 / 400 / 200 / 429 / べき等 (2 回呼んで同 shareId)
- [ ] T-1011 `pnpm typecheck && pnpm test` パス

**DoC**: dev で `curl POST /api/share` → 200 + shareId、2 回目同じ shareId が返る

**コミット**: `feat(slice10): POST /api/share + use-share hook + rate limit`

---

## Phase 3 — 詳細画面 CTA + 確認モーダル + X Web Intent

- [ ] T-1012 `src/lib/share/build-x-intent.ts` 作成
  - `buildXIntentUrl({ title, storyHeadline, shareUrl })`
  - title 40 字、headline 80 字で切り詰め
- [ ] T-1013 `src/lib/share/build-x-intent.test.ts` 作成
  - 境界文字数 / URLEncode / 改行
- [ ] T-1014 `app/recipes/[candidateId]/_components/ShareConfirmModal.tsx` 作成
  - focus-trap、ESC 閉じ
  - 「インターネット上に公開します」「取り消しできません」を明記
- [ ] T-1015 `app/recipes/[candidateId]/_components/ShareCard.tsx` 作成
  - DetailMakeCTA 直下に挿入
  - state machine ('idle' | 'confirming' | 'publishing' | 'shared')
  - publish 成功 → `window.open(intentUrl, '_blank', 'noopener,noreferrer')`
  - 同 candidateId 再共有時は既存 shareId を使い回し
- [ ] T-1016 `DetailClient.tsx` に `<ShareCard />` を組み込み
- [ ] T-1017 `src/lib/analytics/track.ts` に `share_intent` / `share_published` 追加
- [ ] T-1018 dev サーバで動作確認 (未ログイン / 認証両方)
- [ ] T-1019 `pnpm typecheck && pnpm test && pnpm lint && pnpm format:check`

**DoC**: dev で詳細画面 → 「X で共有」→ モーダル → 確定 → X intent が新タブで開く
(shareUrl 含む) + Toast 表示 + 同一レシピで 2 回目押しても同じ URL になる

**コミット**: `feat(slice10): 詳細画面に「X で共有」CTA + 確認モーダル + Web Intent`

---

## Phase 4 — `/share/[shareId]` 公開ページ + OGP / Twitter Card

- [ ] T-1020 `app/share/[shareId]/page.tsx` 作成 (Server Component)
  - `fetchSharedRecipe(shareId)` で Admin SDK 読み出し
  - なし → `notFound()`
  - `generateMetadata` で OGP + Twitter Card
- [ ] T-1021 `app/share/[shareId]/_components/SharePageView.tsx` 作成
  - 既存 `RecipeHero` / `MaterialList` / `StepList` / `StoryCard` を流用
  - フッタに「ふるさとピザ帳で作る →」 internal Link to `/local`
- [ ] T-1022 `app/share/[shareId]/_components/SharePageAnalytics.tsx` 作成 (Client)
  - useEffect で `trackEvent('share_page_view', { shareId, prefecture, strategy })`
- [ ] T-1023 `share_page_view` を `TrackEventName` に追加
- [ ] T-1024 not-found ハンドリング (`app/share/[shareId]/not-found.tsx` or page 内で notFound())
- [ ] T-1025 dev で `/share/{shareId}` を開いて表示確認 + meta タグを view-source で確認
- [ ] T-1026 `pnpm build` 成功

**DoC**: `/share/[shareId]` 公開 URL が ログイン無しで開ける + view-source で
`og:title` / `og:image` / `twitter:card=summary_large_image` を含む

**コミット**: `feat(slice10): /share/[shareId] 公開ページ + OGP + Twitter Card`

---

## Phase 5 — sitemap / robots / docs / デプロイ

- [ ] T-1027 `app/robots.ts` の allow リストに `/share/` を追加
  (sitemap には載せない: 動的 + 無制限 + 個人のシェアは検索 index 不要)
- [ ] T-1028 `docs/architecture.md` の API 一覧に `/api/share` 追記
- [ ] T-1029 `docs/functional-design.md` に Slice 10 章追加 (シーケンス図 + データモデル)
- [ ] T-1030 main に push (既存 GitHub Actions が Cloud Run へ自動 deploy)
- [ ] T-1031 **手動** で `firebase deploy --only firestore:rules --project=makelocalpizzarecipeagent`
  (Issue #15 完了前のため、本リリースは手動)
- [ ] T-1032 本番動作確認:
  - 未ログインで `/recipes/[id]` → 共有 → `/share/[id]` 開く
  - 認証ログイン後同様
  - X.com で `/share/[id]` を実際に投稿 → カード展開を目視
  - Twitter Card Validator (https://cards-dev.twitter.com/validator) で確認
- [ ] T-1033 GA4 リアルタイムで 3 イベントの到達確認
- [ ] T-1034 Issue #3 に進捗コメント + close

**DoC**: 本番 https://furusato-pizza.jp/share/{shareId} が公開され、
X.com にリンクを貼ると large image card で展開される

**コミット (複数想定)**: `feat(slice10): robots + docs 更新` / `docs(slice10): functional-design 追記`

---

## 進め方の規約 (CLAUDE.md 準拠)

- Phase 末で必ず `pnpm typecheck && pnpm lint && pnpm test && pnpm format:check` を走らせる
- 各 Phase で 1 commit ベース、必要に応じて細分化
- Phase 5 完了で Slice 10 終了
- Phase 末で main に push (`feedback_phase_end_push.md` に従う)
