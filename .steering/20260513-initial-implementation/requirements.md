# 初回実装 要求定義(Slice 1: Foundation + Quick Tap UI スケルトン + 候補3案モック)

> 本書は `.steering/20260513-initial-implementation/` の作業要求を定義する。
> 永続的要件は [`docs/product-requirements.md`](../../docs/product-requirements.md) を参照(本書は初回スライスの「今回何をするか」を定義)。
> 設計は同ディレクトリの [`design.md`](design.md)、タスクは [`tasklist.md`](tasklist.md) を参照。

---

## 1. 目的と位置づけ

### 1.1 目的

ゼロベースの本プロジェクトに対し、**UI → BFF → 候補3案表示** までを縦に貫通する最小スタックを構築する。AI 本体・永続化・外部 API 連動は本スライスに含めず、**ハッカソン提出に向けた DevOps 基盤を最初に敷く**ことを優先する。

### 1.2 位置づけ

- 全体ロードマップにおける**第 1 スライス**。後続スライスで AI 本体、永続化、Cloud Run デプロイを順次追加する
- 完了時点で **ローカルで動くピザ提案体験(モック含む)** がブラウザで再現できることを目指す
- 個人開発・2 週間以内を目安とした現実的サイズ

### 1.3 後続スライスの想定(本スライスでは扱わない)

| スライス | 想定内容 |
| --- | --- |
| Slice 2 | Python ADK Agent 立ち上げ、Gemini で実際の候補3案生成、Cloud Run 上で 2 サービス稼働 |
| Slice 3 | 詳細画面 + Imagen 画像生成 |
| Slice 4 | Firebase Auth + Firestore + フィードバック記録 + ピザ帳 |
| Slice 5 | 楽天ふるさと納税 API 連動(キャッシュ + UI) |
| Slice 6 | Terraform + IaC + 本番デプロイ + 可観測性 |
| Slice 7 | Vertex AI Gen AI Evaluation + 戦略軸別品質モニタリング |

---

## 2. スコープ

### 2.1 IN(本スライスで実装する)

#### 2.1.1 開発環境・リポジトリ基盤

