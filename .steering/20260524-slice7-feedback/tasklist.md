# Slice 7 タスクリスト — フィードバック + 振り返り帳 + Header + ブランド

> [`requirements.md`](requirements.md) / [`design.md`](design.md) を実装するタスク分解。
> **1 task = 1 commit** (Conventional Commits)、Phase 末で push、CI green を確認。

## 進捗ルール

- `[ ]` 未着手 / `[~]` 進行中 / `[x]` 完了
- Conventional Commits + `Co-Authored-By: Claude` フッタ
- 各 Phase 末で push → CI green → 次 Phase

## サマリ (合計 23 タスク / 7 Phase)

| Phase | 主題 | タスク数 |
|---|---|---|
| 1 | ブランド資産 (FurusatoMark / Wordmark / favicon / metadata) | 3 |
| 2 | 統一 Header (HeaderRow + Dropdown + AvatarButton 改修) | 3 |
| 3 | Feedback 基盤 (domain / firestore.ts / rules / hooks) | 4 |
| 4 | Feedback UI (StarInput 等 / /feedback page / Detail CTA) | 4 |
| 5 | Journal (Card / hook / page) | 3 |
| 6 | Library + TOP refresh + 全画面 Header 適用 | 3 |
| 7 | 動作確認 + README + v0.7.0 タグ | 3 |

---

## Phase 1 — ブランド資産

### T-701 FurusatoMark + Wordmark + PIZZA_PAL を TSX 化

- [ ] `src/components/brand/FurusatoMark.tsx`:
  - `design/pizza-tokens.jsx` の `MarkA` / `MarkB` / `MarkC` / `MarkD` / `FurusatoMark` をそのまま移植
  - SVG をインライン、`PIZZA_PAL` も同ファイルに
  - `variant` プロパティ + auto-fallback (size ≤ 18 → 'A')
- [ ] `src/components/brand/Wordmark.tsx`:
  - `Wordmark({ kind: 'horizontal' | 'stacked' | 'vertical', dark?, size? })`
  - vertical は writing-mode: vertical-rl
- [ ] Vitest snapshot test 1 件ずつ (size 16/64/156、dark トグル)
- **DoC**: typecheck + test pass、storybook 化はしない (ファイルが見れるだけで OK)
- **commit**: `feat(slice7): add FurusatoMark + Wordmark brand components`

### T-702 favicon / apple-touch-icon を public/ に置く

- [ ] `public/favicon.ico` を生成 (MarkA を 16/32 multi-size ICO に)
  - 一発生成方法を `infra/README.md` に追記してもよい
  - 手動で 1 度生成して commit する方針 (build 時 generation はしない)
- [ ] `public/apple-touch-icon.png` (180x180、MarkB)
- [ ] `public/icon.svg` (browser auto-favicon 用、MarkA を SVG で直接配置)
- **DoC**: Cloud Run deploy 後にブラウザタブにふるさとピザ帳印が出ること (Slice 7 末で確認)
- **commit**: `feat(slice7): add favicon + apple-touch-icon (FurusatoMark)`

### T-703 layout.tsx の metadata 更新 + .env.production の APP_NAME

- [ ] `app/layout.tsx` の `metadata.title` を "ふるさとピザ帳" に
- [ ] `description` も更新 (「地元の食材と季節から、AI があなただけのピザを 3 案提案。」)
- [ ] `.env.production` の `NEXT_PUBLIC_APP_NAME` を "ふるさとピザ帳" に
- [ ] `.env.example` も合わせて更新
- **DoC**: typecheck pass、build 後に `<title>` がふるさとピザ帳
- **commit**: `feat(slice7): update metadata + APP_NAME to ふるさとピザ帳`

→ **push & CI green 確認**

---

## Phase 2 — 統一 Header (HeaderRow + Dropdown)

### T-704 HeaderRow コンポーネント

- [ ] `src/components/shell/HeaderRow.tsx` + `.module.css`:
  - props: `title` / `brand?` / `onBack?` / `rightSlot?` / `dark?`
  - 構成: 48px / kinari bg / borderRadius 12 / 左 BackChip 36px / 中央 brand + title / 右 slot
  - `onBack` 未指定なら `router.back()`
- [ ] テスト: render snapshot + click back ハンドラ + dark トグル
- **DoC**: typecheck + test pass
- **commit**: `feat(slice7): add unified HeaderRow shell component`

### T-705 HeaderDropdown + useHeaderDropdown

