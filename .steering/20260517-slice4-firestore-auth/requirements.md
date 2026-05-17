# Slice 4 要求書 — Firestore + Firebase Auth + GCS 画像永続化

## 1. このスライスのゴール (1 行)

**サインインしたユーザーがレシピを「ピザ帳」に保存して後から開ける**ようにする。
副次として、Imagen 画像を base64 から GCS URL に移行し、NDJSON の重量を ~5MB/行 → ~数百 B/行に縮める。

## 2. 背景

- Slice 3 までで「地元選択 → 食材選択 → 候補 3 案 → 詳細レシピ + 画像」のメインジャーニーが完成
- ただし詳細画面のハート / 「ピザ帳に保存」/「作ってみる」CTA は **alert のまま** (Slice 3 design.md §1.1.5)
- Imagen 画像も詳細画面を開くたびに再生成しており、永続化されていない (~$0.04/画像 × 開き直し)
- ユーザーの「気に入った 1 枚」を残せないと、デモとして体験が完結しない

## 3. スコープ

### 3.1 IN (Slice 4 で実装)

| カテゴリ | 何 |
| --- | --- |
| **TOP ページ (`/`)** | 新規ランディング画面。eyebrow + 大型明朝 + 朱 CTA「始める →」+ サインインリンク。localStorage に locale 有のリピーターは従来通り自動 redirect |
| **Auth** | Firebase Auth + Google Sign-In **1 プロバイダのみ**。サインイン/サインアウトの導線 |
| **サインイン UI** | **Modal overlay** で実装 (案 C 採用)。半透明 backdrop + blur + 中央 sheet + Google 公式ボタン + 「やめる」link。ハート押下 / TOP リンクから起動 |
| **匿名アクセス** | サインインしなくても `/` `/local` `/ingredients` `/candidates` `/recipes/[id]` は閲覧可能 |
| **保存系 CTA** | 詳細画面のハートを **Firestore CRUD に差し替え** (旧「ピザ帳に保存」ボタンは廃止、ハート 1 つに集約)。未サインイン時は Modal を出す |
| **ヘッダーアバター** | 全画面右上にサインイン状態を反映するアバター (32〜36px 円)。**タップで /library に直行** (dropdown は無し)。未サインインなら表示しない or 極小 "サインイン" link |
| **ピザ帳一覧 (`/library`)** | サインイン済みユーザー専用。topRow (← / ピザ帳 / Avatar) + ScreenHero「あなたの一枚を、/ 集める。」+ **プロフィール帯** (アバタ + 名前 + メール + サインアウトボタン) + 大判カード縦リスト |
| **ピザ帳から削除** | 一覧カードのハート再タップ + 詳細画面のハート再タップ、どちらからでも解除可能。トースト通知 |
| **トースト** | success (朱) / info (藍) / warning (山吹) の 3 トーン汎用コンポーネント。washi-deep 背景 + 朱の縦 3px ライン + 自動 close (2.5s) + 手動 close (✕) 可 |
| **画像 GCS 化** | `image.ready` を `{ dataUri }` → `{ url }` に変更。`image_agent` で PNG を GCS にアップロードし signed URL を返す。NDJSON 1 行あたり数百バイトに |
| **Firestore Emulator** | ローカル開発で Firestore + Auth + Storage を全て Emulator で起動。実 Firebase は デプロイ後 (Slice 6+) |
| **Port 整理** | Python Agent を `8080` → `8001` に移し、`8080` を Firestore Emulator に明け渡す |
| **CI 統合** | E2E ジャーニーを「TOP → サインイン Modal → 保存 → /library で確認 → サインアウト」まで延長 (Auth Emulator + Firestore Emulator を CI 内で起動) |

### 3.2 OUT (Slice 4 ではやらない)

| カテゴリ | 何 | 予定 |
| --- | --- | --- |
| **「作ってみる」CTA** | 今は alert のまま据え置き | Slice 5 で「ステップ調理モード」として実装 |
| **複数 Auth プロバイダ** | Email/Password, Anonymous, Apple, GitHub 等 | 必要になったら追加 |
| **共有 / SNS** | URL でレシピを公開、Twitter シェア等 | Slice 6+ |
| **「ピザ帳」の編集** | 名前変更・タグ付け・メモ | 必要になったら |
| **本番 Firebase** | 実プロジェクトでの動作確認 | Slice 6 (デプロイ時) |
| **画像 GCS Lifecycle** | 古い画像の自動削除 | Slice 6 (デプロイ時) |
| **オフライン対応** | Firestore offline persistence の本気活用 | 必要になったら |

