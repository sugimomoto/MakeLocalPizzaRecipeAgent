# Slice 3 設計書 (詳細画面 + Imagen 画像生成)

> 本書は [`requirements.md`](requirements.md) を実装するための設計を記述する。
> 永続的アーキテクチャは [`docs/architecture.md`](../../docs/architecture.md) を参照。
> Slice 2 で固めた NDJSON / ADK / Vertex 基盤を **そのまま流用** し、recipe.* と image.* イベントを追加する。

---

## 1. 設計の全体方針

### 1.1 5 つの設計判断

1. **NDJSON discriminated union を「追加」だけで拡張**
   - Slice 1〜2 の `StreamEvent` 既存 10 種類を一切変えず、`recipe.*` (6 種) + `image.*` (3 種) を足すだけ
   - Python (Pydantic Annotated Union) と TS (Zod discriminatedUnion) の双方に同じ shape を追加
   - Web 側の `decodeNdjsonStream` は無改修で新イベントも parse できる

2. **テキスト (Gemini) と画像 (Imagen) を asyncio.TaskGroup で並行**
   - Slice 2 の 3 戦略並列と同じパターン: queue 経由で完了順に yield
   - **テキストが先に届き、画像が数秒遅れて入る** という体験を意図
   - 1 つ失敗しても他は流す (image.error / recipe.error 単独)

3. **Imagen 出力は base64 data URI で NDJSON 1 行に乗せる**
   - GCS 永続化 (Slice 4 or 6) までは毎回再生成
   - data URI の重さ (~数 MB) を許容: 1 リクエスト 1 画像のため UX には実害なし
   - 将来 GCS 化したら `image.ready { dataUri }` を `image.ready { url }` に拡張 (互換)

4. **詳細画面の画像生成失敗は recipe 表示を阻害しない**
   - `image.error` 単独 → UI はテキスト全部表示 + 画像エリアだけスケルトン残し
   - `recipe.error` → 全体終了 (テキスト無しでは画面が成立しない)

5. **保存系は UI のみ作って alert 止め**
   - DetailScreen にハート / 「ピザ帳に保存」/ 「作ってみる」を配置
   - クリックは `window.alert("Slice 4 で実装予定です")` (規範コメント明示)
   - Slice 4 では Firestore + Auth を追加するだけで本実装に差し替わる足場

### 1.2 Slice 3 が決めること / 決めないこと

| カテゴリ | 決めること | 決めないこと (将来) |
| --- | --- | --- |
| 詳細レシピ生成 | Gemini Flash + Pydantic 構造化出力 + 並列 | Pro 切替 / 履歴反映 (Slice 4+) |
| 画像生成 | Imagen 4 / base64 / 失敗時継続 | GCS 永続化 / WebP 変換 (Slice 4 or 6) |
| 保存 | UI のみ・alert | Firestore CRUD (Slice 4) |
| ルーティング | `/recipes/[candidateId]` Web / `/agent/recipes/[id]` Agent | キャッシュ層 (Slice 7 で検討) |
| 観測 | 既存 logger.info で十分 | Cloud Trace / OTel (Slice 6) |

---

## 2. アーキテクチャ

### 2.1 全体図 (Slice 3 終了時点)

```
┌──────────────────────────┐         ┌────────────────────────────────────┐
│ Browser (Next.js client) │         │  Python Agent (uvicorn :8080)      │
│                          │  POST   │                                    │
│  useRecipeDetailStream   │ ──────► │  FastAPI                           │
│    fetch /api/recipes/…  │         │   /agent/recipes/[candidateId]     │
└──────────────────────────┘         │    └─ asyncio.TaskGroup (parallel) │
            ▲                        │         ├─ detail_agent (Gemini)   │
            │ NDJSON                 │         └─ image_agent  (Imagen)   │
            │ (recipe.* + image.*)   └────────────────────────────────────┘
            │                                       │
┌──────────────────────────┐                        │  Vertex AI SDK
│ Next.js Route Handler    │  HTTP (NDJSON)         ▼
│  /api/recipes/[id]       │ ◄────── pass-through  ┌──────────────────────┐
│   └─ HttpAgentClient.    │                       │  Vertex AI            │
│      generateRecipeDetail│                       │  - Gemini 2.5 Flash   │
└──────────────────────────┘                       │  - Imagen 4           │
                                                   └──────────────────────┘
```

