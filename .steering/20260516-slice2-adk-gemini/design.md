# Slice 2 設計書 (Python ADK Agent + Vertex Gemini)

> 本書は [`requirements.md`](requirements.md) を実装するための設計を記述する。
> 永続的アーキテクチャは [`docs/architecture.md`](../../docs/architecture.md)、
> パッケージ構造は [`docs/repository-structure.md`](../../docs/repository-structure.md) を参照。
> Slice 1 縦貫スタックに変更を加える設計判断は本書で集約。

---

## 1. 設計の全体方針

### 1.1 5 つの設計判断

1. **NDJSON 契約を絶対に変えない**
   - Slice 1 の `src/domain/schemas.ts` (Zod) と Python `domain.py` (Pydantic) を semantic に同期
   - Web 側 (`useQuickTapStream`, `decodeNdjsonStream`) は無改修
   - 切替は `AgentClient` interface 実装の差し替えだけで成立

2. **ADK は LlmAgent を 1 つだけ使う (Slice 2 範囲)**
   - 戦略軸 3 つを **3 並列の LlmAgent 呼び出し** として実行
   - tools (ingredient lookup 等) は導入せず、プロンプト + 構造化出力で成立させる
   - tools の本格活用は Slice 5 (楽天連動) で

3. **構造化出力 (response_schema) で型保証**
   - Gemini に Pydantic モデルを `response_schema` として渡す
   - 出力 shape のブレを排除、エラーハンドリングを単純化

4. **並列実行は asyncio.TaskGroup で隊形管理**
   - 3 戦略を `asyncio.create_task` で同時起動
   - 完了順 (= 速いもの先) に NDJSON で yield → UI の段階表示と相性が良い
   - 1 つが失敗しても残りは流す (best-effort)

5. **FastAPI + sse_starlette の StreamingResponse で NDJSON 配信**
   - `Content-Type: application/x-ndjson` で 1 行 1 JSON
   - `\n` 終端、`flush` のたびに UI へ届く

### 1.2 Slice 2 が決めること / 決めないこと

| カテゴリ | 決めること | 決めないこと (将来) |
| --- | --- | --- |
| Agent 構造 | LlmAgent 1 つ × 3 並列呼び出し | ツール群 (Slice 5), Multi-agent orchestration (Slice 7) |
| 認証 | 開発時は無認証 (localhost) | IAM ID トークン (Slice 6) |
| プロンプト | 戦略軸ごとの system instruction + JSON schema | 履歴・FB 反映、TraitsAgent (Slice 4 以降) |
| データ | YAML 起動時ロード | DB 化、リアルタイム更新 (将来) |
| 観測 | print/logging のみ | Cloud Trace / OTel (Slice 6) |

---

## 2. アーキテクチャ

### 2.1 全体図 (Slice 2 終了時点)

```
┌────────────────────────────┐         ┌────────────────────────────────────┐
│   Browser (Next.js Client) │         │  Python Agent (uvicorn :8080)      │
│                            │         │                                    │
│  useQuickTapStream         │  POST   │  FastAPI                           │
│    fetch /api/quicktap/    │ ──────► │   /agent/generate-candidates       │
│      sessions              │         │    └─ LlmAgent ×3 並列 (TaskGroup) │
│                            │         │         └─ Vertex Gemini 2.5 Flash │
└────────────────────────────┘         └────────────────────────────────────┘
              ▲                                       │
              │  NDJSON ストリーム                   │  Vertex AI SDK
              │  (application/x-ndjson)              │
              │                                       ▼
┌─────────────────────────────┐         ┌──────────────────────────────────┐
│  Next.js Route Handler      │         │   Google Cloud                   │
│  /api/quicktap/sessions     │         │   - Vertex AI                    │
│    └─ HttpAgentClient ──────┼────────►│   - Gemini 2.5 Flash             │
│         AGENT_MODE=http     │  HTTP   │                                  │
│         (mock 時は MockAgent│         └──────────────────────────────────┘
│         Client)             │
└─────────────────────────────┘
```

