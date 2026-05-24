# Slice 7 要求 — 「作ってみた」フィードバック フロー

> 作成日: 2026-05-24
> 想定リリース: v0.7.0
> 位置付け: Slice 6 (本番デプロイ) 完了後の機能追加。「作って → 振り返り → 次の提案へ」の輪を閉じる。

## 1. 背景と目的

Slice 1〜6 で完成したジャーニーは「**地元を選ぶ → 食材を選ぶ → 3 案を提案 → 詳細を見る → 保存する**」までだった。
これは **「つくる」「とどける」** の章はカバーできているが、**「まわす」(継続的に学び・改善する)** の章が
未着手のまま。

Claude Design で起こし済みの [`design/pizza-screens.jsx`](../../design/pizza-screens.jsx) の `ScreenFeedback`
(`function ScreenFeedback` @ L618) に「作ってみた」を振り返るフィードバック画面が既に
意匠化されている。Slice 7 ではこの画面を実装に下ろし、保存済みレシピに対して
**ユーザ自身が観点別評価とタグを記録できる** ようにする。

これにより:

1. ハッカソンの審査軸「**まわす** (品質の継続的モニタリング)」をユーザフィードバックの形で示せる
2. 将来 (Slice 8 以降) で **フィードバックを次回生成 prompt に反映** / **Vertex AI Evaluation
   と組み合わせて品質スコアと突合** といった発展が乗る基盤を作る
3. ピザ帳が「保存しただけ」から「実体験の記録帳」に変わり、プロダクトとしての厚みが出る

Slice 7 のスコープは「**画面 + Firestore 記録**」に絞り、LLM 連携 / 品質モニタリングは別 Slice に分離する。

## 2. ペルソナとユーザストーリー

### US-7-1: 作ったあとの感想を残す
> **私 (ピザ帳ユーザ)** として、保存したレシピを **実際に作った後** に
> 自分の感想を ★ + 観点別 + チップで記録したい。
> なぜなら、次に同じ食材を選ぶときに「あの組み合わせは良かった」を思い出したいから。

### US-7-2: 「保存しただけ」と「実際に作った」を別画面で見たい
> **私** として、ピザ帳を 2 つの画面に分けて、
> **「保存しただけ (アイデア帳)」** と **「実際に作った記録 (振り返り帳)」**
> を切り替えて見たい。
> なぜなら、用途が違うから (これから作る候補を探す視点と、過去の手応えを振り返る視点)。

### US-7-3: 後で記録を直せる
> **私** として、一度記録したフィードバックを後から **編集・上書き** できるようにしたい。
> なぜなら、初日は ★4 でも翌日に「あれは ★5 だった」と思い直すことがあるから。

## 3. 機能要件

### FR-7-1: /feedback/[candidateId] 画面新規追加

- ルート: `/feedback/[candidateId]` (Next.js App Router の動的セグメント)
- アクセス制御:
  - 認証必須 (ゲストユーザは保存できないため SignInModal を促す)
  - 該当 SavedRecipe が自身のものに存在することが前提
    (存在しなければ `/library` に redirect)
- 画面構成 ([`design/pizza-screens.jsx` ScreenFeedback](../../design/pizza-screens.jsx) 準拠):
  1. ヘッダ — 「戻る」 / 「下書きを保存」リンク (右上、Slice 7 では「保存」と同義)
  2. タイトル — 「作ってみた」「今夜の一枚は、どうでしたか？」
  3. **Mini Hero** — 保存済み画像 (76x76) + タイトル + 日時 / ゲスト数 + ★ 1〜5 (タップで設定)
  4. **観点別評価** — 5 段階バー × 4 (味 / 見た目 / ストーリー / また作りたい)
     - バー幅 = 値 × 20% の朱色 (`T.shu`)
     - スライダではなく **タップで段階選択** (デザインにスライダ要素なし)
  5. **効いた点** タグ群 (matcha トーン、multi-select)
     - 食材の組合せ / ストーリーがウケた / 焼き加減 / 見た目 / 量 / ワインとの相性
  6. **次は調整したい** タグ群 (yamabuki トーン、multi-select)
     - 塩味 / 焼成時間 / 生地の厚さ / トッピング量 / 酸味 / 油分
  7. **ゲストの反応** タグ群 (shu トーン、multi-select)
     - 会話が弾んだ / 驚かれた / おかわり続出 / 写真に撮られた / 地元トークに発展
  8. **CTA** — 「記録して次の提案に活かす」 (画面下固定、ShuButton)
