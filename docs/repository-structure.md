# リポジトリ構造定義書(Repository Structure)

> 本書は **ふるさとピザ帳** (技術名: MakeLocalPizzaRecipeAgent) のフォルダ・ファイル構成と配置ルールを定義する。
> リポジトリ実名は `MakeLocalPizzaRecipeAgent` のまま (rename しない)。
> 技術スタックは [architecture.md](architecture.md)、機能設計は [functional-design.md](functional-design.md) を参照。

---

## 1. 全体方針

### 1.1 設計原則

1. **Web/BFF と Agent をディレクトリで明示的に分離**(`/` 側の Next.js モノレポ + `agent/` 側の Python パッケージ)
2. **`app/` はルーティングと UI に専念**、ビジネスロジックは `src/` に切り出す
3. **Agent / Tools / Furusato は機能単位で分割**し、テスト容易性を確保
4. **インフラは `infra/` に集約**、アプリケーションコードと明確に分離
5. **公開リポジトリ前提**でのシークレット保護(`.env`, 秘密鍵, バックアップは Git 管理外)
6. **デザインハンドオフは参照用に同梱**、ビルドには含めない

### 1.2 トップレベルの責務

| ディレクトリ / ファイル | 責務 | Git 管理 |
| --- | --- | --- |
| `app/` | Next.js App Router(ルーティング・UI・BFF API ハンドラ) | ✓ |
| `src/` | TS 共通ロジック・コンポーネント・Agent クライアント | ✓ |
| `agent/` | Python ADK Agent(独立 Cloud Run サービス) | ✓ |
| `public/` | 静的アセット(フォント、ファビコン、OG 画像) | ✓ |
| `design/` | デザインハンドオフ(参照用、ビルド対象外) | ✓ |
| `docs/` | 永続的ドキュメント | ✓ |
| `.steering/` | 作業単位ドキュメント(タスクごと) | ✓ |
| `infra/` | Terraform / Cloud Build 設定 | ✓ |
| `.github/` | GitHub Actions、Issue/PR テンプレート | ✓ |
| `scripts/` | 開発・運用支援スクリプト(Node 側) | ✓ |
| `tests/` | E2E テスト(ユニットはコロケーション) | ✓ |
| `.env*` | 環境変数(実値は Git 管理外、`.example` のみ管理) | 部分 |
| `.mcp.json` | プロジェクトローカル MCP 設定 | ✓ |
| `CLAUDE.md` | プロジェクトメモリ(Claude Code 用) | ✓ |

---

## 2. 全体構造