### 2.2 1 リクエスト内のタイムライン (典型)

```
T=0       Web → POST /agent/recipes/[id]
T~50ms    recipe.start + image.start emitted (並行起動)
T~3-8s    detail_agent (Gemini Flash) 応答完了
          → recipe.title / recipe.meta / recipe.materials / recipe.steps / recipe.story / recipe.done
T~6-15s   image_agent (Imagen 4) 応答完了
          → image.ready { dataUri } (画像が ふわっと フェードイン)
```

テキストが先 → 画像が後で入る、という意図的な体験。

---

## 3. ドメイン拡張

### 3.1 RecipeDetailLlmOutput (Pydantic)

```python
# agent/src/makelocal_agent/domain/recipe.py
from pydantic import BaseModel, Field

class RecipeMaterial(BaseModel):
    name: str = Field(min_length=1)                 # 例: "強力粉 + 全粒粉"
    quantity: str = Field(min_length=1)             # 例: "300g"

class RecipeMeta(BaseModel):
    servings: str = Field(min_length=1)             # "4 人分"
    duration: str = Field(min_length=1)             # "45m"
    bakingTemp: str = Field(min_length=1)           # "270°C"
    difficulty: str = Field(min_length=1)           # "★★☆"

class RecipeDetailLlmOutput(BaseModel):
    title: str = Field(min_length=1)                # 候補 title と semantic 同じだが LLM 出力からのスナップショット
    meta: RecipeMeta
    materials: list[RecipeMaterial] = Field(min_length=3)
    steps: list[str] = Field(min_length=3)          # 番号付きステップ (LLM が自然順で並べる)
    storyEyebrow: str = Field(min_length=1)         # "ゲストに語る"
    storyHeadline: str = Field(min_length=1)        # "松島の牡蠣と、名取のせり。"
    storyBody: str = Field(min_length=1)            # 1〜2 文の解説
```

### 3.2 NDJSON StreamEvent 拡張

既存 10 イベントに加えて 9 イベント追加 (合計 19):

```python
# recipe.* (テキスト系、6 種)
RecipeStartEvent          {type:"recipe.start", recipeId:str}
RecipeTitleEvent          {type:"recipe.title", recipeId:str, title:str}
RecipeMetaEvent           {type:"recipe.meta", recipeId:str, meta:RecipeMeta}
RecipeMaterialsEvent      {type:"recipe.materials", recipeId:str, materials:list[RecipeMaterial]}
RecipeStepsEvent          {type:"recipe.steps", recipeId:str, steps:list[str]}
RecipeStoryEvent          {type:"recipe.story", recipeId:str, eyebrow:str, headline:str, body:str}
RecipeDoneEvent           {type:"recipe.done", recipeId:str}

# image.* (画像系、3 種)
ImageStartEvent           {type:"image.start", recipeId:str}
ImageReadyEvent           {type:"image.ready", recipeId:str, dataUri:str}
ImageErrorEvent           {type:"image.error", recipeId:str, code:str, message:str}
```

(7 = recipe 6 + start を 1 つカウント、image 3 を加えて合計 9 = 整理上、本書では recipe.start も明示しているので 6+3 = 9)

> 後方互換: 既存 Web (Slice 1) は知らないイベント `type` を見たら ValidationError を throw する設計だった。
> → **Web 側 StreamEvent (Zod) にも同じ 9 種を追加** し、parse できるようにする (本スライスで必須)。

### 3.3 TS 側 (Zod) の同期

`src/domain/schemas.ts` の `StreamEventSchema` に同じ 9 種を追加。
TS 側ドメイン型 (`src/domain/recipe.ts`) も新規作成。

---

## 4. detail_agent (Gemini Flash)

### 4.1 役割