- 画面の写真添付 (Mini Hero 横のカメラアイコン) は **Slice 7 ではスコープ外** (Storage upload を含む)。
  クリックしても no-op + Toast (将来予告) で OK。

### FR-7-2: 詳細画面からの導線

- `/recipes/[candidateId]` (DetailClient) に **「作ってみる」CTA** を追加。
- 配置: 既存「ハート保存」アクションの近辺 (RecipeHero または body 下部) 。
  既存 UI を壊さない範囲で。
- 押下時:
  - 未認証 → SignInModal を開く
  - 認証済 + 未保存 → 軽い Toast 案内「先にピザ帳に保存してください」
    (フィードバックは保存済レシピ対象、未保存に対する評価は意味が薄いため)
  - 認証済 + 保存済 → `/feedback/[candidateId]` へ遷移
- 既存「ハート保存」とは別 CTA であり、置き換えではない。

### FR-7-3: /journal — 「振り返り帳」を新規ルートとして追加

ピザ帳を **2 つの並列ルート** に分ける:

- `/library` (既存、変更なし) — **保存帳**: ハートで保存したレシピ一覧
  - カード UI は [`design/slice4-screens.jsx` LibraryCard](../../design/slice4-screens.jsx) のまま
  - ハートアイコン表示、★ 表示は **しない**
  - savedAt 降順
- `/journal` (新規) — **振り返り帳**: フィードバックを記録したレシピ一覧
  - カード UI は [`design/pizza-screens.jsx` ScreenSaved](../../design/pizza-screens.jsx) のカードを下敷きに
    (画像 + 戦略バッジ + 日付 + 地名 + ★ 値の黄柏色)
  - ハートアイコンは出さない (振り返り側では文脈が違う)
  - cookedAt (feedback の updatedAt) 降順
  - feedback が無いレシピは表示しない
- 相互ナビゲーション:
  - 両画面のヘッダ近辺に「保存帳 → 振り返り帳」「振り返り帳 → 保存帳」相互リンクを置く
    (デザイン未起稿のため design.md で詳細化、ASCII モックアップで提示)
- AvatarButton メニュー / TOP からの導線も両方に行けるよう調整 (TOP の自動 redirect は既存どおり)。

### FR-7-4: Firestore 保存

- 保存先: `users/{uid}/savedRecipes/{candidateId}` ドキュメントに `feedback` フィールドを追加
  (別 subcollection ではなく同一 doc に embed する。1 レシピ 1 フィードバックの 1:1 関係のため)
- `feedback` の shape (詳細は design.md で確定):
  ```
  feedback?: {
    overallRating: 1..5
    axes: { taste: 1..5, look: 1..5, story: 1..5, again: 1..5 }
    whatWorked: string[]      // 効いた点
    whatToTune: string[]      // 次は調整したい
    guestVibe: string[]       // ゲストの反応
    guestCount?: number       // 任意、design では「ゲスト 4 名」が出ている
    note?: string             // 任意、自由記述 (Slice 7 では UI 持たない、将来用予約)
    cookedAt: Timestamp       // 初回保存時
    updatedAt: Timestamp      // 上書きでも更新
  }
  ```
- 保存処理は既存の `saveRecipe(db, uid, snapshot)` とは別ヘルパ (`saveFeedback(...)`) に分離。
  feedback だけ部分更新したいため、`updateDoc` か `setDoc(..., { merge: true })` を使う。
- Security Rules は **既存の `users/{uid}/savedRecipes/{candidateId}` のルールがそのまま適用される**
  (本人のみ R/W、追加変更不要)。

### FR-7-5: 既存フローへの影響