## 4. ユーザーストーリー

### US-4.0: 初回訪問者が TOP からアプリの全体像を掴める

> 新規ユーザーとして、TOP ページでアプリが何をしてくれるか一目で分かり、「始める」を押して動線に入りたい。

**受け入れ条件:**
1. `/` を直接開くと TOP ページが表示される (eyebrow + 大型明朝 + 朱 CTA + サインインリンク)
2. localStorage に locale 有のリピーターは TOP を踏まずに `/local` (or `/ingredients`) に redirect される (Slice 1〜3 と同じ挙動を維持)
3. 「始める →」CTA タップで `/local` に遷移
4. 「サインインしてピザ帳を開く」リンクタップでサインイン Modal が出る (Modal を閉じれば TOP のまま)

### US-4.1: サインインしてピザを保存する

> ユーザーとして、気に入った詳細レシピを「ピザ帳」に保存して後から開きたい。
> そのために 1 回 Google でサインインする。

**受け入れ条件:**
1. /recipes/[id] でハートをタップ → 未サインインならアプリ内 Modal (案 C) が表示される
2. Modal 内の Google ボタンタップで `signInWithPopup()` 起動 → 認証完了で Modal 自動 close + 保存実行
3. ハートはアクティブ状態 (朱で塗り潰し) + 「ピザ帳に保存しました」のトースト (画面下中央、2.5s で fade out)
4. 再度同じレシピを開くとハートはアクティブのまま (Firestore から状態を引く)
5. ハートを再タップで保存解除 + 「保存を解除しました」トースト (確認ダイアログなし)

### US-4.2: ピザ帳一覧を開く

> ユーザーとして、保存した全レシピを一覧で見て、開きたいものを選びたい。

**受け入れ条件:**
1. サインイン済みなら **どの画面の右上にもアバター** が表示される
2. アバタータップで **/library に直行** (dropdown は無い)
3. /library の topRow に ← (前画面に戻る) / 「ピザ帳」中央タイトル / Avatar が並ぶ
4. ScreenHero「あなたの一枚を、/ 集める。」+ 「保存中 N 件」表示
5. ScreenHero の下に **プロフィール帯** — アバタ + 名前 + メール + 右端に「サインアウト」ボタン
6. 一覧は新しい順 (savedAt 降順)、各カードに 72px 画像サムネ / title / 戦略印小 / 県名 / 保存日 / ハート (朱 active)
7. カードクリックで `/recipes/[candidateId]` を開く
8. カードのハート再タップで保存解除 (一覧から即消える + トースト)
9. 0 件のときは大型ハート枠 (120×120 dashed 円) +「まだ保存したピザは、/ ありません。」+ 「ピザを探す →」CTA (→ /local)

### US-4.3: サインアウトとプライバシー

> ユーザーとして、デバイスを家族と共有しているのでサインアウトしたい。

**受け入れ条件:**
1. /library のプロフィール帯右端「サインアウト」ボタンで `signOut()`
2. サインアウト後は /library に居れば `/` に redirect
3. ヘッダー右上のアバターも消える (全画面共通)
4. 保存データは Firestore に残る (再サインインで復活)
5. サインアウト完了の info トースト「サインアウトしました」

### US-4.4: ゲスト体験は維持する

> 新規ユーザーとして、サインインせずに候補 3 案 + 詳細レシピをまず見たい。

**受け入れ条件:**
1. `/local` → `/ingredients` → `/candidates` → `/recipes/[id]` の通しジャーニーは未サインインでも完走できる
2. 詳細画面でハートをタップしたタイミングで初めてサインインが促される
3. 「作ってみる」CTA は引き続き alert (Slice 5 で実装予定)

### US-4.5: 画像 URL 化による NDJSON 軽量化

> 開発者として、NDJSON 1 行に 5MB の base64 を載せる現状を解消し、保存時にも画像参照が軽くなるようにしたい。

**受け入れ条件:**
1. `image.ready` イベントの shape が `{ recipeId, url }` に変わる (Python + TS 両方)
2. Vertex Imagen 4 が返す PNG bytes を `image_agent` で GCS の `gs://${PROJECT}-pizza-images/sessions/${recipeId}.png` に put
3. 既存 URL を再利用するため、同一 candidateId での再生成は GCS にすでにあれば skip して URL だけ返す (任意, 時間あれば)
4. base64 → URL への切替で NDJSON 1 行は 5MB → 数百 B に縮む

