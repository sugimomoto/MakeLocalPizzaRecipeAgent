# Slice 2 タスクリスト (Python ADK Agent + Vertex Gemini)

> 本書は [`design.md`](design.md) を実装するためのタスク分解と進捗管理を行う。
> 要求は [`requirements.md`](requirements.md) を参照。
> タスクの粒度は **1 タスク = 1 コミット** を目安に設定 (Slice 1 と同じ流儀)。

---

## 0. 進め方の規約

- Slice 1 と同じく **Phase 単位で順次実行**
- 各タスクは 1 PR / 1 コミットを目安 (Conventional Commits 準拠)
- TDD 適用タスクには **`[TDD]`** マーカー
- 完了時に `- [ ]` を `- [x]` に更新
- すべて完了したら [`requirements.md §6 完了の定義`](requirements.md#6-完了の定義-definition-of-done) を実行
- すべて緑なら `git tag v0.2.0` で Slice 3 へ

---

## Phase 1: Python パッケージ初期化

| ID | タスク | deps | ファイル | コミット例 |
| --- | --- | --- | --- | --- |
| T-201 | `.devcontainer/post-create.sh` で uv / Python 3.12 が入っているか確認 (不足あれば追記) | — | 同左 | `chore(devcontainer): ensure uv + python 3.12 ready` |
| T-202 | `agent/pyproject.toml` 作成 (依存・ruff・mypy・pytest 設定) | T-201 | `agent/pyproject.toml`, `agent/ruff.toml?` | `chore(agent): scaffold pyproject.toml with uv` |
| T-203 | `uv sync` 実行 → `agent/uv.lock` 生成・コミット | T-202 | `agent/uv.lock` | `chore(agent): lock dependencies` |
| T-204 | `agent/src/makelocal_agent/__init__.py` + Hello FastAPI app (uvicorn 起動確認) | T-203 | `agent/src/makelocal_agent/main.py` | `feat(agent): scaffold FastAPI hello app` |
| T-205 | `agent/.gitignore` (Python 用: __pycache__, .venv, .pytest_cache 等) | — | 同左 | `chore(agent): add python gitignore` |

**完了条件**: `cd agent && uv run uvicorn makelocal_agent.main:app` で起動できる

---

## Phase 2: ドメインモデル (Pydantic)

design.md §4 参照。TS 側 (Slice 1) の semantic コピー。

| ID | タスク | deps | ファイル | コミット例 |
| --- | --- | --- | --- | --- |
| T-211 `[TDD]` | `agent/src/makelocal_agent/domain/locale.py`: Locale / Region / City | Phase 1 | 同左 + test | `feat(agent): Locale domain types` |
| T-212 `[TDD]` | `agent/.../domain/ingredient.py`: Ingredient / Season / IngredientCategory + isInSeason | T-211 | 同左 + test | `feat(agent): Ingredient domain types` |
| T-213 `[TDD]` | `agent/.../domain/candidate.py`: Strategy / STRATEGY_LABELS / Candidate / QuickTapSessionPayload | T-212 | 同左 + test | `feat(agent): Candidate + Strategy types` |
| T-214 `[TDD]` | `agent/.../domain/stream.py`: 10 種類 StreamEvent (discriminated Union) | T-213 | 同左 + test (境界値 5+) | `feat(agent): NDJSON StreamEvent schema` |

**完了条件**: `uv run pytest agent/tests/test_domain_*.py` で全 pass

---

## Phase 3: ライブラリ層

| ID | タスク | deps | ファイル | コミット例 |
| --- | --- | --- | --- | --- |
| T-221 | `agent/.../lib/settings.py`: pydantic-settings で env var (GOOGLE_CLOUD_PROJECT 等) | Phase 1 | 同左 + test | `feat(agent): settings via pydantic-settings` |
| T-222 | `agent/.../lib/logging.py`: 構造化ログ (TS logger と shape 同期) | Phase 1 | 同左 + test | `feat(agent): structured logging` |
| T-223 `[TDD]` | `agent/.../lib/ndjson.py`: StreamEvent → bytes (改行終端) | T-214 | 同左 + test | `feat(agent): NDJSON encoder` |
| T-224 `[TDD]` | `agent/.../data/ingredients_repository.py`: YAML ロード + locale クエリ | T-211〜213 | 同左 + test | `feat(agent): ingredients repository (yaml loader)` |

---

## Phase 4: ADK Agent + Orchestrator

design.md §5 参照。

| ID | タスク | deps | ファイル | コミット例 |
| --- | --- | --- | --- | --- |
| T-231 | `agent/.../deps.py`: Vertex AI クライアント DI (テスト時差替可) | Phase 1 | 同左 | `feat(agent): vertex client DI` |
| T-232 `[TDD]` | `agent/.../agents/candidates_agent.py`: build_candidate_agent(strategy) + CandidateLlmOutput | T-213, T-231 | 同左 + test (LlmAgent モック) | `feat(agent): candidates LlmAgent per strategy` |
| T-233 `[TDD]` | `agent/.../agents/prompt.py`: build_prompt(locale, ingredients, hints, strategy) | T-232, T-224 | 同左 + test (出力文字列の anchor) | `feat(agent): prompt builder` |
| T-234 `[TDD]` | `agent/.../agents/orchestrator.py`: asyncio.TaskGroup で 3 戦略並列 + queue で yield | T-232, T-233 | 同左 + test (23 イベント / 1 失敗時の部分配信) | `feat(agent): orchestrator with parallel strategies` |

**完了条件**: `pytest test_orchestrator.py` で 23 イベント yield と部分失敗ケースが通る

---

## Phase 5: FastAPI ルート

design.md §6 参照。

| ID | タスク | deps | ファイル | コミット例 |
| --- | --- | --- | --- | --- |
| T-241 `[TDD]` | `agent/.../routes/health.py`: GET /agent/health | Phase 1 | 同左 + test | `feat(agent): /agent/health endpoint` |
| T-242 `[TDD]` | `agent/.../routes/candidates.py`: POST /agent/generate-candidates (StreamingResponse) | T-234, T-223 | 同左 + test (TestClient で NDJSON 受信) | `feat(agent): POST /agent/generate-candidates` |
| T-243 `[TDD]` | `agent/.../routes/reroll.py`: POST /agent/reroll | T-242 | 同左 + test | `feat(agent): POST /agent/reroll` |
| T-244 | `agent/.../main.py` で router 登録 + exception handler (500 + JSON 統一) | T-241〜243 | 同左 + test | `feat(agent): wire routes + global error handler` |

---

## Phase 6: Web 側 (TypeScript) 切替

design.md §7 参照。

| ID | タスク | deps | ファイル | コミット例 |
| --- | --- | --- | --- | --- |
| T-251 `[TDD]` | `src/lib/agent/http-client.ts`: HttpAgentClient (fetch + AbortSignal.timeout) | — | 同左 + test (fetch モック 5 ケース以上) | `feat(lib): HttpAgentClient implementation` |
| T-252 `[TDD]` | `src/lib/agent/factory.ts`: AGENT_MODE で切替 | T-251 | 同左 + test (mode mock/http/default) | `feat(lib): agent client factory` |
| T-253 | `app/api/quicktap/sessions/route.ts` + `[id]/reroll/route.ts` を factory 経由に差替 | T-252 | 同左 | `refactor(api): use createAgentClient() factory` |
| T-254 | `.env.example` に AGENT_MODE / AGENT_BASE_URL / AGENT_TIMEOUT_MS 追加 | T-252 | 同左 | `chore(env): document agent mode vars` |

---

## Phase 7: 環境・CI

| ID | タスク | deps | ファイル | コミット例 |
| --- | --- | --- | --- | --- |
| T-261 | `.github/workflows/ci.yml` に python ジョブ追加 (uv setup / sync / ruff / mypy / pytest) | Phase 5 | 同左 | `ci: add python job (ruff / mypy / pytest)` |
| T-262 | `agent/README.md`: agent 単独で起動・テスト手順 | Phase 4, 5 | 同左 | `docs(agent): agent-side README` |
| T-263 | ルート `README.md` に Python セットアップ章を追加 (uv install / .env / 起動 / mode 切替) | T-254, T-262 | 同左 | `docs: add slice 2 setup section` |
| T-264 | `.devcontainer/devcontainer.json` の VS Code 拡張に Python/Pylance/Ruff が入っているか確認 | T-201 | 同左 | `chore(devcontainer): ensure python extensions ready` |

---

## Phase 8: 統合確認

| ID | タスク | deps | ファイル | コミット例 |
| --- | --- | --- | --- | --- |
| T-271 | ローカルで Web + Agent 同時起動して /candidates 踏破 (AGENT_MODE=http) | 全 Phase | (手動確認) | — (確認のみ) |
| T-272 | AGENT_MODE=mock に戻して Slice 1 と同じ挙動を確認 (regression) | T-271 | (手動確認) | — |
| T-273 | tasklist の全項目に ✓ | 全 Phase | `tasklist.md` | `docs(slice2): mark tasks complete` |

---

## Phase 9: 受け入れ最終確認

requirements.md §6 完了の定義に従う。

- [ ] **DoD-1**: §4.1 機能受け入れ 5 項目すべてが動作確認
- [ ] **DoD-2**: §4.2 Agent 受け入れ 5 項目を満たす
- [ ] **DoD-3**: §4.3 DevOps 受け入れ 5 項目を通過
- [ ] **DoD-4**: §4.4 コード品質 5 項目を通過
- [ ] **DoD-5**: §4.5 アーキ整合 3 項目を通過
- [ ] **DoD-6**: `git log --oneline` で Conventional Commits 粒度を維持
- [ ] **DoD-7**: README の手順で Python 側も第三者再現可能

すべてに ✓ が付いたら、Slice 2 完了 → `git tag v0.2.0` を打って Slice 3 へ。

---

## タスク一覧サマリ (チェックボックス)

### Phase 1: Python 初期化 (5)
- [x] T-201 devcontainer 確認
- [x] T-202 pyproject.toml
- [x] T-203 uv.lock
- [x] T-204 FastAPI Hello
- [x] T-205 python .gitignore

### Phase 2: ドメイン (4)
- [x] T-211 Locale
- [x] T-212 Ingredient
- [x] T-213 Candidate
- [x] T-214 StreamEvent

### Phase 3: ライブラリ (4)
- [x] T-221 settings
- [x] T-222 logging
- [x] T-223 ndjson encoder
- [x] T-224 ingredients repository

### Phase 4: ADK + Orchestrator (4)
- [x] T-231 vertex DI
- [ ] T-232 candidates_agent
- [ ] T-233 prompt builder
- [ ] T-234 orchestrator (parallel)

### Phase 5: FastAPI ルート (4)
- [ ] T-241 /agent/health
- [ ] T-242 POST /agent/generate-candidates
- [ ] T-243 POST /agent/reroll
- [ ] T-244 main wiring

### Phase 6: Web 切替 (4)
- [ ] T-251 HttpAgentClient
- [ ] T-252 factory
- [ ] T-253 route 差替
- [ ] T-254 .env.example

### Phase 7: 環境・CI (4)
- [ ] T-261 python CI ジョブ
- [ ] T-262 agent README
- [ ] T-263 root README 追記
- [ ] T-264 devcontainer 拡張確認

### Phase 8: 統合確認 (3)
- [ ] T-271 AGENT_MODE=http で踏破
- [ ] T-272 AGENT_MODE=mock で regression
- [ ] T-273 tasklist ✓

### Phase 9: 受け入れ最終 (7)
- [ ] DoD-1 機能受け入れ
- [ ] DoD-2 Agent 受け入れ
- [ ] DoD-3 DevOps
- [ ] DoD-4 コード品質
- [ ] DoD-5 アーキ整合
- [ ] DoD-6 git log 確認
- [ ] DoD-7 第三者再現

**合計**: 32 タスク + 7 DoD = **39 項目**

---

## 想定スケジュール (2026/5/16〜2026/5/30)

| 週 | フェーズ | 想定タスク数 |
| --- | --- | --- |
| Week 1 (5/16〜5/22) | Phase 1〜4: Python 基盤 + ドメイン + Orchestrator | 17 |
| Week 2 (5/23〜5/30) | Phase 5〜9: FastAPI + Web 切替 + CI + 受け入れ | 22 |

→ Slice 1 と比べてタスク数は約半分 (32 vs 56)。Phase 1〜3 はパターンが Slice 1 と同型なので進めやすい。
Phase 4 (Orchestrator 並列 + LlmAgent モック) と Phase 5 (StreamingResponse) が技術的に新しい。

---

## 改訂履歴

| 日付 | 版 | 変更内容 |
| --- | --- | --- |
| 2026-05-16 | 1.0 | 初版作成。Phase 1〜9 で 32 タスク + 7 DoD に分解。 |