- 既存の Slice 1〜6 ジャーニーに後方非互換な変更を入れない。
- SavedRecipe 型に `feedback?` を optional 追加する形なので、フィードバック未記録の
  doc は今まで通り動く。
- /library 一覧での並び順 (savedAt desc) は変えない。フィードバック有無で
  並び替えしない。

## 4. 非機能要件

### NFR-7-1: 既存テスト全パス

- `pnpm test` (449 tests) / `pnpm test:rules` / `pnpm typecheck` / `pnpm lint` / `pnpm build`
  すべて green を維持。
- Python 側 (`uv run pytest` 232 tests) は Slice 7 でほぼ無関係だが、CI 構成は崩さない。

### NFR-7-2: テスト追加

- `/feedback/[id]` の page + FeedbackClient のレンダリングテスト (RTL + Vitest)
- `saveFeedback` / `subscribeFeedback` のユニットテスト
- Security Rules テスト追加: 他ユーザの feedback を書こうとしたら deny
  (既存 savedRecipes ルールの範囲だが念のため明示)

### NFR-7-3: アクセシビリティ

- 観点別評価 5 段階バーは **キーボード操作可能** (←→ で値変更、Tab で次の軸)
  かつ `aria-valuemin/max/now` を持つ。
- 多選択 chip 群は `role="group"` + 各 chip は `aria-pressed` で選択状態を提示。

### NFR-7-4: パフォーマンス

- /feedback/[id] の初期描画は SavedRecipe を 1 件 onSnapshot で購読するだけ
  (Slice 4 と同じパターン)。3G で 2 秒以内に hero まで描画できる想定。
- 保存操作は 1 回の Firestore updateDoc、Cloud Run は介在しない。

### NFR-7-5: 観測性

- Slice 6 で入れた Cloud Trace は **特別対応不要** (BFF 経由しないため)。
- Cloud Logging に `feedback.saved` などのイベント log は出さなくてよい (PII を含む可能性回避)。

## 5. 受け入れ条件 (Definition of Done)

| # | 条件 |
|---|---|
| AC-1 | 詳細画面で保存済レシピに対し「作ってみる」ボタンが表示され、押すと `/feedback/[id]` に遷移する |
| AC-2 | `/feedback/[id]` で ★ + 観点別 + 3 種チップを編集でき、「記録して〜」CTA で Firestore に保存される |
| AC-3 | 保存後、`/journal` に該当レシピが ★ 付きで現れる。`/library` のカード UI は変更されない |
| AC-4 | 同じレシピで再度 `/feedback/[id]` を開くと、前回の値が初期表示される (編集再開可) |
| AC-3b | `/library` ↔ `/journal` を相互に行き来できる (画面上のリンク + AvatarButton メニュー) |
| AC-5 | 未認証ユーザは `/feedback/[id]` を開けず SignInModal が起動する |
| AC-6 | 未保存 (= ハート未押下) のレシピで「作ってみる」を押しても遷移せず Toast 案内 |
| AC-7 | 既存 449 tests + 232 pytest + rules tests がすべて green |
| AC-8 | 新規 30 行以上のテスト追加 (FeedbackClient レンダリング + saveFeedback ユニット) |
| AC-9 | キーボードのみで観点別評価 5 段階を変更でき、スクリーンリーダで値が読まれる |
| AC-10 | main push で GitHub Actions が走り、Cloud Run の Web service が自動更新される |
| AC-11 | v0.7.0 タグ push 済 / README + docs/architecture.md を更新 |

### FR-7-6: フィードバック保存後の遷移先

- `/feedback/[id]` で「記録して〜」CTA 押下 → 成功 Toast → **`/journal` に遷移**
  (保存帳ではなく振り返り帳に着地、記録が反映されたことを直接見せる)

### FR-7-7: 統一 HeaderRow コンポーネント + Dropdown メニュー

ルートが /library + /journal + /feedback と増えるため、画面間の行き来を
**統一されたヘッダ + ドロップダウン** に集約する。

- 新規コンポーネント `HeaderRow` を導入 ([`design/slice4-screens.jsx` HeaderShowcase](../../design/slice4-screens.jsx) 準拠)。
  構成: **左: BackChip (←) / 中央: 画面タイトル / 右: AvatarButton + chevron**
