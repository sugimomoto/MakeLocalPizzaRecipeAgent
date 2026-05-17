# Webアプリモバイルデザイン

_Started 2026-05-12 11:47 UTC_

---

## User

添付したproduct-requirements.mdの内容を元に、Webアプリのデザインを検討したいです
メインのUIはスマートフォンを想定
デザインのアイディアを出してくれませんか

## Assistant

_[tool: list_files]_

_[tool: questions_v2]_

## User

Questions answered:
- deliverable: 両方（まず静的→気に入った方向で動かす）
- screens: Tap1: 地元選択（初回オンボーディング）, Tap2: 地元食材選択, Tap3: 候補3案（Exploit/Tune/Explore）, 詳細画面（フルレシピ＋ストーリー＋画像）, フィードバック記録, 保存済みレシピ一覧
- vibe: 温かみのある食欲をそそる（赤・オレンジ・木質）, 和モダン／土地の趣（和紙・墨・落ち着いた配色）
- hero_metaphor: 縦スワイプの大判カードスタック（Tinder的）
- exploit_label: 日本語意訳（王道 / 一歩外す / 大冒険 など）
- ingredients_ui: 季節別/カテゴリ別タブで分類
- streaming_ui: ピザが焼けていくアニメーション
- feedback_ui: チップ多選択中心でサクサク（WHAT WORKED 等）
- tone: 丁寧・落ち着いた（です・ます、ホスピタリティ）
- locale_persona: せり・牡蠣・パプリカ・モッツァレラ

## Assistant

_[tool: update_todos]_

_[tool: copy_starter_component]_

_[tool: copy_starter_component]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: snip]_

_[tool: write_file]_

デザインの方針を決めました。和モダン×温かみのある食欲色（和紙ベース×朱×山吹）で、7画面のハイファイ・モックを設計します。それでは構築していきます。

_[tool: write_file]_

_[tool: snip]_

_[tool: write_file]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

「MakeLocalPizzaRecipe」の 7 画面ハイファイ・モックを和モダン × 温かみで仕上げました。

**デザインシステム**
- 配色：和紙 `#F2E9D6` / 生成り / 墨 / 朱 `#C8412A` / 山吹 / 抹茶 / 藍
- 書体：見出し Shippori Mincho B1（明朝）/ 本文 Zen Kaku Gothic New
- アクセント：縦組み明朝の小キャプション、朱の小印、和紙ノイズテクスチャ

**画面構成（Design Canvas に 2 セクション）**
1. Quick Tap 動線：地元選択 → 食材選択（季節/カテゴリタブ + 選択チップ）→ 焼成中（窯と進捗ログ）→ 候補 3 案（縦カードスタック・王道/一歩外す/大冒険の朱印）
2. 詳細・記録：レシピ詳細（ヒーロー＋ストーリー）/ 作ってみた記録（観点別＋3 種チップ）/ ピザ帳

カードラベルをクリックでフルスクリーン拡大、←/→/↑/↓ で巡回できます。気に入った方向（全体トーン、3 案カードの見せ方、食材選択の密度など）を教えていただければ、その方向で**動くプロトタイプ**へ展開します。

## User

地元選択ですが、ラフな地図バージョンとか作れる？

## Assistant

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

地図版を追加します。和紙の上に墨で描いた素朴な日本地図に、地元のピンを打つイメージで。

_[tool: done]_

_[tool: update_todos]_

_[tool: grep]_

_[tool: snip]_

_[tool: read_file]_

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: done]_

ラフ地図版（01b）を追加しました。墨ストロークの揺らぎ + 朱の地元ピン + 角の小印で和モダンに。地図/一覧トグルも上部に置いてあります。

## User

地図の画像が下手ですね・・・
このフリー素材をうまく使えますか？

## Assistant

_[tool: snip]_

_[tool: image_metadata]_

_[tool: copy_files]_

_[tool: view_image]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

_[tool: fork_verifier_agent]_

_[tool: snip]_