候補 (Slice 2 出力) + 入力 (locale / ingredients) を受け取り、詳細レシピを構造化出力する。

```python
# agent/src/makelocal_agent/agents/detail_agent.py
from .candidates_agent import STRATEGY_INSTRUCTION  # 戦略系の前提を引き継ぐ
from ..domain.recipe import RecipeDetailLlmOutput

DETAIL_BASE_INSTRUCTION = """\
あなたは仙台のシェフ。和食の引き算の美学を持ちながら、
ピザという西洋料理を地元食材で組み立てる名手。
材料分量・手順・ストーリーを丁寧に作ります。
"""

async def run_recipe_detail(
    *,
    client: LlmClient,
    locale: Locale,
    selected: list[Ingredient],
    candidate: Candidate,
    model: str | None = None,
) -> RecipeDetailLlmOutput:
    prompt = build_detail_prompt(locale, selected, candidate)
    out = await client.run_structured(
        model=model or get_settings().gemini_model,
        instruction=DETAIL_BASE_INSTRUCTION,
        prompt=prompt,
        output_schema=RecipeDetailLlmOutput,
    )
    ...
```

### 4.2 プロンプト

```
地元: {locale.prefecture}
選択食材: ...
候補 (Slice 2 のサマリ):
- title: {candidate.title}
- concept: {candidate.concept}
- 戦略: {strategy.japaneseLabel}
- なぜ: {candidate.why}

【出力ルール】
- materials: 5〜8 品目、量は g / 個 / 適量 等を明示
- steps: 4〜6 ステップ、各 1 文で完結
- storyHeadline: 鍵カッコ付き 1〜2 行のキャッチ ("{location} の {ingredient} と、...")
- storyBody: 50〜100 字
- meta: servings (X 人分) / duration (Xm) / bakingTemp (X°C) / difficulty (★★☆ 等)
- 日本語、記号最小
```

---

## 5. image_agent (Imagen 4)

### 5.1 API 抽象

Slice 2 と同様にプロトコルで切替可能に:

```python
# agent/src/makelocal_agent/agents/imagen_client.py
from typing import Protocol

class ImagenClient(Protocol):
    async def generate_image(
        self, *, model: str, prompt: str, aspect_ratio: str = "1:1"
    ) -> bytes: ...  # PNG bytes

class VertexImagenClient:
    """Vertex AI Imagen 4 を呼ぶ実装 (本物)。"""

class MockImagenClient:
    """テスト用: 単色 PNG 1×1 を返す (data URI に変換可能)。"""
```

### 5.2 プロンプト (画像)

```python
# agent/src/makelocal_agent/agents/image_agent.py
def build_image_prompt(candidate: Candidate, locale: Locale) -> str:
    return (
        "Top-down photograph of an artisanal Japanese-style pizza on a wooden board. "
        f"Title: {candidate.title}. "
        f"Ingredients visible: {', '.join(candidate.keyIngredients)}. "
        f"Style: clean composition, natural light, washi paper background hint, "
        f"warm tones, food-photography quality. "
        f"Region: {locale.prefecture}, Japan."
    )
```

### 5.3 結果の data URI 変換

```python
async def run_image_for_candidate(...) -> str:
    png_bytes = await imagen.generate_image(model=..., prompt=...)
    b64 = base64.b64encode(png_bytes).decode("ascii")
    return f"data:image/png;base64,{b64}"
```

---

## 6. recipe_orchestrator

### 6.1 並列実行 (Slice 2 と同じパターン)