- [ ] `src/hooks/use-header-dropdown.ts`:
  - open/close 状態 + toggle/close API
  - outside pointerdown / Esc / focus loss で close
  - triggerProps (ref, aria-expanded, aria-haspopup) + menuProps (ref, role, onKeyDown)
  - ↑↓ で循環 (`role="menuitem"` を querySelector)、Enter で確定
- [ ] `src/components/shell/HeaderDropdown.tsx` + `.module.css`:
  - props: `user` / `currentRoute` / `onClose`
  - 構造: ユーザ行 → ピザ帳 → 振り返り帳 → divider → サインアウト
  - 現在ルートに朱の縦バー + 薄塗り (左端 2px)
- [ ] テスト: open 後の ↑↓ Enter, Esc/outside で close
- **DoC**: テスト pass、キーボード操作可能
- **commit**: `feat(slice7): add HeaderDropdown + use-header-dropdown hook`

### T-706 AvatarButton を Dropdown トリガに改修

- [ ] `src/components/auth/AvatarButton.tsx`:
  - 既存「クリックで /library 直行」を「クリックで Dropdown 開閉」に
  - 内部に HeaderDropdown を render (open 時のみ)
  - sign-out アクションは useAuth().signOut() を呼ぶ
- [ ] 既存 AvatarButton.test.tsx を更新
  - 「クリック → /library 遷移」テストを「クリック → Dropdown 開」に書き換え
  - Dropdown 内アイテムクリックの routing 検証追加
- **DoC**: 全 AvatarButton 配置箇所 (TOP / DetailClient / LibraryClient / 等) で振る舞い更新済
- **commit**: `feat(slice7): convert AvatarButton to dropdown trigger`

→ **push & CI green 確認**

---

## Phase 3 — Feedback 基盤 (domain / firestore / rules / hooks)

### T-707 src/domain/feedback.ts

- [ ] 型定義: `Feedback` / `FeedbackDraft`
- [ ] 定数: `FEEDBACK_CHIP_OPTIONS` / `FEEDBACK_CHIP_CAP` (6) / `FEEDBACK_GUEST_COUNT_MIN/MAX` / `FEEDBACK_AXIS_LABELS`
- [ ] helpers: `emptyFeedback()` / `isFeedbackComplete()` / `clampRating()` (0..5)
- [ ] テスト: clampRating の境界 + emptyFeedback shape + isFeedbackComplete 各種
- [ ] `src/domain/saved-recipe.ts` に `feedback?: Feedback` 追加 + `hasFeedback()` helper
- **DoC**: typecheck pass、新 test 8+ 件
- **commit**: `feat(slice7): add Feedback domain type + chip options`

### T-708 src/lib/firebase/feedback.ts + saved-recipe.ts 拡張

- [ ] `saveFeedback(db, uid, candidateId, payload)`:
  - savedRecipes/{id}.feedback に merge save (cookedAt は初回のみ serverTimestamp、updatedAt は毎回)
  - 同時に drafts/{id} を deleteDoc (失敗は ignore)
- [ ] `saveDraft(db, uid, candidateId, partial)` + `deleteDraft(...)` + `subscribeDraft(...)`
- [ ] `subscribeSavedFeedback(...)` (savedRecipes/{id}.feedback を購読)
- [ ] `saved-recipe.ts.normalizeSavedRecipe` に feedback フィールドのデシリアライズ追加
  - overallRating / axes を 0..5 に clamp
  - cookedAt / updatedAt を Date に正規化
  - チップ配列を FEEDBACK_CHIP_OPTIONS でフィルタ
- [ ] ユニットテスト: saveFeedback / saveDraft / clamp / normalize
- **DoC**: 全テスト pass
- **commit**: `feat(slice7): firestore feedback layer (save / draft / subscribe)`

### T-709 firestore.rules に drafts subcollection + rules test

- [ ] `firestore.rules`:
  ```
  match /users/{uid}/drafts/{candidateId} {
    allow read, write: if request.auth != null && request.auth.uid == uid;
  }
  ```
- [ ] `tests/firestore-rules.test.ts` 等で 3 ケース追加: 本人 R/W OK、他人 deny、未認証 deny
- [ ] pnpm test:rules pass
- **DoC**: rules test green、本番デプロイ準備 (firebase deploy --only firestore:rules は Phase 7 でまとめて)
- **commit**: `feat(slice7): firestore rules for drafts subcollection + tests`

### T-710 use-feedback + use-feedback-draft hooks

- [ ] `src/hooks/use-feedback.ts`:
  - state ('loading' | 'unauthenticated' | 'idle') + saved + draft + initial (saved > draft > empty)
  - save / discardDraft 関数
  - subscribeSavedFeedback + subscribeDraft で onSnapshot