### 2.2 ローカル開発のプロセス構成

```
Terminal 1 (Web)              Terminal 2 (Agent)
$ pnpm dev                    $ cd agent && uv run uvicorn ...
  Next.js (3000) ─────────►   FastAPI (8080)
  AGENT_MODE=http             ADC → Vertex AI
```

`AGENT_MODE` 未設定または `mock` の場合、Next.js が MockAgentClient を使うため
Agent プロセス不要 (Slice 1 と完全互換)。

---

## 3. Python パッケージ構造

`agent/` は独立した Python パッケージ。Web の monorepo と並列。

```
agent/
├── pyproject.toml                  # 依存・ツール設定 (uv 管理)
├── uv.lock                         # 依存ロック (commit する)
├── ruff.toml                       # lint 設定 (またはpyproject.toml に集約)
├── README.md                       # agent 単独で起動・テスト手順
├── data/
│   └── ingredients.yaml            # ← Web と共有 (Slice 1 から既存)
├── src/
│   └── makelocal_agent/
│       ├── __init__.py
│       ├── main.py                 # FastAPI app instance + uvicorn entry
│       ├── routes/
│       │   ├── __init__.py
│       │   ├── health.py           # GET /agent/health
│       │   ├── candidates.py       # POST /agent/generate-candidates
│       │   └── reroll.py           # POST /agent/reroll
│       ├── agents/
│       │   ├── __init__.py
│       │   └── candidates_agent.py # ADK LlmAgent (戦略 1 軸を担当)
│       ├── domain/
│       │   ├── __init__.py
│       │   ├── locale.py           # Locale / Region 型 (Pydantic)
│       │   ├── ingredient.py       # Ingredient / Season / Category
│       │   ├── candidate.py        # Strategy / STRATEGY_LABELS / Candidate
│       │   └── stream.py           # StreamEvent (discriminated union)
│       ├── data/
│       │   ├── __init__.py
│       │   └── ingredients_repository.py  # YAML ロード + クエリ
│       ├── lib/
│       │   ├── __init__.py
│       │   ├── ndjson.py           # NDJSON エンコード (StreamingResponse 用)
│       │   ├── logging.py          # 構造化ログ (TS logger と shape 合わせる)
│       │   └── settings.py         # Pydantic Settings (env var)
│       └── deps.py                 # Vertex / Gemini クライアント DI
└── tests/
    ├── __init__.py
    ├── conftest.py                 # 共通 fixture (Vertex モック等)
    ├── test_health.py
    ├── test_candidates_agent.py    # LlmAgent のモック試験
    ├── test_routes_candidates.py   # FastAPI TestClient
    └── test_ndjson.py
```

### 3.1 pyproject.toml 主要依存

| 依存 | 用途 |
| --- | --- |
| `python = ">=3.12,<3.13"` | 言語 |
| `fastapi` | ルーティング + Pydantic 統合 |
| `uvicorn[standard]` | ASGI サーバ |
| `google-adk` | ADK Agent framework |
| `google-cloud-aiplatform` | Vertex AI SDK (Gemini 経由) |
| `pydantic >= 2` | スキーマ + 設定 |
| `pydantic-settings` | env var 読込 |
| `pyyaml` | ingredients.yaml ロード |
| `httpx` | tests/外部呼び出しダミー (任意) |

dev 依存:
| 依存 | 用途 |
| --- | --- |
| `pytest`, `pytest-asyncio` | テスト |
| `ruff` | lint + format |
| `mypy` | 型チェック |
| `types-pyyaml` | 型 stub |

---

## 4. ドメインモデル (Python ↔ TS 同期)

### 4.1 同期方針

- **TS 側**を正本扱い (Slice 1 で確立済)
- Python はそのフィールド名・enum 値を完全コピー
- enum はリテラル文字列 ("exploit" / "tune" / "explore" 等)
- snake_case ではなく **camelCase で揃える** (JSON wire 形式が camelCase なため)

### 4.2 Pydantic モデル例