```
MakeLocalPizzaRecipeAgent/
├── app/                                  # Next.js App Router (Web/BFF)
│   ├── layout.tsx                        # ルートレイアウト(フォント、テーマプロバイダ)
│   ├── page.tsx                          # / → 初回判定 → Tap1 or Tap2 へ
│   ├── globals.css                       # CSS 変数、和紙テクスチャ、リセット
│   ├── not-found.tsx
│   ├── local/
│   │   └── page.tsx                      # 01 地元選択 (Tap1)
│   ├── ingredients/
│   │   └── page.tsx                      # 02 食材選択 (Tap2)
│   ├── candidates/
│   │   └── [sessionId]/
│   │       └── page.tsx                  # 04 候補3案 (Tap3)
│   ├── recipes/
│   │   └── [id]/
│   │       ├── page.tsx                  # 05 レシピ詳細
│   │       └── feedback/
│   │           └── page.tsx              # 06 作ってみた記録
│   ├── pizza-book/
│   │   └── page.tsx                      # 07 ピザ帳
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx                  # Google ログイン(任意)
│   └── api/                              # Route Handlers (BFF)
│       ├── health/route.ts
│       ├── locales/
│       │   ├── route.ts                  # GET /api/locales
│       │   └── [id]/
│       │       └── ingredients/route.ts  # GET /api/locales/{id}/ingredients
│       ├── quicktap/
│       │   └── sessions/
│       │       ├── route.ts              # POST /api/quicktap/sessions
│       │       └── [id]/
│       │           ├── route.ts          # GET /api/quicktap/sessions/{id}
│       │           └── reroll/route.ts   # POST /api/quicktap/sessions/{id}/reroll
│       └── recipes/
│           ├── route.ts                  # GET, POST
│           └── [id]/
│               ├── route.ts
│               └── feedback/route.ts     # GET, POST
│
├── src/
│   ├── domain/                           # ドメインモデル(純 TS、副作用なし)
│   │   ├── locale.ts                     # Locale 型
│   │   ├── ingredient.ts                 # Ingredient 型
│   │   ├── candidate.ts                  # Candidate 型 + Strategy
│   │   ├── recipe.ts                     # Recipe 型 + ファクトリ
│   │   ├── feedback.ts                   # Feedback 型 + ファクトリ
│   │   ├── preference.ts                 # UserPreference 型
│   │   ├── session.ts                    # QuickTapSession 型
│   │   └── schemas.ts                    # Zod スキーマ(API/DB 共通)
│   │
│   ├── lib/
│   │   ├── firebase/
│   │   │   ├── admin.ts                  # Firebase Admin SDK 初期化
│   │   │   ├── client.ts                 # クライアント側 Firebase 初期化
│   │   │   └── auth.ts                   # ID トークン検証
│   │   ├── firestore/
│   │   │   ├── recipes.ts                # CRUD: recipes
│   │   │   ├── feedback.ts               # CRUD: feedback
│   │   │   ├── preferences.ts            # CRUD: preferences
│   │   │   ├── sessions.ts               # CRUD: quicktap sessions
│   │   │   └── furusato-cache.ts         # CRUD: 楽天キャッシュ参照
│   │   ├── storage/
│   │   │   └── images.ts                 # Cloud Storage アップロード
│   │   ├── agent/
│   │   │   ├── client.ts                 # mlpr-agent への HTTP クライアント(IAM ID トークン付与)
│   │   │   └── stream.ts                 # NDJSON ストリームパーサ
│   │   ├── observability/
│   │   │   ├── logger.ts                 # 構造化ロガー
│   │   │   ├── tracer.ts                 # OpenTelemetry セットアップ
│   │   │   └── span.ts                   # withSpan ヘルパ
│   │   ├── localstorage/
│   │   │   └── locale.ts                 # mlpr.locale.v1 の R/W
│   │   └── http/
│   │       ├── error.ts                  # 共通エラー型 + handler
│   │       ├── with-auth.ts              # 認証ラッパ
│   │       └── rate-limit.ts             # レート制限
│   │
│   ├── stores/                           # Zustand
│   │   ├── auth.ts
│   │   └── quicktap.ts                   # Tap2/Tap3 のクライアント状態
│   │
│   ├── components/                       # 再利用 UI コンポーネント
│   │   ├── primitives/                   # Button, Card, Chip, Input, Stars ...
│   │   ├── local/                        # LocalPicker, PrefectureChip
│   │   ├── ingredient/                   # IngredientCard, SeasonTab, CategoryTab
│   │   ├── candidate/                    # CandidateCard, StrategySeal
│   │   ├── recipe/                       # RecipeView, IngredientList, StoryBlock, FurusatoSection
│   │   ├── feedback/                     # AxisRating, ChipMultiSelect, PhotoUpload(max4), CommentBox(280字)
│   │   └── illustration/                 # PizzaDisk(design/pizza-tokens.jsx 由来), WashiTexture
│   │
│   ├── hooks/                            # カスタムフック
│   │   ├── use-auth.ts
│   │   ├── use-locale.ts                 # localStorage 連動
│   │   └── use-quicktap-stream.ts        # NDJSON ストリーム受信
│   │
│   ├── data/
│   │   └── ingredients.generated.json    # build 時に agent/data/ingredients.yaml から生成
│   │
│   └── styles/
│       ├── tokens.css                    # CSS 変数(和紙・墨・朱・山吹 …)
│       ├── washi-noise.css               # 和紙ノイズテクスチャ
│       └── fonts.css                     # Shippori Mincho B1 / Zen Kaku Gothic
│
├── agent/                                # Python ADK Agent (独立サービス)
│   ├── pyproject.toml                    # uv 管理
│   ├── uv.lock
│   ├── Dockerfile
│   ├── README.md
│   ├── .env.example
│   ├── src/
│   │   └── makelocal_agent/
│   │       ├── __init__.py
│   │       ├── main.py                   # FastAPI エントリ
│   │       ├── deps.py                   # 依存注入(Gemini クライアント等)
│   │       ├── domain.py                 # Pydantic モデル(Locale, Candidate, Recipe...)
│   │       ├── observability.py          # logger + OpenTelemetry
│   │       ├── routing.py                # FastAPI ルータ
│   │       ├── session_ops.py            # QuickTapSession の CRUD
│   │       ├── agents/                   # ADK エージェント定義
│   │       │   ├── __init__.py
│   │       │   ├── candidates_agent.py   # 候補3案生成(Exploit/Tune/Explore)
│   │       │   ├── detail_agent.py       # 詳細レシピ生成
│   │       │   ├── traits_agent.py       # 学習トレイト抽出 (T5)
│   │       │   └── prompts/
│   │       │       ├── system.py
│   │       │       ├── candidates_v1.py  # ETE プロンプト(バージョン管理)
│   │       │       └── detail_v1.py
│   │       ├── tools/
│   │       │   ├── __init__.py
│   │       │   ├── search_local_ingredients.py    # T1
│   │       │   ├── get_seasonal_context.py        # T2
│   │       │   ├── retrieve_user_feedback.py      # T3
│   │       │   └── generate_pizza_image.py        # T4
│   │       └── furusato/                  # 楽天ふるさと納税レイヤ
│   │           ├── __init__.py
│   │           ├── normalize.py           # API レスポンス → 内部モデル
│   │           ├── cache.py               # Firestore furusato_cache 読み書き
│   │           └── tool.py                # Agent が参照する API
│   ├── data/
│   │   └── ingredients.yaml               # キュレーション済み地場食材(45件、5県想定)
│   ├── scripts/
│   │   ├── refresh_furusato_cache.py     # 楽天 API 唯一の発行源(cron)
│   │   └── build_ingredient_data.py      # YAML → JSON 生成
│   └── tests/
│       ├── conftest.py
│       ├── test_candidates_agent.py
│       ├── test_traits_agent.py
│       ├── test_furusato_cache.py
│       └── fixtures/
│
├── public/
│   ├── fonts/                            # セルフホストフォント(必要なら)
│   ├── og.png
│   └── favicon.ico
│
├── design/                               # デザインハンドオフ(参照のみ、ビルド除外)
│   ├── MakeLocalPizzaRecipe.html         # 静的キャンバス(7画面)
│   ├── MakeLocalPizzaRecipe Prototype.html
│   ├── design-canvas.jsx
│   ├── ios-frame.jsx
│   ├── pizza-tokens.jsx
│   └── prototype-app.jsx
│
├── docs/                                 # 永続的ドキュメント
│   ├── product-requirements.md
│   ├── functional-design.md
│   ├── architecture.md
│   ├── repository-structure.md           # 本書
│   ├── development-guidelines.md
│   ├── glossary.md
│   ├── hackathon-reference.md
│   └── hackathon/                        # 一次情報
│
├── .steering/                            # 作業単位ドキュメント
│   └── YYYYMMDD-<title>/
│       ├── requirements.md
│       ├── design.md
│       └── tasklist.md
│
├── infra/
│   ├── terraform/
│   │   ├── main.tf                       # 各モジュール呼び出し
│   │   ├── backend.tf                    # GCS バックエンド
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── providers.tf
│   │   └── modules/
│   │       ├── cloud-run-web/
│   │       ├── cloud-run-agent/
│   │       ├── firestore/
│   │       ├── storage/
│   │       ├── artifact-registry/
│   │       ├── secret-manager/
│   │       ├── iam/                      # web → agent の Invoker 権限など
│   │       └── monitoring/               # ダッシュボード + アラート
│   ├── cloudbuild/
│   │   ├── ci.yaml                       # PR 用(lint/test)
│   │   ├── deploy-web.yaml               # main 用(web build + deploy)
│   │   └── deploy-agent.yaml             # main 用(agent build + deploy)
│   └── README.md                         # インフラセットアップ手順
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                        # PR・push: Node + Python の lint/test
│   │   ├── deploy-dev.yml                # main → Cloud Run dev × 2
│   │   └── deploy-prod.yml               # v* タグ → prod プロモート
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── ISSUE_TEMPLATE/
│
├── scripts/                              # Node 側スクリプト
│   ├── setup-gcloud.sh                   # API 有効化、IAM 設定
│   ├── seed-firestore.ts                 # 開発用シード
│   └── build-ingredient-data.mjs         # agent/data/ingredients.yaml を読んで src/data/ へ
│
├── tests/                                # Node 側 E2E
│   ├── e2e/
│   │   ├── smoke.spec.ts                 # /api/health, Tap1→Tap2→候補
│   │   └── feedback.spec.ts              # フィードバック保存フロー
│   ├── fixtures/
│   └── playwright.config.ts
│
├── .env.example                          # 環境変数のサンプル
├── .env.local                            # ローカル実値(Git 管理外)
├── .gitignore
├── .dockerignore
├── .nvmrc                                # Node.js 22
├── .editorconfig
├── .prettierrc
├── .prettierignore
├── eslint.config.mjs
├── tsconfig.json
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml                   # 将来の workspace 用
├── lefthook.yml
├── vitest.config.ts
├── Dockerfile                            # Web/BFF 用
├── README.md                             # セットアップ + アーキテクチャ概要(提出物)
├── CLAUDE.md                             # プロジェクトメモリ
└── .mcp.json                             # MCP サーバー設定
```