- AvatarButton の挙動を「クリックで即 /library」から **「クリックでドロップダウン展開」** に変更:
  - 未サインイン → 既存どおり「サインイン」テキストリンク (popup 起動)
  - サインイン済 → Avatar + chev、クリックでメニュー展開
    - ユーザ情報行 (displayName + email)
    - 📔 **ピザ帳 (保存)** → /library
    - 📓 **振り返り帳 (作った)** → /journal
    - サインアウト (muted)
- 適用範囲: /library / /journal / /feedback / /recipes / /local / /ingredients / /candidates
  (= AvatarButton を出している全画面)
- TOP (/) はヒーロー特例で適用しない (既存と同じ右上 AvatarButton 単体配置で OK)。
  ヒーロー画面に back chip + タイトルを足すと意匠が崩れるため除外。

#### NFR (HeaderRow 関連)

- 既存の back ボタン (各 `<DetailClient>` / `<LibraryClient>` 等で `router.back()` を呼ぶ箇所)
  を `HeaderRow` に集約する。重複する back ボタンを画面側から削除。
- HeaderRow のタイトルは画面ごとに固定 (例: 「ピザ帳」「振り返り帳」「食材を選ぶ」「候補」「詳細」「フィードバック」)。
- Dropdown は **outside click / Esc キー** で閉じる。`role="menu"` + 各 item は `role="menuitem"`。
- ドロップダウンの z-index は SignInModal の下、Toast の下、トップに来すぎないように。

### FR-7-9: TOP refresh + ブランドマーク導入

Claude Design からの返答 ([`design/slice7-screens.jsx`](../../design/slice7-screens.jsx) `TopRefresh` /
`BrandMarkShowcase` / [`design/pizza-tokens.jsx`](../../design/pizza-tokens.jsx) `FurusatoMark`)
に基づき、TOP 画面の刷新とブランドマークの確立も Slice 7 で実装する。

#### ブランドマーク (FurusatoMark コンポーネント)

- **採用案**: 変型 B — **円窓ピザ + 和印「ふ」** ([`design/pizza-tokens.jsx`](../../design/pizza-tokens.jsx) `MarkB` @ L286)
  - 六方対称のチーズ + ペパロニ + バジル + 右下に朱の「ふ」印
  - 朱 (`T.shu`) + 生成り (`T.kinari`) + ピザパレット (`PIZZA_PAL`) のみ、グラデなし
- **16px 以下のフォールバック**: 変型 A — **和印「ふ」のみ** (`MarkA` @ L272)
  - 細部脱落を避けるため `FurusatoMark variant={size <= 18 ? 'A' : 'B'}` で自動切替
- **Wordmark 3 種** (`Wordmark` @ L394): horizontal / stacked / vertical
- **共通制約**:
  - 色: `T.shu` (朱) + `T.kinari` (生成り) のみ。ダーク背景時は反転
  - クリアスペース: 印章のフチからアートボード端まで ≧ 0.1 × W
  - App Icon 用: 背景に和紙テクスチャ、印は中央 70% (Apple HIG safe zone 準拠)

#### TOP refresh ([`design/slice7-screens.jsx`](../../design/slice7-screens.jsx) `TopRefresh` @ L1205)

- 画面上部に **FurusatoMark variant B (size 104)** をヒーロー装飾として配置
- ブランドキャプション「**ふるさとピザ帳** / FURUSATO PIZZA-CHŌ」を中央に併記
- タグライン「未来の一枚は、あなたの地元にある。」は維持
- 既存 CTA 「始める →」 + 「サインインしてピザ帳を開く」リンクのレイアウト更新
- 既存の 3 つの strategy seal 装飾は **削除** (新規ブランドマークで置換)

#### Favicon / OG image / metadata

- favicon に変型 A (16/32px) を導入 (`app/icon.png` or `app/favicon.ico`)
- `app/layout.tsx` の `metadata.title` を「ふるさとピザ帳」に
- OG image の更新は Slice 8 以降 (Slice 7 では metadata 文言のみ)