- Next.js 16 / TypeScript 5.x プロジェクトのブートストラップ
- pnpm 10 をパッケージマネージャとして採用
- ESLint(`next/core-web-vitals` + `@typescript-eslint/recommended`)
- Prettier
- Vitest(ユニットテスト)
- lefthook(pre-commit: lint / format / typecheck / gitleaks)
- `tsconfig.json` の strict 設定 + パスエイリアス(`@/domain/*` 等)
- リポジトリ構造を [`docs/repository-structure.md §2`](../../docs/repository-structure.md#2-全体構造) に従って構築
- `.gitignore` / `.dockerignore` / `.editorconfig` / `.nvmrc` / `.env.example`
- README ドラフト(セットアップ手順 + アーキテクチャ概要)

#### 2.1.2 デザインシステム

- `design/pizza-tokens.jsx` の `T`(配色)を `src/styles/tokens.css` に CSS 変数として移植
- フォント設定: Shippori Mincho B1 / Zen Kaku Gothic New / JetBrains Mono(`next/font/google`)
- `washi-noise.css`(和紙テクスチャ)を実装
- `PizzaDisk` `WashiTexture` `StrategySeal` 等の汎用コンポーネントを `src/components/` に React 化

#### 2.1.3 画面実装(4画面)

- **01 地元選択**(`app/local/page.tsx`)
  - 47都道府県を 8 地域(北海道・東北・関東・中部・近畿・中国・四国・九州沖縄)で表示
  - 都道府県を選択した瞬間に `localStorage` 保存 + 食材選択画面へ遷移
  - 上部に地域チップ + スクロールでセクションへ
- **02 食材選択**(`app/ingredients/page.tsx`)
  - 季節タブ(春・夏・秋・冬・通年)+ カテゴリタブ(野菜・魚介・チーズ・穀物)で食材カードをフィルタ
  - 食材を 1〜3 個選択(チェック切替)
  - 上部に `📍 [地元名] ▾` 表示、タップで Tap1 に戻れる
  - 下部に「次へ」CTA(選択 1 個以上で活性化)
- **03 焼成中**(遷移中のローディング状態)
  - ピザが焼ける情緒的なアニメーション(プロトタイプ参照)
  - 2〜3 秒の固定演出(モックなので本番待ち時間はない)
- **04 候補3案**(`app/candidates/[sessionId]/page.tsx`)
  - 縦スクロールで Exploit / Tune / Explore の 3 カードを順に表示
  - 戦略印(右上)で軸を識別、日本語ラベル「王道 / 一歩外す / 大冒険」を表示
  - 各カードに「なぜこの提案か」モック注釈
  - 下部に「もう一度ふる」「食材を変える」ボタン

#### 2.1.4 BFF API(スタブ実装)

- `GET /api/health` — ヘルスチェック
- `GET /api/locales` — 都道府県一覧(静的データ)
- `GET /api/locales/{id}/ingredients` — 地元食材一覧(`src/data/ingredients.generated.json` から)
- `POST /api/quicktap/sessions` — **ハードコードされた 3 案を返す**(戦略軸ラベル + ダミーコンテンツ)
  - 入力: `{ localeId, ingredients, guestSessionId? }`
  - 出力: NDJSON ストリーム(戦略軸ごとに段階的に流す)
- `POST /api/quicktap/sessions/{id}/reroll` — 同じ食材で再生成(別のスタブ3案)

> ストリーム形式は本番と同じ NDJSON にし、フロント側のストリーム処理コードを正本化しておく(後続スライスで Python Agent に差し替えても UI 側変更不要にする)。

#### 2.1.5 静的データ

- `agent/data/ingredients.yaml` のスケルトン(45 件想定のうち、初回は宮城・長野・高知の 3 県 × 10 食材程度から)
- `scripts/build-ingredient-data.mjs` で YAML → `src/data/ingredients.generated.json` 変換
- ビルド時に自動実行(`prebuild` フック)

#### 2.1.6 状態管理

- `localStorage` キー設計に従い、`mlpr.locale.v1` `mlpr.recentIngredients.v1` `mlpr.guestSessionId.v1` を読み書き
- カスタムフック `useLocale` を `src/hooks/use-locale.ts` に実装(`useSyncExternalStore` ベース)
- Quick Tap セッションの一時状態を Zustand で管理(`src/stores/quicktap.ts`)

#### 2.1.7 可観測性(最小限)

- 構造化ロガー `src/lib/observability/logger.ts`(本スライスでは console 出力 + 構造化 JSON)
- Cloud Logging への送信は後続スライス(env 切替で有効化可能な構造にしておく)
- `withSpan` ヘルパは API スケルトンに含める(本スライスでは Cloud Trace 未接続)

#### 2.1.8 CI(最小限)

- `.github/workflows/ci.yml` — Node ジョブのみ
  - `pnpm install --frozen-lockfile` → `lint` → `typecheck` → `test` → `build`
- Python 側の CI は Slice 2 で追加

#### 2.1.9 ドキュメント

- `README.md` のドラフト
  - プロダクト概要(1〜2 文 + デザインプロトタイプリンク)
  - 技術スタック概要
  - ローカル開発手順(`pnpm install` → `pnpm dev`)
  - 関連ドキュメントへのリンク

### 2.2 OUT(本スライスで扱わない)

| 領域 | 含めない理由 |
| --- | --- |
| Python ADK Agent | Slice 2 で実装。本スライスでは BFF が候補3案をハードコード返却 |
| Gemini / Imagen 実呼び出し | 同上 |
| Firebase Auth | Slice 4 で実装。本スライスは無認証で完結 |
| Firestore | Slice 4 で実装。データはメモリ + localStorage のみ |
| Cloud Storage | Slice 3 で実装 |
| 楽天ふるさと納税 API | Slice 5 で実装 |
| 詳細画面(05) | Slice 3 で実装 |
| フィードバック記録(06) | Slice 4 で実装 |
| ピザ帳(07) | Slice 4 で実装 |
| Terraform / Cloud Run / 本番デプロイ | Slice 6 で実装。本スライスはローカル動作確認のみ |
| Vertex AI Gen AI Evaluation | Slice 7 で実装 |
| Dockerfile(Agent 用) | Slice 2 で実装 |
| 認証必須エリアの API ラッパ(`withAuth`) | Slice 4 で実装。`withAuthOptional` の雛形のみ |

---

## 3. ユーザーストーリー

### 3.1 関連する PRD ユーザーストーリー(本スライスで充足するもの)

PRD §6 のうち、本スライスで部分充足するもの:

| US | 内容 | 本スライスでの充足度 |
| --- | --- | --- |
| US-1 | 数十秒で地元食材ピザを考案したい | **部分**: モック3案表示まで動く(中身はダミー) |
| US-2 | 完成案を眺めて1案を選びたい | **部分**: 3案を眺めて選ぶ UI が動く(決定後の詳細遷移は Slice 3) |
| US-7 | 2回目以降は地元選択を省略したい | **完全**: localStorage 永続化で実現 |
| US-8 | 別の地元を試したい | **完全**: 地元変更動線で実現 |

US-3〜US-6 は後続スライスで充足。

### 3.2 開発者向けストーリー(本スライス固有)

#### DS-1: 動くスタックを早く触りたい
> 開発者として、私は AI 本体や永続化を実装する前に、UI → BFF → ストリーム表示までが繋がった**触れるアプリ**を手元で動かしたい。なぜなら、設計の妥当性は実機で触らないと判断できないからだ。

#### DS-2: DevOps 基盤を最初に敷きたい
> 開発者として、私は機能を増やす前に lint / typecheck / test / CI が動く状態を確立したい。なぜなら、ハッカソン審査は機能の幅より DevOps の完成度を見るからだ。

#### DS-3: デザインの正しさを実コードで確認したい
> 開発者として、私はデザイントークンとフォントを実 Next.js プロジェクトに移植した状態で、`design/` のプロトタイプとピクセル感を比較したい。なぜなら、和モダンの紙質感は微差で印象が変わるからだ。

#### DS-4: NDJSON ストリーム処理を本番形式で書きたい
> 開発者として、私は候補3案の表示処理をモック段階から本番と同じ NDJSON ストリームで書きたい。なぜなら、後で Python Agent に差し替えるとき UI コードを変更したくないからだ。

---

## 4. 受け入れ条件

### 4.1 機能受け入れ(ハッピーパスのデモ)

ローカルで `pnpm dev` を実行し、ブラウザ(iPhone サイズエミュレート)で以下が動くこと:

- [ ] **初回起動**: `/` にアクセス → 地元未設定なので Tap1 (地元選択) にリダイレクトされる
- [ ] **Tap1**: 47都道府県が地域別に並んでいる。任意の都道府県をタップ → localStorage に保存 → Tap2 (食材選択) に自動遷移
- [ ] **Tap2**: 選択した地元の食材カードが表示される。季節タブ・カテゴリタブで絞り込める。食材を 1〜3 個選択して「次へ」 → Tap3 (焼成中 → 候補3案) に遷移
- [ ] **焼成中**: 2〜3 秒間アニメーションが流れる
- [ ] **Tap3 候補3案**: Exploit / Tune / Explore の 3 案が縦スクロールで段階的に表示される(NDJSON ストリーム)。各カードに戦略印(日本語ラベル「王道 / 一歩外す / 大冒険」)が付いている
- [ ] **振り直し**: 「もう一度ふる」をタップ → 別のスタブ3案が表示される
- [ ] **地元変更**: Tap2 上部の `📍 [地元名] ▾` をタップ → Tap1 に戻る
- [ ] **リピート利用**: ブラウザリロード → 地元が永続化されているので Tap2 から開始する

### 4.2 デザイン受け入れ

- [ ] 和紙背景(`#F2E9D6`) + 紙質感ノイズが表示されている
- [ ] 見出しは明朝(Shippori Mincho B1)、本文はゴシック(Zen Kaku Gothic New)
- [ ] 朱色(`#C8412A`) / 山吹(`#DC8A2A`) / 藍(`#3E5670`) のアクセントが戦略印・ボタン等で正しく使われている
- [ ] `design/MakeLocalPizzaRecipe.html` を別タブで開いて視覚比較したとき、**色・タイポ・余白の印象が一致**している(ピクセル単位の完全一致は求めない)

### 4.3 DevOps 受け入れ

- [ ] `pnpm lint` が pass する
- [ ] `pnpm typecheck` が pass する
- [ ] `pnpm test` が pass する(ユニットテスト最低 5 本: domain / lib / hooks のいずれか)
- [ ] `pnpm build` が pass する
- [ ] lefthook pre-commit が動作し、shame ファイル(`.env` 等) をコミットしようとすると gitleaks で止まる
- [ ] `.github/workflows/ci.yml` が GitHub Actions で実行され、上記すべてが通る
- [ ] README に記載された手順だけで他人(または将来の自分)がローカル起動できる

### 4.4 コード品質受け入れ

- [ ] `docs/development-guidelines.md §3` の命名規則に従っている
- [ ] `docs/repository-structure.md §6` の依存方向ルールに違反していない(`import/no-restricted-paths` が pass)
- [ ] `console.log` が本番コードに含まれていない(ESLint で検出)
- [ ] `any` 型が含まれていない(`unknown` からの narrow で対応)
- [ ] `.env*` がリポジトリにコミットされていない(gitleaks pass)

### 4.5 アーキテクチャ整合性受け入れ

- [ ] BFF API のレスポンス契約([`functional-design.md §6`](../../docs/functional-design.md#6-api-設計bff))に従っている(エンドポイントパス・形式・ストリーム)
- [ ] `localStorage` キー名が [`functional-design.md §3.4`](../../docs/functional-design.md#34-端末ローカルlocalstorage-設計) と一致(`mlpr.locale.v1` 等)
- [ ] 戦略軸の英語 ID が `'exploit' | 'tune' | 'explore'` で統一されている(コード内 / NDJSON 内)

---

## 5. 制約事項

### 5.1 技術的制約

- **Node 22 LTS / pnpm 10+ を前提**(`.nvmrc` 固定)
- **Next.js 16 (App Router)** を使用、Pages Router は使わない
- **CSS Modules + CSS 変数**のみ(Tailwind 不採用)
- **クライアントから直接 Firestore / Gemini を叩かない**(Slice 1 では Firestore も無いが、構造上 BFF 経由パターンを敷く)
- 候補生成のスタブは**本番と同じ NDJSON 形式**で返す(Slice 2 で差し替え時の影響を最小化)

### 5.2 スケジュール制約

- 開発期間目安: **2 週間以内**(2026/5/13〜2026/5/27 を目処)
- ハッカソン全体スケジュール上、Slice 1 は 5/27 までに完了し、6 月から Slice 2(Python Agent + Gemini) に入りたい

### 5.3 スコープ制約(過剰実装の禁止)

- ❌ 認証ラッパに本番ロジックを書かない(雛形のみ)
- ❌ Firestore 接続を「将来のために」準備しない(必要になった時に書く)
- ❌ デザインテーマ切替の余地を残さない(和モダン単一)
- ❌ プロトタイプの全 7 画面を移植しない(IN 範囲の 4 画面のみ)
- ❌ i18n を導入しない(日本語のみ、後で必要になったら考える)

### 5.4 ドキュメント制約

- 永続的ドキュメント([`docs/`](../../docs/)) は本スライス内では**変更しない**(基本設計に影響しないため)
- 作業中の決定は `.steering/20260513-initial-implementation/design.md` と `tasklist.md` に集約
- 終了時に README をドラフト化(完成版は Slice 6 でデプロイ手順を加筆)

---

## 6. 完了の定義 (Definition of Done)

本スライスは以下すべてが満たされた時点で完了とする:

1. ✅ §4.1 機能受け入れの 8 項目すべてが手元で動作確認できる
2. ✅ §4.2 デザイン受け入れの 4 項目を満たす
3. ✅ §4.3 DevOps 受け入れの 7 項目をすべて通過
4. ✅ §4.4 コード品質受け入れの 5 項目をすべて通過
5. ✅ §4.5 アーキテクチャ整合性受け入れの 3 項目をすべて通過
6. ✅ `git log --oneline` を見て、コミットが Conventional Commits 準拠で粒度が読める状態
7. ✅ README に記載された手順だけで第三者がローカル起動できる
8. ✅ `.steering/20260513-initial-implementation/tasklist.md` の全タスクに ✓ が付いている

---

## 7. リスクと前提

### 7.1 想定リスク

| # | リスク | 対策 |
| --- | --- | --- |
| R1 | デザイントークン移植の手間が想定より大きい | 最初に `T` オブジェクト → CSS 変数の機械的変換だけ済ませ、紙質感など細部は後で詰める |
| R2 | NDJSON ストリームのフロント実装に手間取る | `ReadableStream + TextDecoderStream` のミニライブラリを `src/lib/agent/stream.ts` として独立させ、テストで担保 |
| R3 | 食材データのスキーマ確定に時間がかかる | 初回は宮城のみ 10 食材で確定させ、他県は YAML を空のまま雛形だけ用意 |
| R4 | リピート利用シナリオの自動テストが書きにくい | E2E は Slice 1 ではスモークのみ。手動確認で受け入れ判定する |

### 7.2 前提

- 個人開発・1 人体制
- Google Cloud 環境はまだ用意しない(Slice 6 で構築)
- GitHub リポジトリは本スライス内で初期化(本スライス開始時はまだローカル only)

---

## 8. 改訂履歴

| 日付 | 版 | 変更内容 |
| --- | --- | --- |
| 2026-05-13 | 1.0 | 初版作成。Slice 1 のスコープ(Foundation + Tap1〜Tap3 候補モック)を確定。 |