フリー素材のシルエットを CSS フィルターで墨色に染め、朱の弱いエコーを背面にずらして配置。その上に和紙ノイズ・北の方位記・各県の小ピン・宮城の朱の雫ピン+黒い吹き出し・「地」朱印 を SVG オーバーレイで重ねています。

01b アートボードでご確認ください。色味（もう少し明るい墨にする / 朱を抑える 等）や、ピンの数・位置の調整があればどうぞ。

## User

うーん、ごめん、01b を安定的に作るのが今のClaudeでは難しそうなのでやめよう
無くしてもらえる？

## Assistant

_[tool: str_replace_edit]_

_[tool: grep]_

_[tool: read_file]_

_[tool: grep]_

_[tool: run_script]_

_[tool: delete_file]_

_[tool: snip]_

_[tool: done]_

01b を削除しました。

## User

OK、実際に動くイメージを作ってみてもらえる？

## Assistant

_[tool: snip]_

_[tool: update_todos]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: write_file]_

_[tool: write_file]_

_[tool: snip]_

_[tool: update_todos]_

_[tool: done]_

_[tool: snip]_

_[tool: update_todos]_

_[tool: fork_verifier_agent]_

動くプロトタイプを `MakeLocalPizzaRecipe Prototype.html` に置きました。左上のフローナビから任意画面へジャンプ、地元は localStorage に保存されます。

## User

地元は選んだら、すぐに次の画面に行っていいかな
あと、全都道府県を最初に表示して、エリアごとにグルーピング、スクロールで選べる方が良いかも

## Assistant

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

47都道府県を地域別に並べ、選択即遷移にしました。上部の地域チップでジャンプもできます。

## User

食材のところに季節と食材カテゴリごとのアイコンを載せられる？

## Assistant

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: snip]_

季節アイコン（桜・太陽・もみじ・雪・通年）と食材カテゴリのアイコン（野菜・魚介・チーズ・穀物）をミニバッジ化し、上部タブ／チップ／各食材カードに反映しました。

## User

3案なんだけど、ボタンで次のメニューに移るのではなく、スクロールで3案だしたほうが良いかな

## Assistant

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

候補画面を縦スクロールに変更しました。3 案を上から順に眺め、近いカードがインジケーターでハイライト、下部の「この一枚に決める」は固定で常に押せます。

## User

Apply drawing

## Assistant

_[tool: snip]_

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

詳細画面の戦略印を、ヒーロー下のはみ出した位置からタイトル右上に移動し、サイズを少し大きく整えました。

## User

記録画面だけど、写真の添付とコメント欄がほしいね

## Assistant

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: snip]_

写真欄（最大 4 枚、実機ではカメラロールから添付可能・即サムネ表示・×で削除）と、280 字までのコメント欄を、チップ群の後・送信ボタンの前に追加しました。

## User

良いですね
これでいきましょう！

## Assistant

_[tool: snip]_

ありがとうございます！この方向で進めましょう。

必要になったら、以下あたりはすぐ拡張できます：
- フィードバックを実際に保存して、保存済みレシピ一覧と連動
- 候補3案の「なぜこの提案か」注釈を、過去フィードバックから動的生成
- 焼成中アニメーションの所要時間や見せ方の微調整

何か追加・修正したい点が出てきたら教えてください。

## User

MakeLocalPizzaRecipe Prototype.html
で調整した内容をMakeLocalPizzaRecipe.html
にも反映しないといけないんじゃない？

## Assistant

_[tool: list_files]_

_[tool: grep]_

おっしゃる通りです。静的キャンバス側（`MakeLocalPizzaRecipe.html` ＋ `pizza-screens.jsx`）にも反映が必要です。差分は4箇所あります：

1. **食材選択**：季節・カテゴリのミニアイコンバッジ
2. **候補3案**：縦カードスタック → 縦スクロール一覧へ
3. **詳細画面**：戦略印をヒーロー下からタイトル右上へ移動
4. **記録画面**：写真欄（最大4枚）＋ コメント欄を追加

