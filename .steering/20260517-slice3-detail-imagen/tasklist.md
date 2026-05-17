# Slice 3 タスクリスト (詳細画面 + Imagen 画像生成)

> 本書は [`requirements.md`](requirements.md) / [`design.md`](design.md) を実装する
> タスク分解。**1 task = 1 commit** (Conventional Commits)、フェーズ末に push & 動作確認。

---

## 進捗ルール

- ステータス: `[ ]` 未着手 / `[~]` 進行中 / `[x]` 完了
- 完了条件 (DoC): 各タスクに記載。lint / typecheck / test がローカルで pass すること
- フェーズ単位で push → CI green を確認してから次フェーズへ
- 1 タスク = 1 commit を原則とする (関連修正のみ同梱可)
- コミットメッセージは Conventional Commits + `Co-Authored-By: Claude` フッタ

---

## サマリ (合計 23 タスク / 12 フェーズ)

| Phase | 主題 | タスク数 |
| --- | --- | --- |
| Phase 1 | ドメイン拡張 (Python recipe / stream + TS schemas / recipe) | 3 |
| Phase 2 | detail_agent (Gemini Flash 構造化出力) | 3 |
| Phase 3 | image_agent + ImagenClient | 2 |
| Phase 4 | recipe_orchestrator | 1 |
| Phase 5 | FastAPI route `/agent/recipes/{id}` | 1 |
| Phase 6 | Web AgentClient/HttpAgentClient/MockAgentClient 拡張 | 3 |
| Phase 7 | BFF route `/api/recipes/[id]` | 1 |
| Phase 8 | useRecipeDetailStream フック | 1 |
| Phase 9 | UI コンポーネント 5 種 | 5 |
| Phase 10 | `/recipes/[candidateId]` ページ + DetailClient | 1 |
| Phase 11 | candidates 画面の遷移を Link 化 | 1 |
| Phase 12 | 統合確認 / README / .env.example / tag v0.3.0 | 1 |

---

## Phase 1 — ドメイン拡張

### T-301 Python: `domain/recipe.py` 追加 + テスト

- [ ] `agent/src/makelocal_agent/domain/recipe.py` を新規作成
  - `RecipeMaterial(name, quantity)` Pydantic
  - `RecipeMeta(servings, duration, bakingTemp, difficulty)` Pydantic
  - `RecipeDetailLlmOutput(title, meta, materials[3+], steps[3+], storyEyebrow, storyHeadline, storyBody)` Pydantic
- [ ] `agent/tests/test_domain_recipe.py`:
  - ハッピーパス
  - materials < 3 で ValidationError
  - steps < 3 で ValidationError
  - 各 str フィールドの min_length=1
- **DoC**: `uv run pytest tests/test_domain_recipe.py` green / mypy strict pass
- **commit**: `feat(slice3): add recipe detail domain models (Python)`

### T-302 Python: `domain/stream.py` に 9 イベント追加 + テスト

- [ ] `RecipeStartEvent / RecipeTitleEvent / RecipeMetaEvent / RecipeMaterialsEvent / RecipeStepsEvent / RecipeStoryEvent / RecipeDoneEvent` を Annotated Union に追加
- [ ] `ImageStartEvent / ImageReadyEvent / ImageErrorEvent` を追加
- [ ] `StreamEvent` 型エイリアス + `parse_stream_event` 互換を維持
- [ ] `agent/tests/test_domain_stream.py` を拡張: 新 9 イベントの parse 可否、type literal の網羅
- **DoC**: pytest green / 既存テスト不破壊
- **commit**: `feat(slice3): extend StreamEvent with recipe.* and image.* (Python)`

### T-303 TS: `domain/recipe.ts` 新規 + `schemas.ts` に 9 イベント追加 + テスト

- [ ] `src/domain/recipe.ts`: `RecipeMaterial / RecipeMeta` 型
- [ ] `src/domain/schemas.ts`: 9 イベントの Zod schema を `StreamEventSchema` の discriminatedUnion に追加
- [ ] `src/domain/recipe.test.ts` / `schemas.test.ts` 拡張
- **DoC**: `pnpm test` green / typecheck pass
- **commit**: `feat(slice3): extend TS schemas with recipe.* and image.*`

→ **push & CI green 確認**

---

## Phase 2 — detail_agent

### T-304 `agents/detail_agent.py` 雛形 + プロンプト

- [ ] `DETAIL_BASE_INSTRUCTION` 定数
- [ ] `build_detail_prompt(locale, selected, candidate) -> str`
- [ ] `agent/tests/test_detail_agent_prompt.py`: 食材名 / candidate.title / strategy を含む snapshot 風テスト
- **DoC**: pytest green
- **commit**: `feat(slice3): add detail_agent prompt builder`

### T-305 `run_recipe_detail` 実装 (LlmClient 経由)

- [ ] `async def run_recipe_detail(*, client, locale, selected, candidate, model=None) -> RecipeDetailLlmOutput`
- [ ] LlmClient.run_structured(output_schema=RecipeDetailLlmOutput) 呼び出し
- [ ] `agent/tests/test_detail_agent.py`: MockLlmClient で 1 件返却を検証
- **DoC**: pytest green
- **commit**: `feat(slice3): implement run_recipe_detail with structured output`

