# Refactoring Foundation — tasklist

> design.md に基づく実装タスク。各タスクは独立コミット単位。
> 完了条件: 該当範囲のテスト + `pnpm lint && pnpm typecheck` がグリーンで、振る舞い不変。
> チェックボックス: `[ ]` 未着手 / `[~]` 進行中 / `[x]` 完了。

---

## Phase 0 — 即時対応 (独立・低リスク)

- [x] **T0-1** `js-yaml` を `dependencies` へ移動 (`@types/js-yaml` は型のみのため devDeps 据え置き)
  - `pnpm build:data` (prebuild の `scripts/build-ingredient-data.ts`) 成功を確認済

---

## Phase 1 — フロントエンド共通基盤 【高 / L】

### 1a. ストリーミング基盤
- [x] **T1a-1** characterization テスト追加 (unmount → AbortSignal aborted)。RED 確認済
- [x] **T1a-2** `src/hooks/use-stream-controller.ts` 新規作成 (unmount cleanup 含む)
- [x] **T1a-3** `use-quicktap-stream.ts` を `useStreamController` ベースに移行
- [x] **T1a-4** `use-recipe-detail-stream.ts` を同様に移行 (両 hook に unmount テスト追加)
- [x] **T1a-5** 既存 + 新規テスト 20 件グリーン

### 1b. Firestore 購読基盤
- [x] **T1b-1** `src/hooks/use-firestore-subscription.ts` 新規作成
- [x] **T1b-2** `use-saved-recipes.ts` を移行 (`status → state`)
- [x] **T1b-3** `use-saved-recipe.ts` を移行 (saved/unsaved 導出、save/unsave の opError 統合)
- [~] **T1b-4** `use-feedback.ts`: dual-sub + エラー時 settled の別形状のため **対象外** と判断
  (基盤を歪めない)。`use-furusato-items` も複数購読のため据え置き
- [x] **T1b-5** 既存テスト 13 件グリーン

### 1c. localStorage 購読基盤
- [x] **T1c-1** `src/lib/localstorage/create-storage-store.ts` 新規作成
- [x] **T1c-2** `use-locale.ts` を移行 (公開シグネチャ不変)
- [x] **T1c-3** `use-oven-profile.ts` を移行
- [~] **T1c-4** `use-feedback-draft.ts` は debounce writer で購読機構ではないため **非該当**
- [x] **T1c-5** 既存テスト 13 件グリーン

---

## Phase 3 — TS ⇔ Python スキーマ同期保証 【高 / M】

- [x] **T3-1** Python: 全 20 サブタイプの代表インスタンスを NDJSON 出力する pytest
  (`agent/tests/test_stream_contract.py`) → `src/domain/__fixtures__/stream-events.generated.ndjson`
- [x] **T3-2** TS: `src/domain/schemas.contract.test.ts` で fixture 各行を zod パース検証
- [x] **T3-3** 網羅性 assert: 両側で `type` 集合 == union の全 `type` リテラルを検証
- [x] **T3-4** CI: 既存 `pnpm test` / `uv run pytest` が両テストを実行 (最新性ガード内蔵)。
  ワークフロー変更不要。再生成手順はテストの docstring に記載

---

## Phase 2 — API 層の定型コード統一 【中 / M】 ✅

- [x] **T2-1** `parse-body.ts` (parseJsonBody) + `path-param.ts` (getPathParam) 新規作成
- [x] **T2-2** Route Handler 移行: parseJsonBody = sessions/recipes/share (3)、
  getPathParam = recipes/reroll/locales (3)。share は opts で既存メッセージ維持。
  reroll の body parse は別構造のため据え置き。エラー code/形式不変
- [x] **T2-3** `CandidateSchema` を domain/candidate.ts に集約 (型レベル assertion 付き)
- [x] **T2-4** `firebase/normalize.ts` (timestampToDate) に集約。clamp は既に domain 共有済
  だったため対象外。normalizeSavedRecipe の duck-typed 未対応の潜在差異も解消
- [x] **T2-5** 既存 route/firebase テスト 53 件 + 全 675 件グリーン

---

## Phase 4 — Python エージェント整理 【中 / M】

- [x] **T4-1** `deps.py` に `SingletonManager[T]` (PEP 695) 導入、4 依存を統一
  (公開関数は薄いラッパ維持)。test_deps 23 件グリーン
- [x] **T4-2** `agents/parallel_stream.py` (drain_parallel_event_tasks) を抽出し
  orchestrator / recipe_orchestrator を載せ替え
- [x] **T4-3** routes の locale+食材解決を `routes/resolve.py` に共通化
  (candidates の冗長な再フェッチ + assert も解消)
- [~] **T4-4** **保留**: HTTPException は FastAPI 既定で `{"detail":{"error":...}}` に
  ラップされ、test_routes が `body["detail"]["error"]` を assert = これが確立済み契約。
  「統一」はワイヤ形式を変える挙動変更 (AC-R0 違反) になるため別途サインオフが必要
- [~] **T4-5** **保留**: refresh_furusato_cache.py のサービス抽出はテスト容易性向上の
  nicety で重複解消ではないため優先度低
- [x] **T4-6** agent pytest 全 245 件グリーン

---

## Phase 5 — UI 分割 + 衛生 【中 / M】 (T5-1 完了、残りは保留/対象外)

- [x] **T5-1** `DetailClient.tsx`: snapshot 構築複製を `src/lib/recipe-save-payload.ts`
  (buildSavePayload) に抽出 + 単体テスト 2 件
- [~] **T5-2** **保留**: `FeedbackClient.tsx` (542 行) の分割は大規模・回帰リスク高で別 PR 推奨
- [~] **T5-3** **保留**: `equipment/page.tsx` 分割は静的ページ内部整理で価値低
- [~] **T5-4** **対象外**: 日付フォーマットは 2 箇所のみ + 5 行の自明な関数で
  「3 箇所以上 / 大規模・繊細」基準を満たさない (requirements §7)
- [ ] **T5-5** **未着手**: docs/ への Slice 8〜10 反映 — AC-R11。コードと直交する文書作業
- [~] **T5-6** **保留**: `_reference/` 削除は破壊的操作のためユーザ確認が必要

---

## 進捗メモ

- 着手順 (実績): Phase 0 → 1 → 3 → 2 → 4 → 5 (design §7 通り)
- コミット 13 本。**完了**: Phase 0/1/2/3 全部 + Phase 4 の重複解消 (T4-1/2/3) + T5-1
- **保留 (要判断)**: T4-4 (契約変更), T4-5 (低価値), T5-2/3 (大規模/低価値),
  T5-5 (docs), T5-6 (破壊的・要確認)
- 全テスト: TS 675 件 + agent 245 件グリーン。AC-R0 (振る舞い不変) 維持