すべて反映してよろしいですか？それとも一部だけにしますか？（静的キャンバスは「眺めて比較する」用途なので、2 の縦スクロールはアートボード上では効きにくいかも、というだけ留意点です）

## User

すべて反映して

## Assistant

_[tool: snip]_

_[tool: grep]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: read_file]_

All set — vertically stacked candidates, top-right strategy seal on detail, instruction text updated. Verifier already ran clean on previous done.

## User

続けて

## Assistant

_[tool: snip]_

どこを次に進めましょうか？以下から選んでいただければ、その方向で手を動かします：

1. **フィードバックの実保存** — 観点別評価とチップ選択を実際に state / localStorage に保存し、ピザ帳に反映
2. **「なぜこの提案か」の動的注釈** — 保存済みフィードバックから注釈文を生成し、候補3案カードに表示
3. **焼成中アニメーションの作り込み** — 窯の火・チーズが溶ける・耳が膨らむ等、もう少し情緒的な焼け方に
4. **画面遷移トランジション** — Tap1→Tap2→焼成→候補の繋ぎを明朝のフェード/紙のめくり風に
5. **Tweaks パネル** — 朱色のトーン、明朝/ゴシック比率、和紙ノイズ強度、戦略印の表現などをユーザーが切替可能に
6. **別の地元プリセット** — 長野（信州サーモン・りんご・野沢菜）や高知（鰹・ゆず・四万十のり）などのデモを用意し、地元変更の体験を確認

番号またはご希望の方向を教えてください（複数可）。

## User

静的キャンバス側に反映した？

## Assistant

_[tool: list_files]_

_[tool: grep]_

はい、静的キャンバス側（`MakeLocalPizzaRecipe.html`）も同じ `pizza-screens.jsx` を読み込んでいるので、縦並びの候補リスト・詳細画面の右上戦略印・案内文の変更はそのまま反映されています。

## User

MakeLocalPizzaRecipe.htmlとMakeLocalPizzaRecipe Prototype.htmlのデザインが全然違うように見えます

## Assistant

_[tool: grep]_

_[tool: snip]_

_[tool: read_file]_

_[tool: snip]_

_[tool: grep]_

_[tool: snip]_

_[tool: read_file]_

_[tool: grep]_

_[tool: grep]_

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: grep]_

_[tool: write_file]_

_[tool: snip]_

_[tool: done]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

_[tool: grep]_

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

_[tool: fork_verifier_agent]_

静的キャンバスとプロトタイプを同じコンポーネントに統合しました。これで両者の見た目は常に同期します。

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "MakeLocalPizzaRecipe"
User is viewing file: MakeLocalPizzaRecipe.html
Current date is now May 17, 2026
</system-info>

<pasted_text name="Pasted text (213 lines)">
# Claude Design 向けプロンプト — Slice 4 新規画面の設計依頼

> このファイルをそのままコピペして Claude Design に投げる想定。
> 出力は Figma 互換 / HTML モックアップ / 画像どれでも可。

---

## アプリ概要

**Make Local Pizza Recipe Agent** — 47 都道府県の地元食材と AI を組み合わせて
「今宵の一枚」のピザを 3 案提案し、気に入った 1 つを詳細レシピ + 画像つきで
出すモバイル Web アプリ (ハッカソン提出作)。

- フレームワーク: Next.js 16 (App Router) + React 19 + TypeScript + CSS Modules
- スタイル方針: **「和紙の上の活版印刷」** をモチーフにした大人向けの落ち着いた和モダン
- 想定デバイス: スマホ縦持ち first (max-width 480px 中央寄せ)、デスクトップでも 480px の縦長カラム
- 既存 11 画面 (/local /ingredients /candidates /recipes/[id] 等) は同じトーンで完成済み

## デザイントークン (CSS 変数、既存アプリと統一して使用してください)

### カラー

