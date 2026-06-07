# Slice 10 — 共有リンク (Share Link) requirements

> Issue #3 をベースに「未ログイン (ゲスト) でも共有可能」「ゲストの取消は不要 = 永続発行」に
> スコープを更新したもの。レシピ詳細を SNS (主に X) で共有できるようにする。

---

## 1. 背景・目的

詳細レシピは **ストーリー + 仕上がり画像 + 地元食材** が揃った「ゲストへの会話のネタになる 1 枚」
として完成度が高い。これを **X (Twitter) で共有**できるようにすることで:

1. **ユーザの誇り体験**: 「私が作ったピザ」を SNS で見せられる → リピート利用の動機強化
2. **プロダクト認知の自然な拡散**: 共有 URL を踏んだ人が「ふるさとピザ帳」を知る
   (PRD §4 ハッカソン審査 ④ 体験価値の補強)
3. **ハッカソン審査での具体的なデモ材料**:
   「**つくる → まわす → とどける**」のうち「とどける」を実体験レベルで示せる

Issue #3 の最大の更新点は、**未ログインのゲストでも共有を可能にする**ことで、
ユーザ獲得の漏斗の最も上 (= まだサインインしていない人) から拡散を始められるようにする。

---

## 2. ユーザストーリー

### US-S1 (主・認証ユーザ): ホストが自分の 1 枚を SNS で共有したい
> ホストとして、私はピザ帳に保存した 1 枚を X で共有して「今夜の一枚はこれだった」と
> 発信したい。なぜなら、地元食材を活かした独創的なピザはそれ自体が会話のネタであり、
> フォロワーにも見せたいから。

### US-S2 (主・ゲスト): まだサインインしていないユーザが、その場で共有したい
> ゲストとして、私は「面白いピザを生成できた」と思ったその瞬間に、
> サインインの壁なしに X で共有したい。なぜなら、サインインを挟むと
> その場のテンションが失われてしまうから。

### US-S3 (副): 共有 URL を踏んだ人にプロダクトの世界観が伝わる
> 共有 URL の閲覧者として、レシピの仕上がり画像 + タイトル + ストーリーが X の
> タイムラインに大きく展開されてほしい。なぜなら、リンクが目立つほど
> 「これは何だろう」と踏みやすくなるから。

> **NOTE**: Issue #3 にあった「US-S2 共有を後から取り消したい」は本スライスではスコープ外。
> AI 生成コンテンツであり個人情報の露出も無いため、永続発行で良いという判断 (2026-06-06)。

---

## 3. 受け入れ条件

- **AC-S1**: 詳細画面で「X で共有」を押すと、確認モーダル経由で `shareId` が発行され
  `/share/{shareId}` が即座に閲覧可能になる
- **AC-S2**: ゲスト (未認証) でも上記が動作する。サインインモーダルは出ない
- **AC-S3**: 共有 URL を未認証ブラウザで踏んでも、レシピのタイトル・ストーリー・画像が
  閲覧できる
- **AC-S4**: 共有 URL を X のツイートに貼ると、画像入りの **summary_large_image** カードで
  展開される (Twitter Card Validator で確認)
- **AC-S5**: 共有確定後、X Web Intent (`https://x.com/intent/post?...`) が新タブで開き、
  投稿テキスト + 共有 URL がプレフィルされる
- **AC-S6**: 同じレシピで「X で共有」を 2 回押した場合、同じ `shareId` が再利用される
  (= 同じ URL になる)
- **AC-S7**: アプリ層レートリミット (Slice 9 と同枠) で `/api/share` の作成回数を
  guest / uid 単位で制限する (悪用対策)
- **AC-S8**: shareId が存在しない / 削除済の `/share/{shareId}` は 404 を返す
  (削除は将来要件・今は発生しないがガードとして実装)

---

## 4. スコープ

### 4.1 IN (MVP)