### FR-7-8: サービス名を「ふるさとピザ帳」に確定

これまで仮称として `Make Local Pizza Recipe Agent` (リポジトリ名そのまま) を
使ってきたが、Slice 7 で HeaderRow が常駐タイトルを持つに当たり、
正式サービス名を **「ふるさとピザ帳」** (読み: *Furusato Pizza-chō*) に確定する。

#### 反映箇所

| 場所 | 変更 |
|---|---|
| `NEXT_PUBLIC_APP_NAME` (.env.production / .env.example) | `"ふるさとピザ帳"` |
| `app/layout.tsx` `metadata.title` | `"ふるさとピザ帳"` |
| TOP ヒーロー上部の eyebrow / brand 表記 | 「ふるさとピザ帳」表示 (デザイン側で詳細) |
| README.md ヘッダ | サブタイトルとして「ふるさとピザ帳 / Make Local Pizza Recipe Agent」併記 |
| `docs/product-requirements.md` 等の永続ドキュメント | プロダクト名を更新 |
| HeaderRow タイトル (各画面) | 画面固有タイトルを表示するため、サービス名はメニュー側にのみ |

#### 変更しないもの

- リポジトリ名 `MakeLocalPizzaRecipeAgent` (GitHub URL 変更が痛い)
- GCP プロジェクト ID `makelocalpizzarecipeagent` (Cloud Run URL 等への影響大)
- package.json `name: make-local-pizza-recipe-agent` (パッケージ識別子は技術名のまま)
- `mlpr-*` 系のリソース prefix (Terraform 全 SA / AR / Bucket 等の rename はコスト過大)

サービス名 = 表向きのブランド / 内部識別子 = 既存の技術名 という二層構成で進める。

### FR-7-10: デザイン受領を反映したインタラクション仕様 (確定)

Claude Design の `slice7-screens.html` 内 `SpecCard` ([`design/slice7-screens.html`](../../design/slice7-screens.html) L142〜)
で詰められたインタラクション仕様を、本要件として固定する。

| 部位 | 仕様 |
|---|---|
| **Overall ★** (1〜5) | タップで該当 ★ まで一括点灯。同じ ★ を再タップで **0 にクリア**。半星 / ドラッグなし。キーボードは 1〜5 数字キー + ←→ で増減 + 0 でクリア。値 0 のとき CTA disabled |
| **観点別評価ドット** (味 / 見た目 / ストーリー / また作りたい) | 5 つの ● をタップで「その位置まで点灯」。同じ位置 ● を再タップで **1 段戻す** (n→n-1)。←→ で増減 / Home/End で 0/5 |
| **多選択チップ** (効いた点 / 次は調整したい / ゲストの反応) | タップ toggle、wrap (横スクロールしない)、塗りトーンは matcha / yamabuki / shu 踏襲、**各群上限 6 個** (7 個目で aria-disabled + Toast「6 個までです」)、見出し右に選択数 (0 のときは非表示) |
| **ゲスト数** | デフォルト `—` (未入力)、`−` / `+` で 1〜20。0 と空の区別なし、必須ではない |
| **下書き保存** | **明示的「下書き」ボタンは廃止**。3 秒 debounce で localStorage に自動保存、サインイン中は同時に Firestore `users/{uid}/drafts/{recipeId}` に upsert。ヘッダ下に「自動保存 12 秒前」を表示。submit 成功時に draft を破棄 |
| **カメラ** | アイコン表示 + 「準備中」バッジ。タップで info Toast「写真の添付は Slice 8 で対応します」。Slice 7 では no-op |
| **HeaderRow Dropdown** | Avatar+▾ クリックで展開、▾↔▴ 切替。外側クリック / Esc / 項目選択 / Avatar 再タップで閉じる。`role="menu"` + 各行 `role="menuitem"`、↑↓ 巡回、Enter で確定、初期 focus は 1 行目 (ピザ帳)、現在ルートに朱の縦バー + 薄塗り |
| **保存帳 ⇄ 振り返り帳 cross-link** | 両画面の hero 直下に小さな `CrossLink` ピル (相互配置)。ピル中の数字は実カウント |
| **作った vs ハート** | フィードバック保存 (= 「作った」) はハート保存と **独立**。ハートなしでも振り返り帳に載る。ただし保存帳カードには「作った」サブバッジ (matcha 色のドット + テキスト) を出す |