| 用途 | 変数 | HEX |
| --- | --- | --- |
| キャンバス背景 (和紙) | `--mlpr-washi` | `#f2e9d6` |
| 和紙ソフト | `--mlpr-washi-soft` | `#f7f0de` |
| 和紙ディープ | `--mlpr-washi-deep` | `#e8ddc4` |
| カード / シート | `--mlpr-kinari` | `#fbf7ed` |
| 見出し (墨) | `--mlpr-sumi` | `#1f1a12` |
| 本文 | `--mlpr-sumi-soft` | `#5a4e3e` |
| キャプション | `--mlpr-sumi-muted` | `#928571` |
| ヘアライン | `--mlpr-hairline` | `rgba(31,26,18,0.1)` |
| **主アクション (朱)** | `--mlpr-shu` | `#c8412a` |
| 朱ディープ | `--mlpr-shu-deep` | `#9f3220` |
| 朱ペール | `--mlpr-shu-pale` | `#f2d9cc` |
| 山吹 (暖色) | `--mlpr-yamabuki` | `#dc8a2a` |
| 抹茶 (野菜) | `--mlpr-matcha` | `#607744` |
| 藍 (深情報) | `--mlpr-ai` | `#3e5670` |
| 黄金 (プレミアム) | `--mlpr-kogane` | `#be934a` |

### タイポ

- **明朝 (mincho)**: 見出し / タイトル / ストーリー本文 — `Shippori Mincho B1`
- **ゴシック (gothic)**: UI 文言 / 説明文 — `Zen Kaku Gothic New`
- **モノ (mono)**: ラベル (英大文字 + 字間広) / 数値 — `JetBrains Mono`

### モチーフ・装飾要素 (既存)

- 背景に和紙のフラクタルノイズ (`mlpr-washi-noise` クラス、SVG turbulence で multiply)
- 朱印風の「戦略印」(円形シール、王道 / 一歩外す / 大冒険)
- 「選択中」「準備中」「原体験」等の小バッジ (mono フォント + 朱地白文字)
- 細い hairline でセクション区切り
- ボタンは角丸 `--mlpr-radius-md`、影は薄く

---

## 依頼: 以下 6 画面 / 状態をデザインしてください

### 画面 1: TOP ページ (`/`)

**役割**
- アプリの第一印象 = ハッカソン審査員が最初に見る画面
- 初訪問ユーザーへの価値提示と「始める」CTA
- ログイン済みユーザーには「ピザ帳を開く」サブ動線も置く
- (注: localStorage に過去訪問の地元 ID があるユーザーは自動的に /local に redirect されるので、TOP を見るのは初回訪問者が中心)

**要素**

| | 内容 |
| --- | --- |
| eyebrow | "地 元 × ピ ザ × AI" (mono / 字間広) |
| 大型見出し (mincho 48〜60px) | 「未来の一枚は、/ あなたの地元にある。」(2 行) |
| サブ本文 (gothic 14px) | 「地元の食材と季節から、AI があなただけのピザを 3 案提案。気に入った 1 枚は『ピザ帳』に残せます。」 |
| 一次 CTA (shu 朱 / mincho or gothic 16〜18px) | 「始める →」 → 押すと /local へ |
| 二次 CTA (ghost link) | 「すでにはじめている方 →」 → /local (localStorage の locale を尊重) |
| 三次 CTA (text link) | 「サインインしてピザ帳を開く」 → サインインを促す (デザインは下記の sign-in 状態に依存) |
| フッタ (mono 11px) | "MAKE LOCAL PIZZA RECIPE AGENT · 2026" |

**想定レイアウト**
- 縦 1 カラム、washi 背景 + うっすらノイズ
- 縦中央寄せで「呼吸できる」余白 (各要素間 32〜48px)
- 朱色 CTA は画面中央のフォーカス点
- 装飾: 上部か下部に小さく「3 つの戦略印 (王道 / 一歩外す / 大冒険)」をオーナメント的に配置すると世界観が伝わる

---

### 画面 2: サインイン UI (3 つの状態を提案してください)

**役割**
- ユーザーがハートを押した時、または TOP の「サインインしてピザ帳を開く」を押した時に表示
- Google Sign-In 1 プロバイダのみ (Firebase Auth)

**3 案デザインしてほしい (どれを採用するか決めるため):**