```python
# agent/src/makelocal_agent/domain/candidate.py
from typing import Literal
from pydantic import BaseModel, Field

Strategy = Literal["exploit", "tune", "explore"]

class Candidate(BaseModel):
    candidateId: str
    strategy: Strategy
    title: str
    concept: str
    keyIngredients: list[str]
    sceneTags: list[str]
    why: str
```

```python
# agent/src/makelocal_agent/domain/stream.py
from typing import Literal, Union
from pydantic import BaseModel, Field
from .candidate import Strategy

class SessionStartEvent(BaseModel):
    type: Literal["session.start"] = "session.start"
    sessionId: str
    strategies: list[Strategy]

class CandidateStartEvent(BaseModel):
    type: Literal["candidate.start"] = "candidate.start"
    strategy: Strategy
    candidateId: str

# ... 他 8 種類

StreamEvent = Union[
    SessionStartEvent,
    CandidateStartEvent,
    CandidateTitleEvent,
    CandidateConceptEvent,
    CandidateIngredientsEvent,
    CandidateSceneTagsEvent,
    CandidateWhyEvent,
    CandidateDoneEvent,
    SessionDoneEvent,
    ErrorEvent,
]
```

### 4.3 検証

- `StreamEvent.model_dump_json()` の出力が Web 側 Zod スキーマで parse できるかを **手動 + テスト** で確認
  - 自動的な「双方向同期チェック」は Slice 6 に置く (overkill 防止)

---

## 5. ADK エージェント設計

### 5.1 LlmAgent の構成

```python
# agent/src/makelocal_agent/agents/candidates_agent.py
from google.adk.agents import LlmAgent
from pydantic import BaseModel
from ..domain.candidate import Strategy, Candidate

STRATEGY_INSTRUCTION: dict[Strategy, str] = {
    "exploit": "あなたは王道のピザを提案するシェフ。定番の組合せで失敗しない一枚を作ります。",
    "tune": "あなたは一歩外したアレンジを得意とするシェフ。柑橘や酸味で軽やかさを加えます。",
    "explore": "あなたは大冒険を厭わないシェフ。意外性で記憶に残る一枚を提案します。",
}

class CandidateLlmOutput(BaseModel):
    """Gemini の構造化出力先 (Candidate と semantic 同等だが id は後付け)。"""
    title: str
    concept: str
    keyIngredients: list[str]
    sceneTags: list[str]
    why: str

def build_candidate_agent(strategy: Strategy) -> LlmAgent:
    return LlmAgent(
        name=f"candidates_{strategy}",
        model="gemini-2.5-flash",
        instruction=STRATEGY_INSTRUCTION[strategy],
        output_schema=CandidateLlmOutput,
    )
```

### 5.2 プロンプト設計 (1 戦略あたり)

入力プロンプト (テンプレート):

```
[システム指示 = STRATEGY_INSTRUCTION[strategy]]

地元: {prefecture_jp} ({region_jp})
選択された食材:
- {ingredient1.name} ({ingredient1.story})
- {ingredient2.name} ({ingredient2.story})
{...}

参考 (同地元の他の旬食材):
- {hint1.name}
- {hint2.name}

【出力ルール】
- title: 30 字以内、ピザ名 (例「松島牡蠣とせりの白ピザ」)
- concept: 50〜80 字、コンセプト 1 行
- keyIngredients: 選択食材 + 補完 1〜2 個 (チーズ等)
- sceneTags: 2〜3 個 (例「ワインに合う」「週末家族」)
- why: 50〜100 字、なぜこの提案かを 1 段落
- 日本語で出力。記号は最小限。
```

### 5.3 戦略 3 並列実行