---

## 3. ディレクトリ別の配置ルール

### 3.1 `app/`(Next.js App Router)
- **責務はルーティングと UI のみ**。ビジネスロジックは `src/` から import する
- 画面固有のコンポーネントは `_components/` フォルダ(`_` プレフィックスでルーティング除外)
- Server Component / Client Component の区別は明示
- 認証必須エリアは `(auth-required)/` のようなルートグループでまとめる(ピザ帳など)

### 3.2 `src/domain/`(ドメイン)
- 純粋な TypeScript のみ。Firestore や fetch の副作用を持ち込まない
- Zod スキーマは API バリデーションと Firestore 入出力で共有
- Python 側 `agent/src/makelocal_agent/domain.py` と**意味的に同期**させる(同名フィールド・同型)

### 3.3 `src/lib/`(インフラ層)
- 外部システムとの境界。すべての外部 SDK 呼び出しはここに集約
- `observability/` の logger / tracer は **アプリ全体で必ずこれを使う**(直接 console.log 禁止)
- `agent/client.ts` は mlpr-agent への内部 HTTP 呼び出しを抽象化(IAM ID トークン付与、リトライ)

### 3.4 `src/components/`
- `primitives/` は最小単位(Button, Card など)
- 機能別コンポーネントは機能ディレクトリ(`candidate/`, `recipe/` 等)
- スクリーン固有のコンポーネントは `app/.../_components/` に置き、ここには置かない
- `illustration/` の `PizzaDisk` 等は `design/pizza-tokens.jsx` から移植