- `shared_recipes` Firestore collection + Security Rules (public read / write は API 経由)
- `POST /api/share` — 認証ユーザ / ゲスト両対応、レシピ snapshot を受けて `shareId` を発行
- `/share/[shareId]` 公開 Server Component
  - Next.js `generateMetadata` で OGP / Twitter Card を動的生成
  - 認証不要・robots index 可
- 詳細画面 (`/recipes/[candidateId]`) に「X で共有」CTA + 確認モーダル
- X Web Intent への遷移 (URL + プレフィル投稿テキスト)
- アプリ層レートリミット (Slice 9 と同じ withRateLimit ミドルウェア / `apiFetch` の利用)
- 同じ `(uid, candidateId)` または `(guestSessionId, candidateId)` から 2 回目以降の
  作成はべき等 (既存 shareId を返す)

### 4.2 OUT (将来 / 別スライス)

- 共有取消 (`DELETE /api/share/:shareId`)
- 共有数カウント / 閲覧数表示
- 別 SNS (LINE / Facebook / Instagram) 共有
- 共有レシピへのコメント / いいね機能
- 共有レシピのリスト一覧ページ (`/explore` 等)
- ピザ帳 (`/library`) カード上の「共有中バッジ」
- 認証ユーザの savedRecipes と shared_recipes を 1 対 1 で同期する設計
- shareId 別の閲覧アクセスログ / GA4 計測 (Slice 13 GA イベント拡張で扱う)

---

## 5. 機能要件

### FR-10-1 — 共有作成 API
- `POST /api/share` を新設
- Request body: 詳細画面が持っている全フィールド (title / concept / meta / materials / steps /
  story / imageUrl / prefecture / strategy / candidateId / localeId)
- Response: `{ shareId: string, url: string }`
- 認証: `withAuthOptional` (ID token があれば uid を、無ければ `x-mlpr-guest-session-id` から
  guestSessionId を取得)
- レートリミット: `withRateLimit` — share キーで 1 時間あたり 5 回 (uid / guestSessionId 単位)
- べき等: 既に `(uid || guestSessionId, candidateId)` で発行済の shareId があればそれを返す

### FR-10-2 — 公開閲覧ページ
- `/share/[shareId]` Server Component
- Firestore `shared_recipes/{shareId}` を直接 SSR で fetch (Web SDK の onSnapshot は使わない、
  サーバから読む → Admin SDK or REST)
- 該当 doc 無し → `notFound()` で 404
- 描画: タイトル + 画像 + ストーリー + 材料 + 手順 + フッタの「ふるさとピザ帳で作る →」CTA
  (CTA は TOP `/` か `/local` への internal link、流入経路)
- 認証不要・**未ログインで閲覧完結**できることを担保

### FR-10-3 — OGP / Twitter Card
- `generateMetadata` で動的に設定:
  - `title`: `{snapshot.title} — ふるさとピザ帳`
  - `description`: `snapshot.story.headline` (短文) / fallback で `concept`
  - `openGraph.images`: `[snapshot.imageUrl]` (Imagen 生成 PNG、1024px)
  - `twitter.card`: `summary_large_image`
- Twitter Card Validator で大型画像カード展開を確認 (AC-S4)

### FR-10-4 — 詳細画面 CTA
- 詳細画面 (`/recipes/[candidateId]`) で「X で共有」ボタンを追加
- 出し分け:
  - 詳細生成中 (`stream.state !== 'recipeDone' && stream.state !== 'allDone'`) → disabled
  - 生成完了 + 未共有 → 「X で共有」ラベル
  - 生成完了 + 同じ candidateId で発行済 (= 共有された) → 「X で再共有」(同 URL 再利用)
- 押下 → 確認モーダル → 確定 → `POST /api/share` → 戻り URL を Web Intent に詰めて新タブで開く

### FR-10-5 — Web Intent 起動
- URL: `https://x.com/intent/post?text={text}&url={shareUrl}`
- `text`: 約 100 字以内のテンプレート (例:
  `🍕 {title}\n{story.headline}\n#ふるさとピザ帳 #地元ピザ`)