### FR-7-11: Firestore 下書き subcollection 追加

FR-7-10 の自動保存仕様に伴い、下書き用の Firestore 構造を追加:

- パス: `users/{uid}/drafts/{recipeId}` (recipeId = candidateId)
- shape: FR-7-4 の `feedback` と同じ shape を持つ partial (各フィールド optional)
- Security Rules: `users/{uid}/drafts/{recipeId}` も本人のみ R/W (savedRecipes と同じパターンを追加)
- ライフサイクル:
  - フィードバック画面で値が変わるたびに 3 秒 debounce で `setDoc({merge: true})` (サインイン中のみ)
  - submit 成功時に `deleteDoc(drafts/{recipeId})`
  - `/feedback/[id]` 開いた時は **saved feedback を優先**、なければ draft、なければ空

## 6. スコープ外

明示的に **やらないこと**:

- ❌ 画面の写真添付 (Cloud Storage upload) — 将来 Slice 8+ で検討。
  デザインのカメラアイコンは表示するが押下は no-op + Toast 予告のみ。
- ❌ Vertex AI Gen AI Evaluation 連携 — 別 Slice (旧 Slice 7 計画を Slice 8 に持ち越し)。
- ❌ フィードバックを次回 Gemini prompt に反映 — 同上、別 Slice。
- ❌ 「ゲストの反応」「効いた点」のタグ集計 / ダッシュボード — 集計が必要になる規模では
  まだないし、別 Slice。
- ❌ Bottom Tab Bar (`デザインの ScreenSaved` 下部 3 タブ「つくる/ピザ帳/振り返り」) —
  現状の AvatarButton + 既存導線を維持する。Bottom Nav 導入は別 Slice (UI 全面刷新になる)。
- ❌ 自由記述 (`note` フィールド) の入力 UI — schema には予約するが UI は持たない。

## 7. 制約事項

- C-1: Firebase Auth サインイン必須 (匿名はサポートしない)
- C-2: Security Rules は既存の `users/{uid}/savedRecipes/{candidateId}` のものを再利用
  (本人のみ R/W)。新ルールを書かないことで複雑度を増やさない
- C-3: 1 レシピ 1 フィードバック (上書き型)。履歴は持たない
- C-4: フィードバックの公開 / シェアはなし (private)

## 8. リスクと対応

| リスク | 影響 | 対応 |
|---|---|---|
| 5 段階バーの UX が分かりにくい (タップで増減か、ドラッグか) | UX 劣化 | タップで上昇 + 0 タップで 0 戻り、または ←→ ボタン併設。design.md で確定 |
| 既存 SavedRecipe の Slice 6 で詳細 hydrate に追加した shape と feedback が衝突 | データ壊れ | hasFullSnapshot とは別の `hasFeedback()` ヘルパで分離 |
| フィードバック保存後の Toast / 遷移先の UX | デザインに明記なし | 「記録しました」Toast → `/library` へ自動戻りで OK と仮置き |
| デザインに「下書きを保存」リンクがあるが Slice 7 では本保存だけ | 仕様乖離 | Slice 7 では「下書きを保存」リンク非表示 or 同じ動作にする (design.md で決定) |

## 9. 参照

- [`design/pizza-screens.jsx` ScreenFeedback](../../design/pizza-screens.jsx) — フィードバック画面の意匠
- [`design/pizza-screens.jsx` ScreenSaved](../../design/pizza-screens.jsx) — ピザ帳カード ★ 表示の参考
- [`docs/product-requirements.md`](../../docs/product-requirements.md) — プロダクト全体要求
- [Slice 6 ステアリング](../20260520-slice6-deploy/) — 本 Slice の前提となるデプロイ基盤
- [`src/domain/saved-recipe.ts`](../../src/domain/saved-recipe.ts) — SavedRecipe 型 (拡張対象)