## 5. 機能要件 (MUST)

- **F-400** TOP ページ (`/`) を新規追加: eyebrow + 大型明朝 + 朱 CTA「始める →」+ サインインリンク + 3 戦略印オーナメント
- **F-401** Firebase Auth Web SDK 統合 (Google プロバイダ、`signInWithPopup`)
- **F-402** AuthSubject に `kind: 'authenticated', uid, displayName, photoURL, email` を追加 (`'guest'` / `'anonymous'` は維持)
- **F-403** Firestore コレクション設計: `users/{uid}/savedRecipes/{candidateId}`
- **F-404** 保存ドキュメント shape: `{ candidateId, title, localeId, prefecture, strategy, imageUrl, savedAt: Timestamp }`
- **F-405** DetailClient のハートが Firestore CRUD を呼ぶ (未サインインなら SignInModal 表示)。「ピザ帳に保存」ボタンは廃止 (ハートに集約)
- **F-406** `/library` ページ + `LibraryClient` で保存済みレシピを一覧表示。プロフィール帯 + LibraryCard × N + 0 件時の空状態
- **F-407** **AvatarButton** (32〜36px) を全画面右上に表示。サインイン済みなら photoURL or イニシャル、タップで /library 直行。dropdown は無し
- **F-408** image_agent が PNG bytes → GCS upload → public URL を返す
- **F-409** `image.ready` イベント schema を `{ url }` に変更 (Python + TS、Pydantic + Zod 両方)
- **F-410** Firestore Emulator + Auth Emulator + Storage Emulator のローカル起動手順 (firebase.json + emulators.json)
- **F-411** Python Agent を port 8001 に移行 (.env.example / devcontainer.json / Dockerfile / README 更新)
- **F-412** Firestore Security Rules: `users/{uid}/savedRecipes` は本人 (request.auth.uid == uid) のみ R/W
- **F-413** **SignInModal** コンポーネント: 半透明 backdrop + blur(4px) + 中央 sheet (handle + Google 公式ボタン + やめる link)
- **F-414** **Toast** 共通コンポーネント (success/info/warning) + `useToast()` フック (push 関数 + 自動 close 2.5s + 手動 close)
- **F-415** **LibraryCard** コンポーネント (72px サムネ + title + 戦略印小 + 県名 + 保存日 + ハート)
- **F-416** **ProfileStrip** コンポーネント (アバタ + 名前 + メール + サインアウトボタン)
- **F-417** TOP ページの「始める →」/ サインインリンクと Modal を統合 (Modal で完結)

## 6. 非機能要件

- **NF-401** ハート → Firestore 書き込み完了まで **< 500ms** (Emulator) / **< 1.5s** (本番想定)
- **NF-402** /library 一覧 0〜50 件のレンダリングが **< 800ms** (Emulator)
- **NF-403** Firestore Security Rules を Unit test (`firebase emulators:exec` で rules test) で検証
- **NF-404** 既存 unit (vitest 333 + pytest 151) + E2E (2) を全て green に保つ
- **NF-405** Slice 4 で追加する hook / component / route の test coverage は Slice 3 と同水準

## 7. 受け入れ確認 DoD (Definition of Done)

1. ローカルで `pnpm dev` + `firebase emulators:start` で全機能が動く
2. Google Sign-In → ハート → /library で確認 → サインアウト の通しが Emulator で成功
3. AGENT_MODE=mock でも http でも image.ready が `{ url }` を返す (GCS Emulator URL)
4. 既存 CI (lint/typecheck/test/build/e2e) が全 green
5. E2E ジャーニーが「サインイン + 保存 + /library で表示」まで延長されて green
6. Firestore Security Rules テストが green
7. README.md に Slice 4 動作手順 + Emulator 起動手順を追記
8. v0.4.0 タグが push 済み

## 8. 改訂履歴

| 日付 | 版 | 変更内容 |
| --- | --- | --- |
| 2026-05-17 | 1.0 | 初版作成 |
| 2026-05-17 | 1.1 | Claude Design 成果反映: TOP 追加 / SignInModal 採用 / Avatar 直行 / Profile strip / Toast 共通化 / 新規 UI 部品 6 つを F-413〜F-417 として明文化 |