- 文字数 280 内に確実に収まるよう、長すぎる title / headline は切り詰め (省略は API 側で行わず、
  client 側のテンプレートビルダで対応)

### FR-10-6 — アプリ層レートリミット
- Slice 9 の `withAuthOptional(withRateLimit(...))` パターンを `/api/share` にも適用
- ルートキー: `share`、上限 5 / 1h (uid または guestSessionId 単位)
- 429 時のレスポンスは既存実装 (`Retry-After`) と同等

### FR-10-7 — Analytics (GA4)
- 共有 CTA 押下 (確認モーダル表示) `share_intent`
- 確認モーダル確定後 `share_published` (shareId 発行成功)
- X 公開ページ訪問 `share_page_view` (`/share/[shareId]` mount)

### FR-10-8 — ドキュメンテーション
- `docs/functional-design.md` に Slice 10 章を追加 (シーケンス図 + データモデル)
- `docs/architecture.md` の API 一覧に `/api/share` を追記

---

## 6. 非機能要件

- **パフォーマンス**: `/share/[shareId]` の Server Component fetch は p95 < 800ms
- **可用性**: shared_recipes は永続発行 (TTL なし)。 Firestore の標準 SLA を継承
- **セキュリティ**:
  - `shareId` は UUID v4 (推測困難)
  - UID は URL / OGP に出さない
  - Firestore Rules: `shared_recipes/{shareId}` は public read、client からの直接 write は禁止
    (= API 経由 Admin SDK のみ書き込み可)
  - レートリミットで 1 時間 5 件以上の連投を防ぐ
- **プライバシー**:
  - 共有モーダルで「インターネット上に公開されます」を明記
  - シェアされたコンテンツはユーザ操作によって自分の意思で公開した AI 生成データ。
    個人情報の混入経路は無い (タイトル・ストーリー等は LLM 出力で、ユーザ入力は localeId と
    ingredients のみで、地元名・食材名は固有名詞ではあるが個人 identifiability は無い)
- **アクセシビリティ**:
  - 「X で共有」ボタンは aria-label 付き
  - 確認モーダルは focus-trap + ESC でクローズ + Tab 巡回が壊れないこと

---

## 7. 制約事項

- **Firebase Admin SDK**: 既に Slice 9 で導入済 (Cloud Run runtime で ADC)
  → `/api/share` での Firestore write はこの Admin SDK を利用
- **画像配信**: snapshot.imageUrl は既存 `makelocalpizzarecipeagent-pizza-images` GCS バケット
  の公開 URL を流用 (新規バケット不要)
- **既存ジャーニーへの影響を最小化**: ハート保存 / フィードバック / ピザ帳 / 振り返り帳の
  挙動を変えない
- **CI / Deploy**:
  - Issue #15 (rules CI 自動化) と並行進行する可能性がある。Slice 10 の Firestore Rules
    変更は手動 `firebase deploy --only firestore:rules` で適用する (Issue #15 完了までは手動)
- **GA4 計測**: Slice 9.1 で導入済の `trackEvent` を再利用

---

## 8. 想定リスク

- **クロール経路の暴走**: クローラが大量の `/share/{shareId}` を踏むとサーバ・Firestore コストが
  上振れする → 既存の Firestore 読み取りキャッシュ + Cloud Run min-instances=0 で抑制
- **不適切コンテンツの公開**: LLM 出力のレシピが不適切表現を含む可能性 (低)
  → 必要に応じて Issue ベースで通報受付の Google Form を /privacy に追記する (将来)
- **shareId の流出**: shareId が掲示板等で公開されると **検索エンジンに索引** される可能性 →
  これは仕様上想定の範囲。公開モーダルで明示
- **X 仕様変更**: `x.com/intent/post` のクエリスキーマが変更される可能性 →
  Web Intent 構築はヘルパに分離してテスト可能にする
