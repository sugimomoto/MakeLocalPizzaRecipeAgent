# Slice 4 タスクリスト — Firestore + Auth + GCS

> 本書は [`requirements.md`](requirements.md) / [`design.md`](design.md) を実装する
> タスク分解。**1 task = 1 commit** (Conventional Commits)、フェーズ末に push & 動作確認。

---

## 進捗ルール

- ステータス: `[ ]` 未着手 / `[~]` 進行中 / `[x]` 完了
- 完了条件 (DoC): 各タスクに記載。lint / typecheck / test がローカルで pass すること
- フェーズ単位で push → CI green を確認してから次フェーズへ
- 1 タスク = 1 commit を原則とする (関連修正のみ同梱可)
- コミットメッセージは Conventional Commits + `Co-Authored-By: Claude` フッタ

---

## サマリ (合計 27 タスク / 11 フェーズ)

| Phase | 主題 | タスク数 |
| --- | --- | --- |
| Phase 1 | インフラ準備 (Firebase Emulator / Port 移行 / .env) | 3 |
| Phase 2 | Domain 拡張 (image.ready url 化 + SavedRecipe 型) | 2 |
| Phase 3 | Python: StorageClient + image_agent GCS 化 | 3 |
| Phase 4 | Firebase Client + AuthProvider + useAuth | 2 |
| Phase 5 | Toast 基盤 (Provider + ToastHost + Toast) | 2 |
| Phase 6 | SignInModal + GoogleButton + useSignInModal | 2 |
| Phase 7 | AvatarButton + 全画面 topRow 配置 | 2 |
| Phase 8 | useSavedRecipe / useSavedRecipes + DetailClient ハート連動 | 3 |
| Phase 9 | /library + LibraryClient + LibraryCard + ProfileStrip | 3 |
| Phase 10 | TOP ページ (`/`) 実画面化 + Sign-in 導線 | 1 |
| Phase 11 | Security Rules + E2E 延長 + CI + README + v0.4.0 tag | 4 |

---

## Phase 1 — インフラ準備

### T-401 Firebase Emulator 構成ファイル (firebase.json / rules / .firebaserc)