```python
# agent/src/makelocal_agent/agents/orchestrator.py
import asyncio
from .candidates_agent import build_candidate_agent
from ..domain.candidate import Strategy

STRATEGIES: list[Strategy] = ["exploit", "tune", "explore"]

async def generate_three_candidates(
    locale, ingredients, hints, session_id
) -> AsyncIterator[StreamEvent]:
    yield SessionStartEvent(sessionId=session_id, strategies=STRATEGIES)

    queue: asyncio.Queue[StreamEvent] = asyncio.Queue()

    async def run_one(strategy: Strategy, idx: int):
        candidate_id = f"c_{idx}_{session_id[-6:]}"
        await queue.put(CandidateStartEvent(strategy=strategy, candidateId=candidate_id))
        agent = build_candidate_agent(strategy)
        try:
            out = await agent.run(prompt=build_prompt(locale, ingredients, hints, strategy))
            await queue.put(CandidateTitleEvent(candidateId=candidate_id, title=out.title))
            await queue.put(CandidateConceptEvent(candidateId=candidate_id, concept=out.concept))
            await queue.put(CandidateIngredientsEvent(...))
            await queue.put(CandidateSceneTagsEvent(...))
            await queue.put(CandidateWhyEvent(...))
            await queue.put(CandidateDoneEvent(candidateId=candidate_id))
        except Exception as e:
            await queue.put(ErrorEvent(code="GEMINI_FAIL", message=str(e)))

    async with asyncio.TaskGroup() as tg:
        for i, s in enumerate(STRATEGIES, 1):
            tg.create_task(run_one(s, i))
        # 並行して queue を drain
        # ... (drain ループは別タスクで yield する設計)

    yield SessionDoneEvent(sessionId=session_id)
```

> **設計上の注意**: queue を使うのは「速いものから yield する」ため。3 戦略の終了を待ってから順次 yield すると UX が崩れる (Slice 1 の段階表示の意味が薄れる)。

### 5.4 LlmAgent の戻り値型

ADK の `LlmAgent.run()` は output_schema を渡すと **Pydantic インスタンス**を返す想定 (実装で確認)。
もし dict / 文字列で返るなら `CandidateLlmOutput.model_validate(...)` で narrow。

---

## 6. FastAPI ルート設計

### 6.1 ルート一覧

| メソッド | パス | 用途 | レスポンス |
| --- | --- | --- | --- |
| GET | `/agent/health` | 死活確認 | `{"ok": true}` JSON |
| POST | `/agent/generate-candidates` | 3 案生成 | NDJSON ストリーム |
| POST | `/agent/reroll` | 別 seed で再生成 | NDJSON ストリーム |

### 6.2 リクエスト/レスポンス schema (Pydantic)

```python
class GenerateCandidatesRequest(BaseModel):
    sessionId: str
    localeId: str
    ingredients: list[str]
    guestSessionId: str | None = None

class RerollRequest(BaseModel):
    sessionId: str
    guestSessionId: str | None = None
```

### 6.3 StreamingResponse 実装

```python
# agent/src/makelocal_agent/routes/candidates.py
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from ..agents.orchestrator import generate_three_candidates
from ..lib.ndjson import to_ndjson_lines

router = APIRouter(prefix="/agent")

@router.post("/generate-candidates")
async def generate(req: GenerateCandidatesRequest):
    async def gen():
        async for event in generate_three_candidates(...):
            yield to_ndjson_lines(event)
    return StreamingResponse(gen(), media_type="application/x-ndjson")
```

### 6.4 ndjson ヘルパ

```python
# agent/src/makelocal_agent/lib/ndjson.py
from typing import AsyncIterator
from ..domain.stream import StreamEvent

def to_ndjson_lines(event: StreamEvent) -> bytes:
    return (event.model_dump_json() + "\n").encode("utf-8")
```

### 6.5 エラーハンドリング

- リクエスト schema 違反: FastAPI が自動で 422 + JSON
- Vertex AI 例外: `gen()` 内で catch → `ErrorEvent` を 1 行 yield して `StopAsyncIteration`
- それ以外: 500 (グローバル exception handler で `{"error":{"code","message"}}` 統一)

---

## 7. Web 側 (TypeScript) 変更

### 7.1 HttpAgentClient

