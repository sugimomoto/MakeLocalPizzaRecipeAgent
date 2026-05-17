# makelocal-agent

**Make Local Pizza Recipe Agent** の Python 側サービス。
Google ADK + Vertex AI (Gemini 2.5 Flash) で 3 戦略軸 (王道 / 一歩外す / 大冒険) の
ピザレシピ候補を並列生成し、NDJSON ストリームで返す。

> Slice 2 範囲: ローカル uvicorn 起動 + Web (Next.js) からの HTTP 連携まで。
> Cloud Run デプロイ / Terraform は Slice 6 で実装。

---

## エンドポイント

| メソッド | パス                         | 用途                         |
| -------- | ---------------------------- | ---------------------------- |
| `GET`    | `/`                          | サービスの疎通確認           |
| `GET`    | `/agent/health`              | ヘルスチェック (`{ok:true}`) |
| `POST`   | `/agent/generate-candidates` | 3 案 NDJSON ストリーム       |
| `POST`   | `/agent/reroll`              | 別 seed で再生成             |

詳細スキーマは [`src/makelocal_agent/routes/`](src/makelocal_agent/routes/) と
[`src/makelocal_agent/domain/stream.py`](src/makelocal_agent/domain/stream.py) を参照。

---

## セットアップ

DevContainer 内で完結します (`uv` と Python 3.12 は最初から入っている)。

```bash
cd agent
uv sync --extra dev
```

## 起動

```bash
uv run uvicorn makelocal_agent.main:app --port 8080 --reload
```

http://localhost:8080/agent/health で `{"ok": true}` が返れば OK。

## 環境変数

ルート `.env.example` の `MLPR_*` 群を参照。主なもの:

| 変数                         | デフォルト              | 用途                                                             |
| ---------------------------- | ----------------------- | ---------------------------------------------------------------- |
| `MLPR_GOOGLE_CLOUD_PROJECT`  | (空)                    | Vertex AI プロジェクト ID。空なら自動で `USE_MOCK_LLM=true` 相当 |
| `MLPR_VERTEX_AI_LOCATION`    | `asia-northeast1`       | Vertex AI リージョン                                             |
| `MLPR_GEMINI_MODEL`          | `gemini-2.5-flash`      | モデル名                                                         |
| `MLPR_USE_MOCK_LLM`          | `false`                 | `true` で LLM を `MockLlmClient` に切替 (CI / オフライン dev)    |
| `MLPR_MAX_TIMEOUT_SEC`       | `60`                    | 1 リクエスト全体タイムアウト                                     |
| `MLPR_INGREDIENTS_YAML_PATH` | `data/ingredients.yaml` | 食材データ                                                       |

## Gemini を実際に呼ぶ場合

`gcloud auth application-default login` で ADC を設定:

```bash
gcloud auth application-default login --no-launch-browser
export MLPR_GOOGLE_CLOUD_PROJECT=your-project-id
uv run uvicorn makelocal_agent.main:app --port 8080 --reload
```

Web 側から呼ぶときは `AGENT_MODE=http` を設定:

```bash
# repo root
AGENT_MODE=http pnpm dev
```

---

## テスト / Lint

```bash
uv run pytest              # Gemini はモック、~90 tests pass
uv run ruff check .
uv run ruff format --check .
uv run mypy .              # strict mode
```

すべて CI (`.github/workflows/ci.yml` の python ジョブ) でも実行される。

## パッケージ構造

```
agent/
├── pyproject.toml
├── data/
│   └── ingredients.yaml         # ← Web と共有 (Slice 1 から既存)
├── src/makelocal_agent/
│   ├── main.py                  # FastAPI app + global exception handler
│   ├── deps.py                  # LlmClient プロトコル + factory (mock/ADK 切替)
│   ├── routes/                  # health / generate-candidates / reroll
│   ├── agents/
│   │   ├── adk_client.py        # Google ADK + Vertex Gemini 実装
│   │   ├── candidates_agent.py  # 戦略別 instruction + CandidateLlmOutput
│   │   ├── prompt.py            # 入力プロンプト構築
│   │   └── orchestrator.py      # 3 戦略並列実行 → NDJSON yield
│   ├── domain/                  # Pydantic 型 (TS 側 src/domain/* と semantic 同期)
│   ├── data/
│   │   └── ingredients_repository.py  # YAML → Pydantic
│   └── lib/
│       ├── settings.py          # pydantic-settings (MLPR_*)
│       ├── logging.py           # 構造化ログ (TS logger と shape 同期)
│       └── ndjson.py            # StreamEvent → bytes
└── tests/                       # pytest (LlmClient はモック)
```
