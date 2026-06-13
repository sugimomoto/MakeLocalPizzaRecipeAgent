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

## Phase 2 — API 層の定型コード統一 【中 / M】

- [ ] **T2-1** `src/lib/http/parse-body.ts` (`parseJsonBody`) + `src/lib/http/path-param.ts`
  (`getPathParam`) を新規作成
- [ ] **T2-2** 5 つの Route Handler を移行 (quicktap/sessions, recipes/[id], share, reroll,
  locales/[id]/ingredients)。エラー code/レスポンス形式は不変
- [ ] **T2-3** `CandidateSchema` を `domain/candidate.ts` に集約し `z.infer` で型導出
- [ ] **T2-4** `src/lib/firebase/normalize.ts` に Timestamp 変換・clamp を共通化、
  feedback.ts / saved-recipe.ts を移行
- [ ] **T2-5** 既存 route/domain/rules テストがグリーン

---

## Phase 4 — Python エージェント整理 【中 / M】

- [ ] **T4-1** `deps.py` に `SingletonManager[T]` 導入、5 依存を統一 (公開関数は薄いラッパ維持)
- [ ] **T4-2** 並列イベントストリーミング基盤を抽出し orchestrator 2 種を載せ替え
- [ ] **T4-3** routes の locale+食材解決を共通関数化
- [ ] **T4-4** HTTPException detail 形式の TS 期待値とのずれを確認 → 統一
- [ ] **T4-5** `refresh_furusato_cache.py` のコアを `RefreshFurusatoCacheService` に抽出
- [ ] **T4-6** agent の pytest 一式がグリーン

---

## Phase 5 — UI 分割 + 衛生 【中 / M】

- [ ] **T5-1** `DetailClient.tsx`: snapshot 構築複製を `buildSavePayload()` に抽出 + 単体テスト
- [ ] **T5-2** `FeedbackClient.tsx`: `useFeedbackPhotoUpload` + `PhotoZone` 分離
- [ ] **T5-3** `equipment/page.tsx`: コンポーネント/データ外出し
- [ ] **T5-4** `src/lib/format-date.ts` 統一、skeleton 共通化、`skeletonPulse` 集約
- [ ] **T5-5** docs/ への Slice 8〜10 反映 (architecture / functional-design / glossary) — AC-R11
- [ ] **T5-6** `_reference/` 削除判断 (参照 grep → ユーザ確認の上で削除)

---

## 進捗メモ

- 着手順: Phase 0 → Phase 1 → Phase 3 → Phase 2 → Phase 4 → Phase 5 (design §7)
