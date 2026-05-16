# Make Local Pizza Recipe Agent

ローカル/旬の食材を活かしたピザレシピを提案する **AI エージェント**。

> 地元 × 旬 × 戦略 (王道 / 一歩外す / 大冒険) を起点に、ピザの 3 案を即座に提案する Web アプリ。
> Slice 1 (本リポジトリの現状) は **AI モック + 縦貫スタック完成** までを範囲とする。

---

## 機能 (Slice 1 時点)

- ✅ **地元選択** — 47 都道府県 (Slice 1 はキュレーション 3 県)
- ✅ **食材選択** — 季節 / カテゴリでフィルタ、複数選択
- ✅ **候補 3 案の段階表示** — NDJSON ストリームで `王道 / 一歩外す / 大冒険` を順次焼き上げ
- ✅ **振り直し** — 別 seed で 3 案を再生成
- 🚧 Slice 2+: 本物の Gemini Agent (Python ADK) / 詳細画面 + Imagen / 楽天ふるさと納税連動 / Firebase Auth

---

## 技術スタック

| 層             | 採用                                                                        |
| -------------- | --------------------------------------------------------------------------- |
| フロント       | **Next.js 16** (App Router) / React 19 / TypeScript 5.9                     |
| 状態           | Zustand 5 / React 19 標準 (`useSyncExternalStore` / `useReducer`)           |
| バリデーション | Zod 4 (NDJSON / API リクエスト / 静的データ)                                |
| BFF            | Next.js Route Handlers (Edge ではなく Node ランタイム)                      |
| デザイン       | 自作トークン (CSS 変数) + CSS Modules / 和紙テクスチャ + 明朝/ゴシック/モノ |
| テスト         | Vitest 4 + jsdom + RTL / Playwright 1.60 (smoke のみ)                       |
| 静的データ     | YAML → Zod 検証 → JSON (build 時に生成、リポジトリ管理)                     |
| CI             | GitHub Actions (lint / typecheck / test / build)                            |
| pre-commit     | lefthook (eslint / prettier / typecheck / gitleaks)                         |
| デプロイ       | Cloud Run (multi-stage Dockerfile, Next.js standalone) — **Slice 6 で実装** |

---

## 必要環境

- Node.js **22.x** (`.nvmrc` 参照)
- pnpm **10.x**
- DevContainer (推奨): `.devcontainer/` を VS Code または GitHub Codespaces で開く

---

## セットアップ

```bash
# 1. リポジトリをクローン
git clone https://github.com/sugimomoto/MakeLocalPizzaRecipeAgent.git
cd MakeLocalPizzaRecipeAgent

# 2. 依存インストール
pnpm install --frozen-lockfile

# 3. lefthook (pre-commit hook) を有効化
pnpm exec lefthook install
```

## 開発

```bash
# 開発サーバ (Turbopack 不調のため webpack を明示)
pnpm dev
# → http://localhost:3000

# テスト (Vitest)
pnpm test
pnpm test:watch

# 型 / Lint / Format
pnpm typecheck
pnpm lint
pnpm format

# 静的データ (YAML → JSON) を手動再生成
pnpm build:data

# プロダクションビルド
pnpm build
```

## API エンドポイント (Slice 1)

| メソッド | パス                                | 用途                                            |
| -------- | ----------------------------------- | ----------------------------------------------- |
| `GET`    | `/api/health`                       | ヘルスチェック                                  |
| `GET`    | `/api/locales`                      | 都道府県一覧                                    |
| `GET`    | `/api/locales/:id/ingredients`      | 地元の食材一覧 (`?season=` `?category=` で絞込) |
| `POST`   | `/api/quicktap/sessions`            | 候補 3 案を NDJSON ストリームで生成             |
| `POST`   | `/api/quicktap/sessions/:id/reroll` | 別 seed で振り直し                              |

---

## ディレクトリ構成

```
.
├── app/                    # Next.js App Router (画面 + route handler)
├── src/
│   ├── domain/             # 純粋なドメイン型 + Zod schema
│   ├── lib/                # インフラ層 (agent / http / localstorage / observability)
│   ├── stores/             # Zustand
│   ├── components/         # UI コンポーネント (CSS Modules)
│   ├── hooks/              # React フック
│   ├── data/               # 生成 JSON (build:data の出力)
│   └── styles/             # トークン CSS / テクスチャ
├── agent/data/             # 食材 YAML (静的データの正本)
├── scripts/                # ビルド/データ生成スクリプト (TypeScript)
├── tests/e2e/              # Playwright (Slice 1 は smoke 1 本のみ)
├── docs/                   # 永続的ドキュメント
└── .steering/              # 作業単位の steering (要件 / 設計 / タスク)
```

依存方向: `app → components → hooks/stores → lib → domain` (`import/no-restricted-paths` で機械的に強制)。

---

## 関連ドキュメント

- [プロダクト要求定義](docs/product-requirements.md)
- [機能設計書](docs/functional-design.md)
- [技術仕様書](docs/architecture.md)
- [リポジトリ構造定義](docs/repository-structure.md)
- [開発ガイドライン](docs/development-guidelines.md)
- [ユビキタス言語定義](docs/glossary.md)
- [Slice 1 ステアリング](.steering/20260513-initial-implementation/)
  - [requirements.md](.steering/20260513-initial-implementation/requirements.md)
  - [design.md](.steering/20260513-initial-implementation/design.md)
  - [tasklist.md](.steering/20260513-initial-implementation/tasklist.md)

---

## 既知の事項

- **Turbopack + `next/font/google` の解決バグ**: Next 16.2.6 で `dev` / `build` ともに workaround として `--webpack` 明示中 (`package.json` 参照)。Next 側修正が出たら外す。
- **Vitest 4 採用**: `design.md` は Vitest 2 を指定していたが古いため最新を採用。
- **Mock Agent**: Slice 1 は `MockAgentClient` で決定論的 3 案を返す。Slice 2 で Python ADK Agent (Cloud Run) に差し替え。

## ライセンス

Private (open source 化は未定)。