```python
# agent/src/makelocal_agent/agents/recipe_orchestrator.py

async def generate_recipe_detail(
    *,
    llm_client, imagen_client,
    recipe_id: str, locale, selected, candidate,
) -> AsyncIterator[StreamEvent]:
    yield RecipeStartEvent(recipeId=recipe_id)
    yield ImageStartEvent(recipeId=recipe_id)

    queue: asyncio.Queue[StreamEvent | object] = asyncio.Queue()

    async def run_detail():
        try:
            out = await run_recipe_detail(client=llm_client, locale=locale, selected=selected, candidate=candidate)
            await queue.put(RecipeTitleEvent(recipeId=recipe_id, title=out.title))
            await queue.put(RecipeMetaEvent(recipeId=recipe_id, meta=out.meta))
            await queue.put(RecipeMaterialsEvent(recipeId=recipe_id, materials=out.materials))
            await queue.put(RecipeStepsEvent(recipeId=recipe_id, steps=out.steps))
            await queue.put(RecipeStoryEvent(recipeId=recipe_id, eyebrow=out.storyEyebrow, headline=out.storyHeadline, body=out.storyBody))
            await queue.put(RecipeDoneEvent(recipeId=recipe_id))
        except Exception as e:
            await queue.put(ErrorEvent(code="RECIPE_FAIL", message=str(e)))

    async def run_image():
        try:
            data_uri = await run_image_for_candidate(client=imagen_client, candidate=candidate, locale=locale)
            await queue.put(ImageReadyEvent(recipeId=recipe_id, dataUri=data_uri))
        except Exception as e:
            await queue.put(ImageErrorEvent(recipeId=recipe_id, code="IMAGEN_FAIL", message=str(e)))

    async with asyncio.TaskGroup() as tg:
        tg.create_task(run_detail())
        tg.create_task(run_image())

    # drain (Slice 2 と同じ sentinel パターン)
    ...
```

---

## 7. FastAPI route

```python
# agent/src/makelocal_agent/routes/recipes.py

@router.post("/recipes/{candidate_id}")
async def generate_recipe(candidate_id: str, req: RecipeRequest):
    repo = _get_repo()
    locale = repo.find_locale(req.localeId)
    if not locale: raise HTTPException(404, ...)
    selected = [...]  # _resolve_inputs 風に解決

    llm = get_llm_client()
    imagen = get_imagen_client()

    async def gen():
        events = generate_recipe_detail(
            llm_client=llm, imagen_client=imagen,
            recipe_id=candidate_id,
            locale=locale, selected=selected,
            candidate=req.candidate,
        )
        async for chunk in encode_ndjson_stream(events):
            yield chunk
    return StreamingResponse(gen(), media_type="application/x-ndjson", headers={...})
```

リクエストボディ:
```python
class RecipeRequest(BaseModel):
    localeId: str
    ingredients: list[str]
    candidate: Candidate  # Slice 2 で生成された候補スナップショット
    guestSessionId: str | None = None
```

---

## 8. Web 側

### 8.1 AgentClient interface 拡張

```ts
// src/lib/agent/client.ts

export type GenerateRecipeDetailInput = {
  candidateId: string;
  localeId: string;
  ingredients: string[];
  candidate: Candidate;  // snapshot
  guestSessionId?: string;
};

export interface AgentClient {
  generateCandidates(input): Promise<ReadableStream<Uint8Array>>;
  reroll(sessionId: string): Promise<ReadableStream<Uint8Array>>;
  generateRecipeDetail(input: GenerateRecipeDetailInput): Promise<ReadableStream<Uint8Array>>;  // 追加
}
```

### 8.2 HttpAgentClient.generateRecipeDetail

```ts
async generateRecipeDetail(input) {
  const res = await fetch(`${this.baseUrl}/agent/recipes/${encodeURIComponent(input.candidateId)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(this.timeoutMs),
  });
  if (!res.ok || !res.body) throw new Error(`Agent HTTP ${res.status}`);
  return res.body;
}
```

### 8.3 MockAgentClient.generateRecipeDetail

スタブ: 数百 ms 後に 8 イベント (recipe.start..done + image.start + image.ready の data URI placeholder) を返す。

### 8.4 BFF route

```ts
// app/api/recipes/[candidateId]/route.ts
export const POST = withAuthOptional(async (req, ctx) => {
  const candidateId = ...;  // path から
  const body = await req.json();  // localeId, ingredients, candidate
  // Zod 検証
  const agent = createAgentClient();
  const stream = await agent.generateRecipeDetail({ candidateId, ...body });
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' }
  });
});
```

### 8.5 useRecipeDetailStream フック

```ts
type RecipeDetailState = {
  state: 'idle' | 'streaming' | 'recipeDone' | 'allDone' | 'error';
  recipeId: string | null;
  title?: string;
  meta?: RecipeMeta;
  materials?: RecipeMaterial[];
  steps?: string[];
  story?: { eyebrow: string; headline: string; body: string };
  imageDataUri?: string;
  imageError?: string;
  error?: string;
};

