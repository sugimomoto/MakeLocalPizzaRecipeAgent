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

- [x] `src/hooks/use-saved-recipe.ts`: `onSnapshot` で doc を購読 + save/unsave 関数
- [x] `src/lib/firebase/saved-recipe.ts`: Firestore CRUD ヘルパ + 型
- [x] テスト: helper を mock してフックのロジックを検証 (auth status 連動 / save/unsave 委譲 / unsubscribe / error 集約)
- **DoC**: vitest green
- **commit**: `feat(slice4): add useSavedRecipe hook + Firestore CRUD helpers` (11f4697)

### T-418 DetailClient のハートを Firestore + Modal + Toast に接続

- [x] DetailClient: 既存 `isSaved` local state を `useSavedRecipe(candidateId)` に置換
- [x] ハート onClick: state 別に分岐 (unauth → openModal / saved → unsave + toast / unsaved → save + toast)
- [x] 旧「ピザ帳に保存」ボタンを削除 (alert もろとも、pseudoAlert も削除)
- [x] RecipeHero の `isSaved` prop を `savedState: 'unsaved'|'saved'|'unauthenticated'` に拡張
- [x] 未サインイン時のガイド表示「サインインしてピザ帳に保存」吹き出し
- [x] テスト: RecipeHero の 3 state ＋ guest hint
- **DoC**: vitest green / lint / typecheck
- **commit**: `feat(slice4): wire DetailClient heart to Firestore + Modal + Toast` (57fbda7)

### T-419 useSavedRecipes フック (一覧、orderBy savedAt desc)

- [x] `src/hooks/use-saved-recipes.ts`: `onSnapshot` で query 購読
- [x] テスト: helper を mock して空配列 / 3 件レスポンス / unsubscribe / error
- **DoC**: vitest green
- **commit**: `feat(slice4): add useSavedRecipes hook (list)` (b8fa761)

→ **push & CI green 確認**

---

## Phase 9 — /library 画面

### T-420 LibraryCard + ProfileStrip コンポーネント

- [x] `src/components/library/LibraryCard.tsx` + CSS (72px サムネ + title + 戦略印小 + 県名 + 保存日 + ハート)
- [x] `src/components/library/ProfileStrip.tsx` + CSS (アバタ + 名前 + メール + サインアウトボタン)
- [x] RTL test: 各カードのクリック / ハート / ProfileStrip のサインアウト呼び出し
- **DoC**: vitest green
- **commit**: `feat(slice4): add LibraryCard + ProfileStrip components` (2d3b080)

### T-421 LibraryClient + /library/page.tsx

- [x] `app/library/page.tsx` (Server Component)
- [x] `app/library/_components/LibraryClient.tsx` + CSS
- [x] レイアウト: topRow + ScreenHero + 保存件数 + ProfileStrip + LibraryCard リスト or 空状態
- [x] 未サインインなら SignInModal 強制 open + / に redirect (Modal を閉じた時)
- [x] サインアウト時 → `signOut()` + Toast 'info' + redirect to '/'
- [x] LibraryCard クリック → PENDING_RECIPE_KEY に snapshot 書込 → /recipes/[id]
- [x] LibraryCard ハート → useSavedRecipe(id).unsave + success Toast
- **DoC**: vitest green / lint / typecheck (E2E は Phase 11 で延長)
- **commit**: `feat(slice4): add /library page + LibraryClient` (d711d3e)

### T-422 ヘッダー上の AvatarButton を /library への直行に統一

- [x] AvatarButton のクリック動線は `router.push('/library')` の 1 本 (T-415 で実装、dropdown は無し)
- [x] 未サインインで /library に直接アクセス → SignInModal を強制 open、Modal クローズで / redirect (T-421 LibraryClient で実装)
- [x] 全 5 画面 (Local / Ingredients / Candidates / Detail / Library) に AvatarButton 配置済
- **DoC**: vitest green / 全画面で「アバター → /library」動線が成立
- **commit**: 別 commit 不要 (T-415 + T-421 でカバー済)

→ **push & CI green 確認**