### 3.5 `src/styles/`
- `tokens.css` は `design/pizza-tokens.jsx` の `T` オブジェクトから派生・移植
- 和モダンの単一テーマ(`craft`/`editorial` 等の複数テーマは持たない)
- 紙質感は `washi-noise.css` で実現

### 3.6 `agent/`(Python ADK Agent)
- Python パッケージとして独立(`pyproject.toml` 管理、uv で依存解決)
- Cloud Run 上では別サービスとして deploy
- ADK エージェント定義は `agents/`、ツールは `tools/`、楽天連動は `furusato/`
- ツールは 1 ファイル 1 ツール
- プロンプトはバージョン管理(`prompts/candidates_v1.py` 等)し A/B 比較できる構造

### 3.7 `infra/terraform/`
- モジュール単位で分離(web / agent / firestore / iam / monitoring)
- `terraform.tfvars` は Git 管理外
- state は GCS バックエンドで管理

### 3.8 `tests/`
- **Node 側 E2E のみ**ここに配置
- Node ユニットテストは対象ファイルと同じ場所に `*.test.ts`(コロケーション)
- Python テストは `agent/tests/` 配下

### 3.9 `design/`
- デザインハンドオフをそのまま配置
- **ビルドに含めない**(`next.config.ts` で除外、`.dockerignore` で除外)
- 仕様確認用の参照リソース

### 3.10 `docs/` と `.steering/`
- `docs/` は永続的ドキュメント。基本設計の変更時のみ更新
- `.steering/` は作業単位ドキュメント。新しい作業ごとに `YYYYMMDD-<title>/` を作成

---

## 4. ファイル命名規則

| 対象 | ルール | 例 |
| --- | --- | --- |
| React コンポーネント | PascalCase | `CandidateCard.tsx`, `StrategySeal.tsx` |
| Hook | `use` プレフィックス + camelCase | `use-auth.ts`, `use-quicktap-stream.ts` |
| TS ライブラリ・ユーティリティ | kebab-case | `with-auth.ts`, `rate-limit.ts` |
| API ルート | Next.js 規約(`route.ts`) | `app/api/recipes/route.ts` |
| ページ | Next.js 規約(`page.tsx`) | `app/candidates/[sessionId]/page.tsx` |
| TS 型・スキーマ | kebab-case | `recipe.ts`, `schemas.ts` |
| Python モジュール | snake_case | `candidates_agent.py`, `refresh_furusato_cache.py` |
| Python クラス | PascalCase | `class QuickTapSession`, `class Candidate` |
| Terraform モジュール | snake_case ディレクトリ | `modules/cloud_run_web/main.tf` |
| シェルスクリプト | kebab-case + `.sh` | `setup-gcloud.sh` |