export function useRecipeDetailStream(): {
  state: ...,
  start: (input) => Promise<void>,
};
```

`useReducer` で各 recipe.* / image.* イベントを apply。

### 8.6 画面構成

```
<DetailScreen>
  <RecipeHero
    image={imageDataUri ?? placeholder}
    onBack={() => router.back()}
    onSave={() => alert('Slice 4 で実装予定')}
  />
  <Header>
    <Eyebrow>{locale.prefecture} · 今宵の一枚</Eyebrow>
    <Title mincho>{title ?? skeleton}</Title>
    <StrategySeal strategy={candidate.strategy} />
  </Header>
  <Concept>{candidate.concept}</Concept>
  <MetaStrip meta={meta ?? skeleton} />
  <Section label="食材" en="INGREDIENTS">
    <MaterialList items={materials ?? skeleton} />
  </Section>
  <Section label="手順" en="STEPS">
    <StepList steps={steps ?? skeleton} />
  </Section>
  <StoryCard story={story ?? skeleton} />
  <CTAs>
    <GhostBtn onClick={alert}>ピザ帳に保存</GhostBtn>
    <PrimaryBtn onClick={alert}>作ってみる</PrimaryBtn>
  </CTAs>
</DetailScreen>
```

### 8.7 候補画面からの遷移

`app/candidates/[sessionId]/_components/CandidatesClient.tsx`:
- 「この一枚に決める →」を `router.push('/recipes/' + activeCandidate.candidateId)` に変更
- sessionStorage に candidate スナップショット + localeId + ingredients を保存

`app/recipes/[candidateId]/_components/DetailClient.tsx`:
- mount 時に sessionStorage から取り出し → `useRecipeDetailStream.start(...)`

---

## 9. ディレクトリ追加 (Slice 3 終了時点)

```
agent/src/makelocal_agent/
├── agents/
│   ├── detail_agent.py           # ← NEW
│   ├── imagen_client.py          # ← NEW (Protocol + Vertex + Mock)
│   ├── image_agent.py            # ← NEW (prompt + run_image_for_candidate)
│   ├── recipe_orchestrator.py    # ← NEW
│   └── ...
├── domain/
│   ├── recipe.py                 # ← NEW (RecipeMaterial / RecipeMeta / RecipeDetailLlmOutput)
│   └── stream.py                 # ← extend (recipe.* + image.* 追加)
└── routes/
    └── recipes.py                # ← NEW

src/
├── domain/
│   ├── recipe.ts                 # ← NEW (TS 同期)
│   └── schemas.ts                # ← extend
├── hooks/
│   └── use-recipe-detail-stream.ts  # ← NEW
├── lib/agent/
│   ├── client.ts                 # ← extend
│   ├── http-client.ts            # ← extend
│   └── mock-candidates.ts        # ← extend (mock impl)
└── components/recipe/            # ← NEW
    ├── RecipeHero.tsx
    ├── MetaStrip.tsx
    ├── MaterialList.tsx
    ├── StepList.tsx
    └── StoryCard.tsx