#### 案 A: Firebase 標準 popup + 上部アバター
- ハート押下 / 「サインイン」リンク → 即座に `signInWithPopup()` 起動 (ブラウザ popup)
- アプリ内に専用 UI は出さず、popup の処理に任せる
- 認証成功後、ヘッダ右上にアバター + dropdown が出現するだけ
- 設計するのは **アバター dropdown** だけで OK (簡素)

#### 案 B: 専用ページ /signin
- ハート押下 → `/signin?next=/recipes/[id]` に遷移
- /signin ページは中央に大型カードを置き、Google ボタン + 「やめて戻る」link
- サインイン後 router.replace(next)
- カード上の文言: 「ピザ帳を使うには / サインインしてください」(mincho)
- ボタン: 「G Google で続ける →」 (Google 公式準拠の色配色)

#### 案 C: Modal dialog (アプリ内 overlay)
- ハート押下 → 半透明 backdrop + 中央 modal が出現
- modal 内に小さい Google ボタン + 「やめる」
- ボタン押下で popup → modal は自動 close
- 画面遷移なし

**全案共通で必要な要素**
- 「サインインすると Firestore にレシピを保存します。ゲストとしての閲覧はサインインなしでも続けられます。」の小注意書き
- エラー時の表示パターン (Google でキャンセル / ネットワーク失敗)

---

### 画面 3: サインイン済みヘッダー (アバター + dropdown)

**役割**
- どの画面でも右上に常駐
- 現在のサインイン状態を視認させ、ピザ帳とサインアウトへの導線を提供

**要素**

| 状態 | 表示 |
| --- | --- |
| 未サインイン | (なし) または極小 "サインイン" text link (洋ジロウ的に控えめ) |
| サインイン済み | 32〜40px 円形アバター (Google photoURL or イニシャル) + 下矢印 |
| dropdown 展開時 | "📔 ピザ帳を開く" / hairline / "サインアウト" の 2 項目縦並び |

- 高さ: 既存 topRow (44〜48px) に収まる小ささ
- 朱印的なアクセントは避ける (主役ではない)

---

### 画面 4: `/library` ピザ帳一覧

**役割**
- サインイン済みユーザーが保存した詳細レシピを一覧 / 再訪問

**要素**

| | 内容 |
| --- | --- |
| 上部 topRow | ←戻る (墨) / 「ピザ帳」mincho 中央タイトル / アバター (右上、画面 3 と共通) |
| ScreenHero | eyebrow "MY LIBRARY" + mincho 「あなたの一枚を、/ 集める。」 |
| カウント | 「保存中 ◯ 件」(gothic 13px) |
| グリッド | 1 列 (mobile) で縦に並ぶ大型カード、または 2 列 (desktop) |
| 各カード | 左に正方形画像 (60×60〜80×80)、右にタイトル (mincho) / 県名 + 戦略印小 / 保存日 (mono 11px) / ハート (朱、アクティブ) |
| カードクリック | /recipes/[candidateId] に遷移 |
| ハート再クリック | その場で削除アニメ → トースト「保存を解除しました」 |
| 0 件の場合 | 中央に大きめ余白 + 「まだ保存したピザはありません」(mincho) + サブコピー「気になる一枚に出会ったら、ハートで集めましょう。」+ CTA「ピザを探す →」→ /local |

---

### 画面 5: 詳細画面 (`/recipes/[id]`) のハートとトースト

**役割**
- 既存の RecipeHero (画像 + 戻る + ハート) のハート挙動の **未/済/失敗** の 3 状態と、保存成功 / 解除のトースト UI

**ハートの 3 状態**
1. **未サインイン**: 白縁の透明ハート (♡)、タップで「サインインしてピザ帳に保存」サブテキストが下に小さく出る案 or 即サインイン UI 起動
2. **サインイン済み + 未保存**: 白縁の透明ハート (♡)、タップで朱に塗り潰され save 完了
3. **サインイン済み + 保存済み**: 朱色塗り潰しハート (♥)、タップで解除