---

## Phase 10 — TOP ページ (`/`)

### T-423 `/` を実画面化 + Sign-in 導線

- [x] `app/_components/HomeRedirector.tsx` を削除 → `app/_components/TopClient.tsx` 新設
- [x] `localeId` 有 → /local に replace (リピーターの自動 redirect 維持)
- [x] 初回訪問者は TOP の中身を表示 (eyebrow + 大型明朝 + 朱 CTA「始める →」+ 「サインインしてピザ帳を開く」リンク + 3 戦略印オーナメント)
- [x] サインインリンクで `openModal()` → 認証成功 (TOP に戻った状態) で `/library` に自動 replace
- [x] CSS Module で washi 背景 / 中央寄せ / 呼吸する余白 / フッタ
- [x] テスト: hydration 前 null / localeId 有 redirect / なし TOP 表示 / 各リンク挙動 / authenticated で /library 行き
- **DoC**: vitest green (E2E は Phase 11 で延長)
- **commit**: `feat(slice4): realize TOP page (/) with sign-in entry` (f27df2e)

→ **push & CI green 確認**

---

## Phase 11 — Security Rules + E2E + CI + Wrap-up

### T-424 Firestore + Storage Security Rules ユニットテスト

- [x] `tests/rules/firestore-rules.test.ts` (`@firebase/rules-unit-testing`)
- [x] users/{uid}/savedRecipes: 同 uid 可 / 他 uid 不可 / 未認証 不可
- [x] storage: recipes/{id} は public read / client write 不可
- [x] CI で `firebase emulators:exec` 経由で走らせる (T-426 で実装)
- **DoC**: rules test green / CI 上でも green
- **commit**: `test(slice4): add Firestore + Storage security rules tests` (4dd2354)

### T-425 E2E ジャーニーを延長 (TOP → サインイン → 保存 → /library → サインアウト)

- [x] `tests/e2e/journey.spec.ts`: 旧「ピザ帳に保存」ボタンアサーション除去 + ハート存在検証追加
- [~] `tests/e2e/auth.spec.ts`: signInWithPopup の Playwright 自動化が重いため `test.skip` で stub。Slice 5 で実装
- **DoC**: `pnpm test:e2e` green (journey は Slice 4 対応済、auth は skip)
- **commit**: `test(e2e): update journey for Slice 4 hero changes + stub signed-in journey` (bf91171)

### T-426 CI workflow に Firebase Emulator + 新 step を統合

- [x] `.github/workflows/ci.yml`: 新 `rules` job で `firebase emulators:exec` 経由で `pnpm test:rules` を実行
- [x] `firebase-tools@15` を CI 内で `npm i -g`
- [x] Java 21 setup (Firestore/Storage Emulator は JVM 起動)
- [x] 失敗時に Emulator log を artifact に上げる
- **DoC**: CI 全 green (push 後に確認)
- **commit**: `ci(slice4): integrate Firebase Emulator into rules job` (f10e11d)

### T-427 ドキュメント整備 + v0.4.0 tag

- [x] `README.md`: Slice 4 の動作手順 (Firebase Emulator 起動 / Auth 設定 / 環境変数 / port forward ずれ対策 / Security Rules テスト)
- [x] `README.md`: 機能リスト / 画面動線 / 関連ドキュメント / 既知の事項を更新
- [x] `.env.example` は Slice 4 で既に整備済 (確認のみ)
- [x] `package.json` / `agent/pyproject.toml` を 0.4.0 にバンプ
- [x] CI 全 green を確認 (run 26043880062 = HEAD a3c97e8 で全 4 job success)
- [x] `git tag -a v0.4.0 -m "Slice 4 — Firestore + Auth + GCS / ピザ帳"` + push v0.4.0
- **DoC**: 全 CI green / 手動 E2E 1 回成功 / タグ push 済
- **commit**: `chore(slice4): wrap-up README + bump to v0.4.0` (8de20bd) + `fix(ci+slice4): make AuthProvider resilient to missing Firebase env` (a3c97e8)

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