app/
├── api/recipes/[candidateId]/route.ts   # ← NEW (BFF)
├── recipes/[candidateId]/
│   ├── page.tsx                          # ← NEW
│   └── _components/DetailClient.tsx      # ← NEW
└── candidates/[sessionId]/_components/CandidatesClient.tsx   # ← 「この一枚に決める」を Link 化
```

---

## 10. テスト戦略

### 10.1 Python (`pytest`)

- `test_domain_recipe.py`: Pydantic 検証 (材料 3 件以上、ステップ 3 件以上 等)
- `test_domain_stream_recipe.py`: 新規 9 種 StreamEvent の discriminated union 検証
- `test_detail_agent.py`: MockLlmClient で run_recipe_detail
- `test_image_agent.py`: MockImagenClient で run_image_for_candidate (data URI 生成)
- `test_recipe_orchestrator.py`: 並列ハッピーパス / image 失敗時 recipe 継続 / recipe 失敗時 ErrorEvent
- `test_routes_recipes.py`: TestClient で POST /agent/recipes/[id] (200 + NDJSON / 404 / 400 / 422)

### 10.2 TypeScript (`vitest`)

- `recipe.test.ts`: Recipe ドメイン型 (Material / Meta)
- `schemas.test.ts`: 新 StreamEvent 9 種 + 既存 10 種 (合計 19 種) の Zod 検証
- `http-client.test.ts` 拡張: generateRecipeDetail のテスト
- `mock-candidates.test.ts` 拡張: mock 実装
- `factory.test.ts` 維持
- `use-recipe-detail-stream.test.ts`: NDJSON → state 更新 / 部分失敗
- 各 UI コンポーネントの RTL テスト (Hero / MetaStrip / MaterialList / StepList / StoryCard)

### 10.3 E2E (smoke) — 手動

- `AGENT_MODE=http` で /candidates → 「決める」→ /recipes/[id]
- ハート / 「ピザ帳に保存」/「作ってみる」が alert する
- Imagen 失敗時の挙動 (vertexAI quota 抜きで実行 or env で `MLPR_FORCE_IMAGE_FAIL=true` 等の dev フラグ)

---

## 11. 影響範囲分析

| 既存ファイル | 影響 |
| --- | --- |
| `agent/src/.../domain/stream.py` | 9 種類 StreamEvent 追加 (既存無改修) |
| `agent/src/.../main.py` | recipes router 登録 1 行追加 |
| `agent/src/.../deps.py` | `get_imagen_client()` 追加 |
| `agent/data/ingredients.yaml` | 変更なし |
| `src/domain/schemas.ts` | 9 種類 StreamEvent 追加 (既存無改修) |
| `src/lib/agent/client.ts` | interface に method 追加 |
| `src/lib/agent/http-client.ts` | method 追加 |
| `src/lib/agent/mock-candidates.ts` | method 追加 |
| `src/lib/agent/factory.ts` | 変更なし |
| `app/candidates/.../CandidatesClient.tsx` | 「決める」を Link/router.push に置換 (2-3 行) |
| `.env.example` | MLPR_IMAGEN_MODEL 等を追記 |
| `README.md` | Slice 3 動作手順を追記 |

---

## 12. 設計上のリスク・トレードオフ

| 項目 | 採用案 | 代替案 | 採用理由 |
| --- | --- | --- | --- |
| 詳細モデル | **Gemini 2.5 Flash** | Pro | コスト + Slice 2 と同じスタック、品質はプロンプト工夫で吸収 |
| 画像 API | **Imagen 4** | Imagen 3 / DALL-E (Vertex 外) | ハッカソン要件 (Vertex AI 採用) + 4 系は品質改善 |
| 画像配信 | **base64 data URI** | GCS 署名付き URL | Slice 4 まで永続化不要、実装最小 |
| 並列実行 | **asyncio.TaskGroup** | sequential | UX (テキスト先 → 画像後) を担保 |
| 部分失敗 | **ImageErrorEvent / RECIPE_FAIL** | 全体 500 | テキストだけでも詳細体験は成立 |
| 保存系 | **alert で Slice 4 アナウンス** | localStorage 仮実装 | スコープ厳守、Slice 4 でクリーン実装 |
| StreamEvent 拡張 | **discriminated union 追加** | 別エンドポイント (e.g. /events) | Slice 1 から積み上げた汎用デコーダを活かす |

---

## 13. 改訂履歴

| 日付 | 版 | 変更内容 |
| --- | --- | --- |
| 2026-05-17 | 1.0 | 初版作成 |