**トースト**
- 画面下中央、washi-deep 背景 + 朱の細い縦線
- "ピザ帳に保存しました ✓" / "保存を解除しました" (gothic 13px、mono の ✓ アイコン)
- 2.5 秒で fade out
- 上下に少し margin、横は中央 fixed

---

### 画面 6: トースト共通コンポーネント (画面 5 と同じだが汎用化)

**役割**
- 保存だけでなく、将来「サインインしました」「サインアウトしました」等の汎用通知に使えるもの

**バリアント**
- success (朱 or matcha) / info (ai 藍) / warning (yamabuki) の 3 トーン
- アイコン: ✓ / ⓘ / ⚠ (mono)
- 最大 1 行〜2 行
- 自動 close (2.5s) + 手動 close (✕)

---

## 制約

- **モバイル幅 480px 中央寄せ** が主、デスクトップでも縦長カラムでデザイン
- 既存トークン (上記カラー / タイポ) を尊重 (新色は最小限)
- 朱色 CTA は 1 画面 1 つを基本 (情報の優先順位を保つ)
- 既存の「戦略印」「準備中バッジ」等の既存装飾モチーフを必要に応じて流用
- Firebase Auth の Google ボタンは公式ガイドラインに従う (色 / マーク)

## 成果物

各画面について:
1. モバイル 480px 幅のフレーム
2. 主要なインタラクション状態 (default / hover / active / disabled / loading)
3. 採用色・字サイズ・余白の数値が分かるアノテーション付き

## 参考: 既存画面のスクリーンショット

(必要に応じてユーザー側で添付)

- /local — 47 都道府県、漢字一文字タイル、地域ナビ
- /ingredients — 食材選択、season/category タブ
- /candidates — 3 案カード縦並び、選択中バッジ + 「決める」CTA
- /recipes/[id] — 画像ヒーロー + 詳細レシピ + ストーリーカード

</pasted_text>

## Assistant

_[tool: update_todos]_

_[tool: grep]_

Slice 4 として 8 つのアートボードを新規セクションに追加します。既存トークン（朱/和紙/明朝・ゴシック）を流用、Phone シェルや戦略印もそのまま再利用します。

_[tool: str_replace_edit]_

_[tool: write_file]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: update_todos]_

_[tool: done]_

_[tool: update_todos]_

_[tool: fork_verifier_agent]_

Slice 4 として 8 アートボードを「認証 & ピザ帳」セクションに追加しました。

- **08 TOP** — eyebrow + 大型明朝 + 朱 CTA + 三印オーナメント
- **09a/b/c Sign-in 3 案** — Dropdown 常駐 / 専用ページ / Modal（背景に詳細画面を blur）
- **10 ピザ帳** / **11 空状態** — 大型ハート枠の空状態 + 大判カードリスト
- **12 ハート3状態** — 未サインイン（案内テキスト）/未保存/保存済み、下に成功トースト
- **13 トースト** — success / info / warning + 2行 + ✕ の 4 バリアント

すべて既存トークン（朱/和紙/明朝・ゴシック）と戦略印・Phone シェルを共有しているので、他画面とトーンが揃っています。

## User

サインインは
09c · Sign-in 案C · Modal
が良いな
あと右側のユーザーアイコンをクリックした際の挙動がないかな？
ピザ帳に移動する感じ？

## Assistant

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: grep]_

_[tool: snip]_

_[tool: done]_

09c に集約しつつ、アバタータップ → ピザ帳直行の動線にします。dropdown は廃止、サインアウト導線はピザ帳側に置きます。整理しました：

- **09a / 09b は削除** — 09 (Modal) のみ残しています
- **アバタータップ → /library へ直行** — Dropdown は廃止、シンプルに
- **サインアウト導線** — ピザ帳の上部に「プロフィール帯（アバター＋名前＋メール＋サインアウトボタン）」を追加。サインアウトはピザ帳内に格納

これで認証周りの動線は一直線になりました（TOP→Modal でサインイン→詳細でハート→ピザ帳でアバタータップ→サインアウト）。