```typescript
// src/lib/agent/http-client.ts
import type { AgentClient, GenerateCandidatesInput } from './client';

export class HttpAgentClient implements AgentClient {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number = 60_000,
  ) {}

  async generateCandidates(input: GenerateCandidatesInput): Promise<ReadableStream<Uint8Array>> {
    const res = await fetch(`${this.baseUrl}/agent/generate-candidates`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok || !res.body) {
      throw new Error(`Agent HTTP ${res.status}`);
    }
    return res.body;
  }

  async reroll(sessionId: string): Promise<ReadableStream<Uint8Array>> { /* similar */ }
}
```

### 7.2 ファクトリ (BFF route から呼ぶ)

```typescript
// src/lib/agent/factory.ts
import { MockAgentClient } from './mock-candidates';
import { HttpAgentClient } from './http-client';

export function createAgentClient(): AgentClient {
  const mode = process.env.AGENT_MODE ?? 'mock';
  if (mode === 'http') {
    const baseUrl = process.env.AGENT_BASE_URL ?? 'http://localhost:8080';
    const timeoutMs = Number(process.env.AGENT_TIMEOUT_MS ?? 60_000);
    return new HttpAgentClient(baseUrl, timeoutMs);
  }
  return new MockAgentClient(
    process.env.NODE_ENV === 'test' ? { delayRange: { min: 0, max: 0 } } : {},
  );
}
```

### 7.3 既存 BFF route の差し替え

`app/api/quicktap/sessions/route.ts` と `[id]/reroll/route.ts` で
`new MockAgentClient(...)` を `createAgentClient()` に置換。
**契約は同じ**なので route のレスポンス処理は無改修。

### 7.4 環境変数追加

`.env.example` に追加:
```
AGENT_MODE=mock        # mock | http
AGENT_BASE_URL=http://localhost:8080
AGENT_TIMEOUT_MS=60000
```

---

## 8. テスト戦略

### 8.1 Python (`pytest`)

#### 単体テスト
- `test_ndjson.py`: StreamEvent → NDJSON 行のエンコード正しさ
- `test_candidates_agent.py`:
  - LlmAgent を **モックして** Pydantic CandidateLlmOutput を返す
  - orchestrator が 23 イベント (Slice 1 と同等数) を yield することを確認
  - 1 戦略が失敗したとき、残り 2 戦略 + ErrorEvent が流れることを確認
- `test_ingredients_repository.py`: YAML ロード + locale フィルタ

#### 統合テスト (FastAPI TestClient)
- `test_routes_candidates.py`:
  - POST 200 + Content-Type
  - レスポンス body を 1 行ずつ parse → 順序検証
  - 422 (リクエスト不正)

#### Gemini モック方針
- `google.adk.agents.LlmAgent.run` を `unittest.mock.AsyncMock` で patch
- 実 Vertex 呼び出しはユニットテストではしない (CI コスト + flakiness 回避)
- 実呼び出しは手動 smoke のみ (`make smoke-agent` 等)

### 8.2 TypeScript

- `test/http-client.test.ts`:
  - fetch をモックして 200 + 適当な NDJSON body を返す
  - generateCandidates / reroll の URL・method・body を検証
  - 5xx / timeout のエラー伝播
- `test/factory.test.ts`:
  - AGENT_MODE=mock → MockAgentClient
  - AGENT_MODE=http → HttpAgentClient

### 8.3 E2E (smoke) — 手動

Vertex AI を呼ぶため CI からは除外。README に手順を記載:
```
$ gcloud auth application-default login
$ AGENT_MODE=http pnpm dev &
$ cd agent && uv run uvicorn ...
$ # ブラウザで踏破
```

---

## 9. CI 設計

### 9.1 `.github/workflows/ci.yml` 拡張

```yaml
jobs:
  node:
    # 既存 (Slice 1)
    ...
  python:
    name: Python — ruff / mypy / pytest
    runs-on: ubuntu-latest
    timeout-minutes: 10
    defaults:
      run:
        working-directory: ./agent
    steps:
      - uses: actions/checkout@v4
      - name: Setup uv
        uses: astral-sh/setup-uv@v3
        with:
          version: latest
      - name: Setup Python
        run: uv python install 3.12
      - name: Install
        run: uv sync --frozen
      - name: Lint
        run: uv run ruff check .
      - name: Typecheck
        run: uv run mypy .
      - name: Test
        run: uv run pytest
```