### T-306 MockLlmClient に detail サンプル追加

- [ ] 既存 `MockLlmClient` を拡張し、`RecipeDetailLlmOutput` 用の決定論的サンプルを返せるよう output_schema 別に分岐
- [ ] test: MockLlmClient.run_structured が両 schema に応答
- **DoC**: pytest green
- **commit**: `feat(slice3): MockLlmClient supports RecipeDetailLlmOutput`

→ **push & CI green 確認**

---

## Phase 3 — image_agent + ImagenClient

### T-307 `agents/imagen_client.py` (Protocol + Vertex + Mock)

- [ ] `class ImagenClient(Protocol)` with `generate_image(*, model, prompt, aspect_ratio="1:1") -> bytes`
- [ ] `class VertexImagenClient`: `google.genai` 経由 (Vertex モード) で Imagen 4 を呼ぶ
- [ ] `class MockImagenClient`: 1×1 PNG bytes (固定) を返す
- [ ] `agent/tests/test_imagen_client.py`: MockImagenClient の bytes が PNG signature 持ち
- **DoC**: pytest green
- **commit**: `feat(slice3): add ImagenClient protocol with Vertex/Mock implementations`

### T-308 `agents/image_agent.py` (プロンプト + data URI 変換)

- [ ] `build_image_prompt(candidate, locale) -> str`
- [ ] `async def run_image_for_candidate(*, client, candidate, locale, model=None) -> str` → `data:image/png;base64,...`
- [ ] `agent/tests/test_image_agent.py`: MockImagenClient で data URI 生成、base64 decode 可
- **DoC**: pytest green
- **commit**: `feat(slice3): add image_agent with base64 data URI output`

→ **push & CI green 確認**

---

## Phase 4 — recipe_orchestrator

### T-309 `agents/recipe_orchestrator.py` 並列実行

- [ ] `async def generate_recipe_detail(...) -> AsyncIterator[StreamEvent]`
- [ ] asyncio.TaskGroup で detail + image を並列、queue で完了順 yield
- [ ] image 失敗時 ImageErrorEvent / recipe 失敗時 ErrorEvent
- [ ] `agent/tests/test_recipe_orchestrator.py`: ハッピーパス / image 失敗 / recipe 失敗 / 順序検証
- **DoC**: pytest green、TaskGroup の sentinel パターンが Slice 2 と整合
- **commit**: `feat(slice3): add recipe_orchestrator with parallel text+image streaming`

→ **push & CI green 確認**

---

## Phase 5 — FastAPI route

### T-310 `routes/recipes.py` + main.py 登録 + deps.py 拡張

- [ ] `routes/recipes.py`: `POST /agent/recipes/{candidate_id}` (`StreamingResponse(media_type="application/x-ndjson")`)
- [ ] `RecipeRequest(localeId, ingredients, candidate, guestSessionId?)` Pydantic
- [ ] `deps.py`: `get_imagen_client()` を Vertex / Mock 切替で追加 (env `MLPR_USE_MOCK_IMAGE`)
- [ ] `main.py`: include_router(recipes_router)
- [ ] `agent/tests/test_routes_recipes.py`: 200 (NDJSON) / 404 (locale 不明) / 400 (Zod 失敗)
- **DoC**: pytest green / ruff / mypy strict pass
- **commit**: `feat(slice3): add /agent/recipes/[id] route with NDJSON streaming`

→ **push & CI green 確認**

---

## Phase 6 — Web AgentClient 群拡張

### T-311 `lib/agent/client.ts` interface + 型

- [ ] `GenerateRecipeDetailInput` 型を export
- [ ] `AgentClient.generateRecipeDetail(input): Promise<ReadableStream<Uint8Array>>`
- **DoC**: typecheck pass
- **commit**: `feat(slice3): extend AgentClient interface with generateRecipeDetail`

### T-312 `HttpAgentClient.generateRecipeDetail`

- [ ] fetch POST `/agent/recipes/{id}` + AbortSignal.timeout
- [ ] `http-client.test.ts` 拡張: fetch mock で 200 / 5xx / abort
- **DoC**: vitest green
- **commit**: `feat(slice3): implement HttpAgentClient.generateRecipeDetail`

### T-313 `MockAgentClient.generateRecipeDetail`

- [ ] 数百 ms 後に 9 イベント (recipe.start..done + image.start + image.ready の 1×1 PNG data URI) を返す
- [ ] `mock-candidates.test.ts` 拡張 (ファイル名は機能に応じて分割可)
- **DoC**: vitest green
- **commit**: `feat(slice3): implement MockAgentClient.generateRecipeDetail`

→ **push & CI green 確認**

---

## Phase 7 — BFF route

### T-314 `app/api/recipes/[candidateId]/route.ts`

- [ ] POST: body を Zod 検証 → `createAgentClient().generateRecipeDetail(...)` → pass-through `Response`
- [ ] `cache-control: no-store` + NDJSON Content-Type
- [ ] `app/api/recipes/[candidateId]/route.test.ts`: mock AgentClient で 200 pass-through / 400 Zod 失敗
- **DoC**: vitest green / typecheck pass
- **commit**: `feat(slice3): add /api/recipes/[id] BFF route`