- [ ] `src/hooks/use-feedback-draft.ts`:
  - 3 秒 debounce で saveDraft (前回値と差分なしならスキップ)
  - localStorage にも mirror (未サインインでもフォーム値復元できるように)
  - lastSavedAt 公開 (UI の「自動保存 N 秒前」用)
- [ ] テスト: fake timers で debounce / 差分なしスキップ / localStorage mirror
- **DoC**: テスト pass、useFeedback / useFeedbackDraft 単体テスト各 5+ 件
- **commit**: `feat(slice7): add useFeedback + useFeedbackDraft hooks`

→ **push & CI green 確認**

---

## Phase 4 — Feedback UI

### T-711 入力プリミティブ × 5

- [ ] `src/components/feedback/StarInput.tsx` + test:
  - 1〜5 (0 クリア対応) / role=radiogroup / aria-checked / キーボード (1-5 / ←→ / 0)
- [ ] `src/components/feedback/DotsInput.tsx` + test:
  - 0〜5 / role=slider / aria-valuenow / キーボード (←→ / Home / End) / 同位置タップで戻る
- [ ] `src/components/feedback/ChipGroup.tsx` + test:
  - multi-select / 上限 6 (cap 到達で aria-disabled + onCapHit コールバック) / wrap layout
  - 選択数バッジ (0 のとき非表示)
- [ ] `src/components/feedback/GuestCountInput.tsx` + test:
  - −/+ ボタン / 1〜20 / 既定 `—`
- [ ] `src/components/feedback/CameraPlaceholder.tsx` + test:
  - クリックで info Toast (toast.push を mock で検証)
- **DoC**: 5 コンポーネント全テスト pass
- **commit**: `feat(slice7): feedback input primitives (StarInput / DotsInput / ChipGroup / GuestCount / CameraPlaceholder)`

### T-712 /feedback/[candidateId] ページ + FeedbackClient

- [ ] `app/feedback/[candidateId]/page.tsx`:
  - `export default async function Page({ params })` → 認証チェック → FeedbackClient に candidateId
- [ ] `app/feedback/[candidateId]/_components/FeedbackClient.tsx`:
  - useAuth + useFeedback + useFeedbackDraft
  - 未認証 → SignInModal 起動 + /library redirect
  - SavedRecipe 存在しない → /library redirect + warning toast
  - フォーム値変更 → onChange → useState + useFeedbackDraft
  - CTA 押下 → save() → toast "ピザ帳に記録しました" → router.push('/journal')
  - overallRating === 0 で CTA disabled + ヒント
  - 「自動保存 N 秒前」表示
- [ ] レンダリングテスト (RTL): 空 / 編集再開 / save 動作
- **DoC**: テスト 4+ 件 pass、URL 直アクセス時の挙動 OK
- **commit**: `feat(slice7): add /feedback/[id] page + FeedbackClient`

### T-713 DetailClient に DetailMakeCTA + HeaderRow

- [ ] `src/components/recipe/DetailMakeCTA.tsx` (案 A インラインカード):
  - props: `state: 'ready' | 'guest' | 'unsaved'` / `onMakeClick` / `onHeartClick` / `heartFilled`
  - design/slice7-screens.jsx の DetailCTA_A (L851) を CSS Modules に書き起こし
- [ ] `app/recipes/[candidateId]/_components/DetailClient.tsx`:
  - topRow (現状 AvatarButton 単体) を `<HeaderRow title="詳細レシピ" rightSlot={<AvatarButton/>}/>` に
  - RecipeHero 直下に DetailMakeCTA を追加
  - state 判定: useAuth().status + saved.state で 3 値 ('guest' / 'unsaved' / 'ready')
  - onMakeClick → router.push('/feedback/[id]') (ready のみ) / SignInModal (guest) / 何もしない (unsaved)
- [ ] E2E (smoke): /recipes/[id] → 作ってみる → /feedback → 記録 → /journal で表示
  - 既存 e2e auth.spec はスキップのまま、これも skipable で OK (本物 Auth が必要なので)
- **DoC**: typecheck + test pass、画面遷移ロジック確認
- **commit**: `feat(slice7): add DetailMakeCTA + integrate HeaderRow on recipe detail`

### T-714 (オプション) E2E スモークの追加

- [ ] `tests/e2e/feedback.spec.ts` を skip マークで足す (本物 Auth 必要なので Playwright で popup ハンドリング難)
- [ ] 中身は将来用 TODO コメント
- **DoC**: e2e 全体は引き続き green
- **commit**: `chore(slice7): add skipped e2e for feedback flow (placeholder)`