---

## 5. インポートエイリアス(TS)

`tsconfig.json` で以下を定義:

| エイリアス | 解決先 | 用途 |
| --- | --- | --- |
| `@/app/*` | `app/*` | App Router 内 |
| `@/domain/*` | `src/domain/*` | ドメイン |
| `@/lib/*` | `src/lib/*` | インフラ層 |
| `@/components/*` | `src/components/*` | UI コンポーネント |
| `@/hooks/*` | `src/hooks/*` | フック |
| `@/stores/*` | `src/stores/*` | Zustand ストア |
| `@/styles/*` | `src/styles/*` | スタイル |
| `@/data/*` | `src/data/*` | 生成データ |

→ 相対パス `../../../` を避け、可読性を保つ。

---

## 6. 依存関係のルール

許可される依存方向(上から下へのみ):

```
app/  ──────►  components, hooks, stores
                  │
                  ▼
                 lib  ──►  domain
                  │
                  ▼
               domain  (純粋、外部依存なし)
```

`agent/` 側も同様:

```
main.py / routing.py
        │
        ▼
   agents/, furusato/  ──►  tools/, domain
        │
        ▼
       tools/  ──►  domain, furusato/cache
        │
        ▼
       domain
```

- ❌ `domain/` から `lib/` を import する → 禁止
- ❌ `lib/` から `app/` を import する → 禁止
- ❌ `agent/` から `app/` を import する → クロス言語ゆえ物理的に不可能だが、設計でも禁止
- ✓ ESLint の `import/no-restricted-paths` で機械的に強制(`development-guidelines.md` で詳細)

---

## 7. Git 管理の例外(`.gitignore` 主要項目)

```
# Node
node_modules/
.next/
.turbo/
out/

# Python
agent/.venv/
agent/__pycache__/
agent/.pytest_cache/
agent/.ruff_cache/
**/*.pyc
**/__pycache__/

# 環境変数
.env
.env.local
.env.*.local
!.env.example
agent/.env
!agent/.env.example

# 認証情報
*.pem
*.key
*-key.json
gcp-key*.json

# Terraform
infra/terraform/.terraform/
infra/terraform/*.tfstate
infra/terraform/*.tfstate.*
infra/terraform/*.tfvars
!infra/terraform/*.tfvars.example
infra/terraform/.terraform.lock.hcl

# OS / IDE
.DS_Store
.vscode/
.idea/

# テスト
coverage/
playwright-report/
test-results/

# ログ
*.log
firebase-debug.log
firestore-debug.log

# 生成データ(Git 管理しない場合)
# src/data/ingredients.generated.json   # 管理する場合はコメントイン
```

---

## 8. 提出物(ハッカソン要件)との対応

| 提出要件 | 対応するファイル/ディレクトリ |
| --- | --- |
| GitHub 公開リポジトリ | リポジトリルート全体 |
| デプロイ URL | Cloud Run mlpr-web の URL(`infra/terraform/outputs.tf` で出力) |
| README(セットアップ + アーキテクチャ概要) | `README.md` |
| システムアーキテクチャ図 | `docs/functional-design.md` §1.1 + `docs/architecture.md` §2.1 |
| 紹介動画 | リポジトリ外(YouTube/Vimeo) |
| Proto Pedia 登録情報 | `docs/hackathon-reference.md` 参照 |

---

## 9. 改訂履歴

| 日付 | 版 | 変更内容 |
| --- | --- | --- |
| 2026-05-13 | 1.0 | 初版作成。Web/BFF と Agent を物理的にディレクトリ分離(Next.js モノレポ + `agent/` 配下の Python パッケージ)。Quick Tap 動線・候補3案・ふるさと納税3層分離を反映したルーティング・モジュール構成。 |
| 2026-05-24 | 1.1 | サービス名を「ふるさとピザ帳」に確定 (Slice 7、FR-7-8)。リポジトリ名・ディレクトリ構成は変更なし。 |