→ **push & CI green 確認**

---

## Phase 8 — useRecipeDetailStream フック

### T-315 `src/hooks/use-recipe-detail-stream.ts`

- [ ] `useReducer` でイベント別 state 更新
- [ ] `start(input)`: fetch → decodeNdjsonStream → dispatch
- [ ] state: `idle | streaming | recipeDone | allDone | error`
- [ ] image 失敗時の `imageError` 表現
- [ ] `src/hooks/use-recipe-detail-stream.test.ts`: 9 イベントを順次 enqueue → state を assert
- **DoC**: vitest green
- **commit**: `feat(slice3): add useRecipeDetailStream hook`

→ **push & CI green 確認**

---

## Phase 9 — UI コンポーネント

### T-316 RecipeHero

- [ ] `src/components/recipe/RecipeHero.tsx` (image + 戻る + ハート)
- [ ] CSS Modules + skeleton 状態
- [ ] RTL test
- **commit**: `feat(slice3): add RecipeHero component`

### T-317 MetaStrip

- [ ] `src/components/recipe/MetaStrip.tsx` (servings / duration / bakingTemp / difficulty)
- [ ] RTL test
- **commit**: `feat(slice3): add MetaStrip component`

### T-318 MaterialList

- [ ] `src/components/recipe/MaterialList.tsx` (name + quantity の和文タイポ)
- [ ] RTL test
- **commit**: `feat(slice3): add MaterialList component`

### T-319 StepList

- [ ] `src/components/recipe/StepList.tsx` (番号付き手順)
- [ ] RTL test
- **commit**: `feat(slice3): add StepList component`

### T-320 StoryCard

- [ ] `src/components/recipe/StoryCard.tsx` (eyebrow / headline mincho / body)
- [ ] RTL test
- **commit**: `feat(slice3): add StoryCard component`

→ **push & CI green 確認** (各タスク末で push しても OK、まとめても OK)

---

## Phase 10 — DetailClient ページ

### T-321 `app/recipes/[candidateId]/page.tsx` + `_components/DetailClient.tsx`

- [ ] Server Component → Client Component に sessionId/candidateId 渡し
- [ ] sessionStorage から candidate スナップショット + localeId + ingredients を取り出し
- [ ] `useRecipeDetailStream.start(...)` を mount で呼ぶ
- [ ] 画面構成 (Hero / Header / Concept / MetaStrip / Section×2 / StoryCard / CTAs)
- [ ] CTAs (ハート / ピザ帳に保存 / 作ってみる) は alert
- [ ] CSS Modules で washi 背景 + 縦動線
- **DoC**: typecheck / lint pass / RTL test (sessionStorage モックで mount)
- **commit**: `feat(slice3): add /recipes/[candidateId] detail page`

→ **push & CI green 確認**

---

## Phase 11 — candidates 画面の遷移

### T-322 `CandidatesClient.tsx`: 「この一枚に決める」を遷移化

- [ ] active candidate のスナップショットを sessionStorage に保存
- [ ] `router.push('/recipes/' + candidateId)`
- [ ] alert を削除
- [ ] 該当テストがあれば更新
- **DoC**: vitest green / typecheck pass / 手動で /candidates → /recipes/[id] 遷移
- **commit**: `feat(slice3): wire candidates "decide" CTA to /recipes/[id]`

→ **push & CI green 確認**

---

## Phase 12 — 統合 / ドキュメント / タグ

### T-323 統合確認 + README + .env.example + v0.3.0 タグ

- [ ] AGENT_MODE=mock で /local → /ingredients → /candidates → /recipes/[id] 通し動作
- [ ] AGENT_MODE=http で同じ通し動作 (Imagen 含む) を 1 回確認
- [ ] `.env.example` に `MLPR_IMAGEN_MODEL=imagen-4.0-generate-001` / `MLPR_USE_MOCK_IMAGE=false` を追記
- [ ] `README.md`: Slice 3 動作手順 / 既知のコスト注意を 1 段追記
- [ ] CHANGELOG.md (あれば) 追記、無ければ skip
- [ ] git tag v0.3.0 + push --tags
- **DoC**: 全 CI green / 手動 E2E 1 回成功
- **commit**: `chore(slice3): wrap-up, README, .env.example for Slice 3`

→ **push & tag v0.3.0**

---

## Slice 3 完了の DoD (Definition of Done)

1. `/candidates` → 「決める」→ `/recipes/[candidateId]` の遷移が成立する
2. 詳細画面に title / meta / materials / steps / story が NDJSON 経由で順次入る
3. 画像が遅れて入っても画面が成立する (失敗時は画像枠が grace 表示)
4. AGENT_MODE=mock と http の両方で動く
5. lint / typecheck / vitest / pytest / ruff / mypy 全 green
6. v0.3.0 タグが push 済み

---

## 改訂履歴

| 日付 | 版 | 変更内容 |
| --- | --- | --- |
| 2026-05-17 | 1.0 | 初版作成 |