→ **push & CI green 確認**

---

## Phase 5 — Journal

### T-715 JournalCard / JournalEmpty / StatTile / StarRow

- [ ] `src/components/journal/StarRow.tsx`: 表示専用 ★ (黄柏色 + 値 mono)
- [ ] `src/components/journal/StatTile.tsx`: label / value / sub / accent ストライプ
- [ ] `src/components/journal/JournalCard.tsx`: hero pizza + seal + title + StarRow + axes mini + worked tags
- [ ] `src/components/journal/JournalEmpty.tsx`: 円形プレースホルダ + hint card
- [ ] 各コンポーネントの snapshot test
- **DoC**: typecheck + test pass
- **commit**: `feat(slice7): add Journal UI components (Card / Empty / StatTile / StarRow)`

### T-716 useSavedRecipesJournal hook

- [ ] `src/hooks/use-saved-recipes-journal.ts`:
  - 既存 subscribeSavedRecipes をラップ
  - feedback あり (`hasFeedback()`) の items のみ抽出
  - cookedAt (= feedback.updatedAt) 降順で再ソート
- [ ] テスト: 全 0 件 / 半数 feedback あり / sort 順
- **DoC**: テスト 5+ 件 pass
- **commit**: `feat(slice7): add useSavedRecipesJournal hook`

### T-717 /journal page + JournalClient

- [ ] `app/journal/page.tsx` (server component, JournalClient を返す)
- [ ] `app/journal/_components/JournalClient.tsx`:
  - HeaderRow (title="振り返り帳", brand="ふるさとピザ帳") + AvatarButton
  - hero eyebrow + title「焼き上がった、あなたの記憶。」
  - Stat 3 タイル (作った数 / 平均★ / 効いた点トップ)
  - CrossLink (→ 保存帳)
  - filter chips (すべて / ★4+ / 王道 / 一歩外す / 大冒険)
  - JournalCard リスト
  - 0 件 → JournalEmpty
  - サインアウト時の表示
- [ ] レンダリングテスト
- **DoC**: 5+ 件テスト pass
- **commit**: `feat(slice7): add /journal page + JournalClient`

→ **push & CI green 確認**

---

## Phase 6 — Library + TOP + 全画面 Header 適用

### T-718 LibraryClient 改修 + CrossLink + 「作った」サブバッジ

- [ ] `src/components/shared/CrossLink.tsx` + module.css:
  - props: `to` / `label` / `jp` (1 文字、ピル中の印) / `en` / `count` / `accent`
  - design/slice7-screens.jsx CrossLink (L247) を移植
- [ ] `app/library/_components/LibraryClient.tsx`:
  - ProfileStrip を削除
  - HeaderRow (title="保存帳", brand="ふるさとピザ帳") + AvatarButton 配置
  - hero eyebrow「SAVED · 保存したアイデア」+ headline「これから作る、あなたの一枚たち。」
  - 「保存中 N 件 · うち作った M 件」 (M = hasFeedback の数)
  - CrossLink (→ 振り返り帳、accent=matcha) を hero 下に
  - LibraryCard 内に「作った」サブバッジ (hasFeedback の場合のみ、matcha 色)
- [ ] テスト: hasFeedback 0/部分/全件 で表示パターン
- **DoC**: 既存 LibraryClient テスト + 追加分 pass
- **commit**: `feat(slice7): refresh LibraryClient with HeaderRow + CrossLink + cooked badge`

### T-719 TopClient refresh

- [ ] `app/_components/TopClient.tsx`:
  - 既存 3 strategy seal 装飾を削除
  - 中央上部に `<FurusatoMark variant="B" size={104}/>`
  - ブランドキャプション「ふるさとピザ帳 / FURUSATO PIZZA-CHŌ」(明朝 + mono)
  - タグライン「未来の一枚は、あなたの地元にある。」を fontSize 32 に
  - 既存 CTA と redirect ロジックは維持
- [ ] テスト: 既存 TopClient テスト + FurusatoMark 出現
- **DoC**: typecheck + テスト pass
- **commit**: `feat(slice7): refresh TopClient with brand mark + caption`

### T-720 全画面に HeaderRow 適用

