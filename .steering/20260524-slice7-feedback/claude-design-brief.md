# Claude Design 依頼書 — ふるさとピザ帳 / Slice 7 追加画面

> 「ふるさとピザ帳」(技術名: MakeLocalPizzaRecipeAgent) の Slice 7 で
> 新規追加する 4 つの画面・コンポーネントのデザインを依頼します。
> Slice 1〜6 まで本番稼働 (https://mlpr-web-343527548585.asia-northeast1.run.app)、
> Slice 7 はこれから実装。

## サービス概要 (前提)

- 地元 / 旬の食材を活かしたピザレシピを提案する Web アプリ
- Quick Tap UX: 地元 → 食材 → 候補3案 → 詳細 → ハート保存
- 戦略軸: 王道 (exploit, 朱) / 一歩外す (tune, 黄柏) / 大冒険 (explore, 鴬)
- デザイントーン: **和モダン** (washi テクスチャ・明朝 + ゴシック + モノ・墨と朱を主軸)
- ターゲットユーザー: ピザパーティを主催するホスト (3-8 名規模)
- サービス名: **「ふるさとピザ帳」** (2026-05-24 確定、`design/` の "MakeLocalPizzaRecipeAgent" 表記は読み替え)

## 既存デザイン資産 (確認・流用してほしい)

| ファイル | 何があるか |
|---|---|
| [`design/pizza-tokens.jsx`](design/pizza-tokens.jsx) | T.washi / T.kinari / T.sumi / T.shu / T.matcha / T.yamabuki / T.exploitInk / T.exploitBg 等のカラートークン + T.mincho / T.gothic / T.mono のフォントトークン |
| [`design/pizza-screens.jsx`](design/pizza-screens.jsx) | Tap1 (地元) / Tap2 (食材) / Loading / Candidates / Detail / **ScreenFeedback** (L618) / **ScreenSaved** (L724) のキャンバス。Phone wrapper / Chip / ShuButton / Pizzas (SVG イラスト) のヘルパー含む |
| [`design/slice4-screens.jsx`](design/slice4-screens.jsx) | TOP / SignIn / Library カード / **HeaderShowcase** (L134) Avatar + Dropdown ヘッダパターン |
| [`design/prototype-app.jsx`](design/prototype-app.jsx) | 動くプロトタイプ統合版 |

## 依頼内容 — Slice 7 で新規 / 改修する 4 + 1 画面

### 1. 統一 HeaderRow コンポーネント (★ 最優先 ★)

**現状**: 各画面右上に AvatarButton 単体が浮いているだけ。クリックで /library に直行。
**要望**: 全画面 (TOP 除く) で共通の HeaderRow を導入。

`slice4-screens.jsx` の `HeaderShowcase` (L134) と `HeaderRow` (L222) がベース。
追加要件:

- **構成**: 左 = BackChip / 中央 = 画面タイトル (明朝、固定文言) / 右 = Avatar + chevron
- **Dropdown 展開時** (Avatar クリック) のメニュー項目:
  1. ユーザ情報行 (Avatar + displayName + email)
  2. 📔 **ピザ帳 (保存)** → /library (※下記 §2 と §3 参照、2 ルートに分けます)
  3. 📓 **振り返り帳 (作った)** → /journal
  4. (区切り線)
  5. サインアウト (muted)
- **タイトル例** (画面ごとに固定):
  - /library → 「保存帳」 (or 「ピザ帳 (保存)」)
  - /journal → 「振り返り帳」 (or 「ピザ帳 (振り返り)」)
  - /feedback/[id] → 「フィードバック」
  - /recipes/[id] → 「詳細レシピ」 (現状ヘッダなし → どう載せるか提案ほしい)
  - /local → 「地元を選ぶ」 (現状ヘッダなし)
  - /ingredients → 「食材を選ぶ」
  - /candidates/[id] → 「候補3案」
- **欲しい状態**:
  - 未サインイン (Avatar = 「サインイン」リンク)
  - サインイン済・閉
  - サインイン済・Dropdown 展開
  - hover / pressed 状態
- **アクセシビリティ**: outside click / Esc で閉じる、`role="menu"` 想定

### 2. /library = 「保存帳」(既存カードは原則維持)

ハートで保存したレシピ一覧 (savedAt 降順)。Slice 4 で実装済の
[`slice4-screens.jsx` LibraryScreen + LibraryCard](design/slice4-screens.jsx) が現状デザイン。

**Slice 7 で変えたいのは:**

- ヘッダを HeaderRow に置き換え (タイトル「保存帳」)
- カード本体 (ハートアイコン + タイトル + 戦略バッジ + 地名 + 日付) は **維持** (★ は付けない)
- 上部のミニコピー (eyebrow) を「保存したアイデア」「これから作る 1 枚」など振り返り帳と並列性が出る形に
- /journal への横断リンク (「→ 振り返り帳へ」のような小さなリンク or ピル) を相互に配置
- 「振り返り帳」と並列の関係性 (ハート vs 作った記録) が一目で分かるように

### 3. /journal = 「振り返り帳」(新規画面、★ 表示あり)

**フィードバックを記録したレシピのみ** を一覧する新ルート。

ベースは [`pizza-screens.jsx` ScreenSaved](design/pizza-screens.jsx) (L724) の
**★ 付きカード** + Stat (保存数 / 作った数 / 平均★) パターンを流用したい。

**欲しい構成要素:**

- HeaderRow (タイトル「振り返り帳」)
- Eyebrow: 「あなたが作った 1 枚たち」など (要提案)
- **Stat バー**: 作った数 / 平均 ★ / 効いた点 Top タグ など (3 つくらい)
- カード:
  - 既存のピザ画像 (saved imageUrl)
  - 戦略バッジ (王道/一歩外す/大冒険)
  - タイトル
  - 地名 + 作った日 (cookedAt = feedback.updatedAt)
  - ★ 評価 (overallRating、黄柏色、値表示)
  - ハートアイコンは **出さない** (振り返り帳の文脈ではノイズ)
- 並び順: cookedAt 降順
- /library への横断リンク
- **欲しい状態**: 0 件 (空) / 1 件 / 3-5 件 / 多数

**任意 (あったら嬉しい):**
- フィルタチップ (戦略軸別 / 地元別 / ★ 4 以上)
- カードに「効いた点」タグを 1〜2 個ちらっと見せる小さな表示
- 観点別評価 (味 / 見た目 / ストーリー / また作りたい) を ミニバーで横並び表示

### 4. /feedback/[id] = フィードバック記録画面

[`pizza-screens.jsx` ScreenFeedback](design/pizza-screens.jsx) (L618) が下敷きですが、
**インタラクション仕様** が不確かなので詰めてほしい:

- **Overall ★** (1〜5): タップで 1 つずつ点灯? ドラッグ可? 半星はなし。0 が許容されるか
- **観点別評価** (味 / 見た目 / ストーリー / また作りたい — 5 段階バー):
  - design は表示のみだが、入力 UX をどうするか (バーをタップ? +/- ボタン? ドット 5 個タップ?)
  - キーボード操作可能性 (←→ で増減)
- **多選択チップ** (効いた点 / 次は調整したい / ゲストの反応):
  - 選択 / 非選択の塗りトーン (matcha / yamabuki / shu 既存トーンで OK)
  - スクロール対応 (横スクロール? wrap?)
- **画面構成**:
  - HeaderRow (タイトル「フィードバック」)
  - eyebrow「作ってみた」+ headline「今夜の一枚は、どうでしたか？」
  - mini hero (画像 + タイトル + 日時 + Overall ★)
  - カメラアイコン (Slice 7 では no-op、UI 上は出すが押下時「準備中」案内 Toast)
  - 観点別評価カード
  - 効いた点 / 次は調整したい / ゲストの反応 のチップ群
  - ゲスト数入力 (optional、design には「ゲスト 4 名」表記あり、small input?)
  - 「記録して次の提案に活かす」CTA (画面下、ShuButton)
- **欲しい状態**:
  - 初回入力 (空)
  - 編集再開 (前回値が入った状態)
  - 保存中 (CTA の loading)
  - 「下書きを保存」リンク (design 右上にあったが、Slice 7 でやるかは未定 — 提案ほしい)

### 5. (任意) 詳細画面の「作ってみる」CTA 追加

/recipes/[id] の既存レイアウト (RecipeHero + body + StoryCard) に
**「作ってみる」CTA** を 1 つ追加したい。

- どこに置くか (Hero の中? StoryCard 下? 既存ハートの近く?)
- どのスタイル (ShuButton? matcha 系? Ghost?)
- サインイン未済 / ハート未押下時の disabled 表示

design 提案 1〜2 案ほしい (現状 design の DetailScreen に近い位置で OK)。

### おまけ: TOP のブランド露出

[`design/MakeLocalPizzaRecipe.html`](design/MakeLocalPizzaRecipe.html) の TOP に
「ふるさとピザ帳」のブランド名表示が無い。ヘッダのキャプションに小さく入れたい。
タグライン「未来の一枚は、あなたの地元にある。」は維持。

## 制約 / 注意事項

- **トークン体系** (`design/pizza-tokens.jsx`) を遵守。新色は追加しない方向で
- **明朝 = 余韻 / ゴシック = 機能 / モノ = メタデータ** の使い分けを継続
- 既存パターン (`Phone` / `BackChip` / `Chip` / `ShuButton` / `Stat`) を再利用、新規コンポーネントは最小限
- iOS frame 想定 (393 × 852)、SAFE_TOP / SAFE_BOT は既存値
- バックエンド連動部分 (Firestore schema 等) は steering の
  [`requirements.md`](.steering/20260524-slice7-feedback/requirements.md) を参照
  (feedback shape は overallRating + axes 4 + chips 3 系列 + cookedAt / updatedAt)

## 期待する成果物

1. **`design/slice7-screens.jsx`** に以下のキャンバスを並べる:
   - HeaderShowcase v2 (3 状態 + dropdown 開閉)
   - LibraryRefresh (HeaderRow + 横断リンクのある保存帳)
   - JournalEmpty / JournalList (振り返り帳 0 件 + 数件)
   - FeedbackEmpty / FeedbackFilled (新規 + 編集再開)
   - DetailCTAShowcase (作ってみる ボタンの 2 案提案)
2. (任意) `design/slice7-screens.html` で簡易プレビュー
3. デザイン上で確定したインタラクション仕様 (★ の入力 / 観点別評価バーの操作 / Dropdown の挙動 / 下書き機能の扱い)
   をコメント or マークダウンで返してもらえると実装に取り込みやすい

## 参考リンク

- 公開 URL (現状の Slice 6 まで): https://mlpr-web-343527548585.asia-northeast1.run.app
- 永続要件: [`docs/product-requirements.md`](docs/product-requirements.md)
- 永続機能設計: [`docs/functional-design.md`](docs/functional-design.md)
- 用語集: [`docs/glossary.md`](docs/glossary.md) (ふるさとピザ帳 / 戦略軸 / etc.)
- Slice 7 要件: [`.steering/20260524-slice7-feedback/requirements.md`](.steering/20260524-slice7-feedback/requirements.md)
- 姉妹プロジェクト (デザインベースの初期版): https://github.com/sugimomoto/MakePizzaRecipeAgent

よろしくお願いします!