Node と Python は **完全並列実行** (依存なし)。

---

## 10. 主要シーケンス

### 10.1 候補生成 (新規)

```
Browser              Next.js Route       HttpAgentClient    Python /agent       Vertex AI
   │  POST sessions      │                   │                  │                  │
   │ ───────────────────►│                   │                  │                  │
   │                     │  createAgent()    │                  │                  │
   │                     │ ─────────────────►│                  │                  │
   │                     │                   │ POST /agent/gen  │                  │
   │                     │                   │ ────────────────►│                  │
   │                     │                   │                  │ asyncio.TaskGroup│
   │                     │                   │                  │   ├─ exploit ───►│ Gemini call
   │                     │                   │                  │   ├─ tune    ───►│ Gemini call
   │                     │                   │                  │   └─ explore ───►│ Gemini call
   │                     │                   │                  │                  │
   │ ◄═══════════ NDJSON stream (passthrough) ═══════════════════│ ◄═══ events ════│
   │                     │                   │                  │  (queue で速い順) │
```

### 10.2 mock → http 切替

- `AGENT_MODE=mock` (default): Slice 1 と完全同等の挙動 (Python agent 不要)
- `AGENT_MODE=http`: HttpAgentClient → Python agent → Vertex AI

切替は **環境変数のみ**。コード変更不要。

---

## 11. 影響範囲分析

| 既存ファイル | 影響 |
| --- | --- |
| `src/lib/agent/client.ts` | 変更なし (interface は維持) |
| `src/lib/agent/mock-candidates.ts` | 変更なし |
| `src/lib/agent/stream.ts` | 変更なし (NDJSON 受信ヘルパ) |
| `app/api/quicktap/sessions/route.ts` | **2 行変更** (new MockAgentClient → createAgentClient) |
| `app/api/quicktap/sessions/[id]/reroll/route.ts` | **2 行変更** |
| `.env.example` | 3 行追記 (AGENT_MODE/BASE_URL/TIMEOUT_MS) |
| `README.md` | Python セットアップ章を追加 |
| `.github/workflows/ci.yml` | python ジョブ追加 |
| `.devcontainer/post-create.sh` | uv 関連の追記 (既に uv 入ってる場合は no-op) |
| `agent/data/ingredients.yaml` | 変更なし (両方が参照) |

新規追加は `agent/` 配下 + `src/lib/agent/http-client.ts`, `factory.ts` のみ。
**Slice 1 の挙動を一切壊さない** のが本スライスの最重要設計目標。

---

## 12. 設計上のリスク・トレードオフ

| 項目 | 採用案 | 代替案 | 採用理由 |
| --- | --- | --- | --- |
| Agent framework | **ADK** | Vertex SDK 直叩き | ハッカソン審査で「ADK 使ってる」が PR ポイント、tools/orchestration の将来拡張余地 |
| 並列実行 | **asyncio.TaskGroup** | sequential | UX (段階表示) の維持 + 全体レイテンシ短縮 |
| 並列 yield 順 | **完了順 (queue)** | 戦略順固定 | 速いものから見せた方が体感が良い |
| 構造化出力 | **Pydantic response_schema** | 自由テキスト + parse | shape ブレ排除、エラー減 |
| モデル | **Gemini 2.5 Flash** | Pro | Slice 2 は文章生成のみ、Flash で十分。Pro は Slice 3 (詳細) |
| 認証 | **無認証 (localhost)** | IAM ID token | ローカル開発の摩擦回避、本番は Slice 6 |
| エラー UI | **ErrorEvent を NDJSON で送る** | HTTP 5xx で打ち切り | 部分成功 (2 戦略成功 + 1 失敗) を表現できる |

---

## 13. 改訂履歴

| 日付 | 版 | 変更内容 |
| --- | --- | --- |
| 2026-05-16 | 1.0 | 初版作成 |