- [ ] `/local` の page か client component に HeaderRow (title="地元を選ぶ")
- [ ] `/ingredients` 同上 (title="食材を選ぶ")
- [ ] `/candidates/[sessionId]` 同上 (title="候補3案")
- [ ] 各画面の既存 back ボタン / topRow / AvatarButton 単体配置 を HeaderRow に置換
- [ ] /recipes は T-713 で済 / /library は T-718 で済 / /journal は T-717 で済 / /feedback は T-712 で済
- **DoC**: 全画面で HeaderRow が出る、既存の back ボタンとの重複なし
- **commit**: `feat(slice7): apply HeaderRow to /local /ingredients /candidates`

→ **push & CI green 確認**

---

## Phase 7 — 動作確認 + ラップアップ

### T-721 firebase deploy --only firestore:rules + 本番動作確認

- [ ] **(ユーザ作業)** `firebase deploy --only firestore:rules,storage --project=makelocalpizzarecipeagent`
  (drafts ルールを本番に反映)
- [ ] 本番 URL https://mlpr-web-343527548585.asia-northeast1.run.app で:
  - TOP に FurusatoMark + 「ふるさとピザ帳」表記
  - HeaderRow + Dropdown 全画面で動作
  - /recipes/[id] で「作ってみる」CTA 出現
  - /feedback で ★ + ドット + チップ入力、自動保存される
  - submit 後 /journal に着地、JournalCard が出る
  - /library の cooked badge が出る
- [ ] favicon タブで「ふ」が出る
- **DoC**: 全機能本番で動作確認済
- **commit**: 該当なし (rules deploy は手動)

### T-722 README + docs/architecture 更新

- [ ] README.md:
  - 「機能 (Slice 7 時点)」に作ってみたフィードバック + 振り返り帳 + 統一 Header + ブランドマーク追加
  - 公開 URL のアプリ名を「ふるさとピザ帳」表記に
- [ ] docs/architecture.md 改訂履歴 1.2 追記 (Slice 7 完了)
- [ ] docs/functional-design.md 改訂履歴 1.2 追記
- **DoC**: docs git diff clean
- **commit**: `docs(slice7): update README + architecture + functional-design for v0.7.0`

### T-723 version bump + v0.7.0 タグ

- [ ] `package.json` 0.6.0 → 0.7.0
- [ ] `agent/pyproject.toml` も合わせて 0.7.0 (実体変化なくても version sync)
- [ ] `.env.production` / `.env.example` の `NEXT_PUBLIC_APP_VERSION` を 0.7.0
- [ ] `agent/uv.lock` の makelocal-agent version も 0.7.0 (`uv lock` で生成)
- [ ] CI 全 green
- [ ] `git tag -a v0.7.0 -m "Slice 7 — feedback flow + journal + unified header + brand mark"` + `git push origin v0.7.0`
- **DoC**: タグ push 済、本番が v0.7.0
- **commit**: `chore(slice7): bump to v0.7.0`

→ **push & v0.7.0 タグ + 動作確認完了**

---

## Slice 7 完了 DoD (Definition of Done)

1. TOP に FurusatoMark + 「ふるさとピザ帳」表記
2. ブラウザタブの favicon が「ふ」印
3. /library / /journal / /recipes / /feedback / /local / /ingredients / /candidates 全てに統一 HeaderRow
4. AvatarButton クリックで Dropdown 展開、ピザ帳 / 振り返り帳 / サインアウトが選べる
5. /recipes/[id] に「作ってみる」CTA、状態別 (guest / unsaved / ready) で表示変化
6. /feedback/[id] で ★ (0〜5) / 観点別ドット x4 / チップ多選択 x3 / ゲスト数 を入力可能
7. /feedback で 3 秒 debounce auto-save (drafts/{id} + localStorage)
8. submit で savedRecipes/{id}.feedback に merge、draft 破棄、/journal にリダイレクト
9. /journal でフィードバック付きレシピが ★ 評価カードで表示、cookedAt 降順
10. /library に「作った」サブバッジ + 「振り返り帳へ」CrossLink
11. firestore.rules の drafts subcollection が本番に deploy 済
12. CI 全 green (Node / Python / Rules / E2E / Terraform)
13. v0.7.0 タグ push 済、main push の GitHub Actions deploy 成功

---

## 実 GCP 作業のチェックポイント (ユーザ依頼)

| Phase | ユーザ作業 |
|---|---|
| 1 | favicon 画像生成の最終確認 (実装側で生成スクリプト用意するが、目視 OK 必要) |
| 7 | `firebase deploy --only firestore:rules` 実行、本番 URL でフルジャーニー検証 |

---

## 改訂履歴

| 日付 | 版 | 変更 |
|---|---|---|
| 2026-05-24 | 1.0 | 初版作成 (Claude Design 受領後、23 タスク / 7 Phase) |