- [ ] `firebase.json`: auth(9099) / firestore(8080) / storage(9199) / ui(4000)
- [ ] `firestore.rules`: `users/{uid}/savedRecipes` は本人のみ R/W
- [ ] `storage.rules`: `recipes/*.png` は public read / write false
- [ ] `.firebaserc`: project default = `mlpr-local`
- [ ] README に Emulator 起動手順を追記 (`firebase emulators:start --project=mlpr-local`)
- **DoC**: `firebase emulators:start` でローカル起動成功 (UI が http://localhost:4000 で開く)
- **commit**: `feat(slice4): add Firebase Emulator config (firebase.json + rules)`

### T-402 Port 移行: Python Agent 8080 → 8001

- [ ] `agent/src/makelocal_agent/main.py` または起動スクリプトで `--port 8001`
- [ ] `agent/Dockerfile` (もし port hardcode あれば)
- [ ] `.devcontainer/devcontainer.json`: forwardPorts に 8001 / 9099 / 9199 追加、8080 ラベルを「Firestore Emulator」に
- [ ] `.env.example`: `AGENT_BASE_URL=http://localhost:8001`
- [ ] README の手順 grep 置換
- [ ] CI / E2E の playwright.config 内 port 参照 (もしあれば)
- **DoC**: `uv run uvicorn ... --port 8001` で agent が立つ、curl で /agent/health 200
- **commit**: `chore(slice4): migrate Python Agent from port 8080 to 8001`

### T-403 .env.example: Firebase 変数追加

- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID=mlpr-local`
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY=fake-api-key-emulator`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=mlpr-local.firebaseapp.com`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID=1:0:web:0`
- [ ] `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`
- [ ] `MLPR_USE_MOCK_STORAGE=true` (オフライン dev)
- [ ] `MLPR_FIREBASE_STORAGE_BUCKET=mlpr-local.appspot.com`
- [ ] `MLPR_FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199`
- **DoC**: `.env.example` をコピーすると Emulator 構成で動く想定値が並ぶ
- **commit**: `chore(slice4): document Firebase env vars in .env.example`

→ **push & CI green 確認**

---

## Phase 2 — ドメイン拡張

### T-404 SavedRecipe 型 + image.ready の url 化 (TS)

- [ ] `src/domain/saved-recipe.ts`: `SavedRecipe` 型 + `SavedRecipeSnapshot` (server timestamp 除外)
- [ ] `src/domain/schemas.ts`: `imageReadySchema` を `{ recipeId, url }` に変更 (`dataUri` → `url`)
- [ ] `src/hooks/use-recipe-detail-stream.ts`: state を `imageDataUri` → `imageUrl` rename + 反映
- [ ] テスト: `schemas.test.ts` / `use-recipe-detail-stream.test.tsx` 更新
- **DoC**: vitest + typecheck green
- **commit**: `feat(slice4): introduce SavedRecipe + migrate image.ready to {url} (TS)`

### T-405 image.ready の url 化 (Python) + Pydantic schema 更新

- [ ] `agent/src/.../domain/stream.py`: `ImageReadyEvent` の `dataUri` → `url`
- [ ] テスト `test_domain_stream.py` 更新
- **DoC**: pytest green
- **commit**: `feat(slice4): migrate image.ready event to {url} (Python)`

→ **push & CI green 確認**

---

## Phase 3 — Python: StorageClient + image_agent GCS 化

### T-406 StorageClient Protocol + Mock 実装 + 単体テスト

- [ ] `agent/src/.../lib/storage.py`: `StorageClient` Protocol + `MockStorageClient`
- [ ] `agent/tests/test_lib_storage.py`: Mock の戻り URL を検証
- **DoC**: pytest green / ruff / mypy strict pass
- **commit**: `feat(slice4): add StorageClient protocol with Mock`

### T-407 FirebaseStorageClient 実装 (google-cloud-storage 経由)

- [ ] `pyproject.toml` に `google-cloud-storage` 依存追加 + `uv sync --extra dev`
- [ ] `FirebaseStorageClient` クラスを `storage.py` に追加 (use_emulator フラグ対応)
- [ ] `agent/src/.../deps.py`: `get_storage_client()` を Mock/Vertex 同様のシングルトンで
- [ ] `agent/tests/test_deps.py`: 新ファクトリのテスト追加
- **DoC**: pytest green / Emulator 接続テスト (skip 可) / mypy strict pass
- **commit**: `feat(slice4): add FirebaseStorageClient + DI`

### T-408 image_agent を GCS put 化

- [ ] `image_agent.run_image_for_candidate(...)` の戻り値を URL (str) に変更 (型は同じ)
- [ ] PNG bytes → `storage_client.upload_image(key, bytes)` → URL
- [ ] `recipe_orchestrator` の image_agent 呼び出し箇所を更新
- [ ] テスト: `test_image_agent.py` / `test_recipe_orchestrator.py` 更新 (Mock が URL を返す)
- **DoC**: pytest green
- **commit**: `feat(slice4): image_agent uploads PNG to storage and returns URL`

→ **push & CI green 確認**

---

## Phase 4 — Firebase Client + AuthProvider + useAuth

### T-409 Firebase client singleton + Emulator connect

- [x] `pnpm add firebase`
- [x] `src/lib/firebase/client.ts`: initializeApp + getAuth + getFirestore + getStorage
- [x] `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` で 3 つの connect*Emulator を呼ぶ (HMR 安全)
- [x] `src/lib/firebase/client.test.ts`: env で振り分けの単体テスト (window stubbing)
- **DoC**: vitest + typecheck green
- **commit**: `feat(slice4): add Firebase client singleton with Emulator support` (78a03b7)

### T-410 AuthProvider + useAuth フック

- [x] `src/hooks/use-auth.tsx`: Context + Provider + onAuthStateChanged 購読
- [x] `signInWithGoogle` / `signOut` を Provider 内で実装
- [x] `src/hooks/use-auth.test.tsx`: signIn → status 'authenticated' / signOut → 'unauthenticated' の遷移テスト
- [x] `app/layout.tsx` に AuthProvider を `<body>` 直下にラップ
- **DoC**: vitest green、AuthProvider が SSR で warning なく hydrate
- **commit**: `feat(slice4): add AuthProvider + useAuth hook` (6b3318a)

→ **push & CI green 確認**

---

## Phase 5 — Toast 基盤

### T-411 Toast + ToastHost コンポーネント (見た目)

- [x] `src/components/notify/Toast.tsx` + `.module.css` (success/info/warning の 3 トーン、washi-deep 背景 + 朱縦線)
- [x] `src/components/notify/ToastHost.tsx` + `.module.css` (画面下中央 fixed, 縦に積む)
- [x] RTL test: 3 トーン + 手動 close + auto progress bar
- **DoC**: vitest green
- **commit**: `feat(slice4): add Toast + ToastHost components` (7a4102d)

### T-412 useToast + ToastProvider 統合

- [x] `src/hooks/use-toast.tsx`: Context + push 関数 + 2.5s auto remove
- [x] `app/layout.tsx` に ToastProvider をラップ (AuthProvider と同列または内側)
- [x] テスト: push → 2.5s 後に消える / 手動 close で即消える
- **DoC**: vitest green
- **commit**: `feat(slice4): add useToast hook + ToastProvider` (8c2955c)

→ **push & CI green 確認**

---

## Phase 6 — SignInModal + GoogleButton

### T-413 GoogleButton コンポーネント

- [x] `src/components/auth/GoogleButton.tsx`: SVG G ロゴ (4 色) + Roboto + radius 999 + height 50
- [x] `.module.css`: 公式ガイドライン準拠
- [x] RTL test: ラベル / クリック handler 呼び出し
- **DoC**: vitest green
- **commit**: `feat(slice4): add GoogleButton component` (f68c204)

### T-414 SignInModal + useSignInModal

- [x] `src/components/auth/SignInModal.tsx`: `<dialog>` ベース + handle + eyebrow + title + GoogleButton + やめる link
- [x] `src/hooks/use-sign-in-modal.tsx`: Context + open/close 状態 + SignInModal をマウント
- [x] `app/layout.tsx` に SignInModalProvider をラップ (AuthProvider の内側)
- [x] RTL test: Modal 開閉 / Google ボタンクリックで signInWithGoogle 呼ばれる / ESC で閉じる
- **DoC**: vitest green + a11y (aria-modal, focus trap) 検証
- **commit**: `feat(slice4): add SignInModal + useSignInModal hook` (f0f142f)

→ **push & CI green 確認**

---

## Phase 7 — AvatarButton + 全画面 topRow 配置

### T-415 AvatarButton コンポーネント

- [x] `src/components/auth/AvatarButton.tsx`: 32〜36px 円、photoURL or イニシャル、未サインインは「サインイン」リンク
- [x] `.module.css`: shadow / hover / focus
- [x] クリックで `router.push('/library')`、未サインインなら `openModal()`
- [x] RTL test: 未/済 + photoURL/イニシャルの分岐
- **DoC**: vitest green
- **commit**: `feat(slice4): add AvatarButton component` (420cde5)

### T-416 各画面 topRow に AvatarButton を配置

- [x] `LocalSelectClient` topRow 新設 (flex-end で右寄せ)
- [x] `IngredientSelectClient` topRow 右上 (既存「Tap 2 / 2」の隣に並べる)
- [x] `CandidatesClient` topRow 右上 (既存「↻ ふり直す」と並べる)
- [x] `DetailClient` topRow を新設 (RecipeHero 上に position: absolute で薄く)
- [x] レイアウト微調整 (既存 CSS Module を最小編集)
- **DoC**: 全画面 typecheck / lint green、視覚回帰なし
- **commit**: `feat(slice4): place AvatarButton in all top-rows` (670da9b)

→ **push & CI green 確認**

---

## Phase 8 — useSavedRecipe / DetailClient ハート連動

### T-417 useSavedRecipe フック (1 件)

- [ ] `src/hooks/use-saved-recipe.ts`: `onSnapshot` で doc を購読 + save/unsave 関数
- [ ] `src/lib/firebase/saved-recipe.ts`: Firestore CRUD ヘルパ + 型
- [ ] テスト: Emulator 経由 (Provider mock) で save → state 'saved' / unsave → 'unsaved'
- **DoC**: vitest green (Firestore Emulator が起動していること)
- **commit**: `feat(slice4): add useSavedRecipe hook`

### T-418 DetailClient のハートを Firestore + Modal + Toast に接続

- [ ] DetailClient: 既存 `isSaved` local state を `useSavedRecipe(candidateId)` に置換
- [ ] ハート onClick: state 別に分岐 (unauth → openModal / saved → unsave + toast / unsaved → save + toast)
- [ ] 旧「ピザ帳に保存」ボタンを削除 (alert もろとも)
- [ ] RecipeHero の `isSaved` prop を `savedState: 'unsaved'|'saved'|'unauthenticated'` に拡張
- [ ] 未サインイン時のガイド表示 (デザイン 12 の guest state)
- [ ] テスト: 各 state の onClick が想定通り
- **DoC**: vitest green / lint / typecheck
- **commit**: `feat(slice4): wire DetailClient heart to Firestore + Modal + Toast`

### T-419 useSavedRecipes フック (一覧、orderBy savedAt desc)

- [ ] `src/hooks/use-saved-recipes.ts`: `onSnapshot` で query 購読
- [ ] テスト: Emulator で 3 件 add → 一覧が降順で返る
- **DoC**: vitest green
- **commit**: `feat(slice4): add useSavedRecipes hook (list)`

→ **push & CI green 確認**

---

## Phase 9 — /library 画面

### T-420 LibraryCard + ProfileStrip コンポーネント

- [ ] `src/components/library/LibraryCard.tsx` + CSS (72px サムネ + title + 戦略印小 + 県名 + 保存日 + ハート)
- [ ] `src/components/library/ProfileStrip.tsx` + CSS (アバタ + 名前 + メール + サインアウトボタン)
- [ ] RTL test: 各カードのクリック / ハート / ProfileStrip のサインアウト呼び出し
- **DoC**: vitest green
- **commit**: `feat(slice4): add LibraryCard + ProfileStrip components`

### T-421 LibraryClient + /library/page.tsx

- [ ] `app/library/page.tsx` (Server Component)
- [ ] `app/library/_components/LibraryClient.tsx` + CSS
- [ ] レイアウト: topRow + ScreenHero + ProfileStrip + LibraryCard リスト or 空状態
- [ ] 未サインインなら SignInModal 強制 open + / に redirect (Modal を閉じた時)
- [ ] サインアウト時 → `signOut()` + Toast 'info' + redirect to '/'
- [ ] テスト: 状態別 (loading/empty/items/unauthenticated) の表示
- **DoC**: vitest green / lint / typecheck / E2E partial
- **commit**: `feat(slice4): add /library page + LibraryClient`

### T-422 ヘッダー上の AvatarButton を /library への直行に統一

- [ ] 既存 AvatarButton のクリック動線を /library 1 本に絞る (dropdown は実装しない)
- [ ] 未サインインで /library に直接アクセスした場合の挙動を確認 (Modal 強制 open)
- **DoC**: vitest green / 全画面で「アバター → /library」動線が成立
- **commit**: `feat(slice4): unify avatar tap → /library across screens`

→ **push & CI green 確認**

---

## Phase 10 — TOP ページ (`/`)

### T-423 `/` を実画面化 + Sign-in 導線

- [ ] `app/_components/HomeRedirector.tsx` を refactor → `app/_components/TopClient.tsx`
- [ ] `localeId` 有 → /local に replace (リピーターの自動 redirect 維持)
- [ ] 初回訪問者は TOP の中身を表示 (eyebrow + 大型明朝 + 朱 CTA「始める →」+ 「サインインしてピザ帳を開く」リンク + 3 戦略印オーナメント)
- [ ] サインインリンクで `openModal()` → 認証成功で `router.push('/library')`
- [ ] CSS Module で washi 背景 / 中央寄せ / 呼吸する余白 / フッタ
- [ ] テスト: localeId 有 redirect / なし TOP 表示 / リンク挙動
- **DoC**: vitest green / E2E が新 TOP を経由できる
- **commit**: `feat(slice4): realize TOP page (/) with sign-in entry`

→ **push & CI green 確認**

---

## Phase 11 — Security Rules + E2E + CI + Wrap-up

### T-424 Firestore + Storage Security Rules ユニットテスト

- [ ] `tests/firestore-rules.test.ts` (`@firebase/rules-unit-testing`)
- [ ] users/{uid}/savedRecipes: 同 uid 可 / 他 uid 不可 / 未認証 不可
- [ ] storage: recipes/{id}.png は public read / client write 不可
- [ ] CI で `firebase emulators:exec` 経由で走らせる
- **DoC**: rules test green / CI 上でも green
- **commit**: `test(slice4): add Firestore + Storage security rules tests`

### T-425 E2E ジャーニーを延長 (TOP → サインイン → 保存 → /library → サインアウト)

- [ ] `tests/e2e/journey.spec.ts`: 既存ジャーニーの末尾に追記
- [ ] `tests/e2e/playwright.config.ts`: `webServer` に Firebase Emulator も起動 (concurrently or 別 step)
- [ ] Auth Emulator では Google プロバイダの自動成功 fixture を使う (signInWithPopup の代替)
- [ ] 保存 → /library で 1 件確認 → ハート解除 → 0 件 → サインアウト → / redirect
- **DoC**: `pnpm test:e2e` green
- **commit**: `test(e2e): extend journey to cover sign-in / save / library / sign-out`

### T-426 CI workflow に Firebase Emulator + 新 step を統合

- [ ] `.github/workflows/ci.yml`: e2e job に `firebase emulators:exec "pnpm test:e2e"` を組み込み
- [ ] `firebase-tools` をインストール (cache 含む)
- [ ] 失敗時に Emulator log を artifact に上げる
- **DoC**: CI 全 green
- **commit**: `ci(slice4): integrate Firebase Emulator into e2e workflow`

### T-427 ドキュメント整備 + v0.4.0 tag

- [ ] `README.md`: Slice 4 の動作手順 (Firebase Emulator 起動 / Auth 設定 / 環境変数)
- [ ] `README.md`: 機能リスト / API エンドポイントを更新 (TOP / /library / Firestore CRUD)
- [ ] `.env.example` の最終確認
- [ ] `package.json` / `agent/pyproject.toml` を 0.4.0 にバンプ
- [ ] CI 全 green を確認
- [ ] `git tag -a v0.4.0 -m "Slice 4: Firestore + Auth + GCS"` + push --tags
- **DoC**: 全 CI green / 手動 E2E 1 回成功 / タグ push 済
- **commit**: `chore(slice4): wrap-up README + bump to v0.4.0`

→ **push & tag v0.4.0**

---

## Slice 4 完了の DoD (Definition of Done)

1. `/` (TOP) → 「始める」→ /local の通しが動く
2. /recipes/[id] でハート → SignInModal → Google サインイン → 保存 → Toast の通しが動く
3. アバターをタップすると /library に直行し、保存済みレシピが一覧される
4. /library のプロフィール帯からサインアウトすると / に redirect する
5. image.ready が `{ url }` shape で配信される (Storage Emulator URL)
6. Python Agent が port 8001 で動く (Firestore Emulator が 8080 を占有)
7. Firestore Security Rules テストが green (他 uid からの read/write が deny)
8. unit (vitest + pytest) + E2E + CI 全 green
9. v0.4.0 タグが push 済み

---

## 改訂履歴

| 日付 | 版 | 変更内容 |
| --- | --- | --- |
| 2026-05-17 | 1.0 | 初版作成 |
