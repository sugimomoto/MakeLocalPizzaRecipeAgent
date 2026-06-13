# Refactoring Foundation — tasklist

> design.md に基づく実装タスク。各タスクは独立コミット単位。
> 完了条件: 該当範囲のテスト + `pnpm lint && pnpm typecheck` がグリーンで、振る舞い不変。
> チェックボックス: `[ ]` 未着手 / `[~]` 進行中 / `[x]` 完了。

---

## Phase 0 — 即時対応 (独立・低リスク)

- [ ] **T0-1** `js-yaml` を `dependencies` へ移動 (`@types/js-yaml` は要否確認)
  - `pnpm build` (prebuild の `scripts/build-ingredient-data.ts` 含む) が成功すること
  - 完了条件: `pnpm typecheck` + build 成功

---

## Phase 1 — フロントエンド共通基盤 【高 / L】

### 1a. ストリーミング基盤
- [ ] **T1a-1** characterization テスト追加: ストリーム進行中 unmount で AbortSignal が
  aborted になることを検証 (現状 RED を確認)
- [ ] **T1a-2** `src/hooks/use-stream-controller.ts` を新規作成 (`useStreamController` +
  `StreamControlAction` + unmount cleanup)
- [ ] **T1a-3** `use-quicktap-stream.ts` を `useStreamController` ベースに移行
  (`consumeStream` / abortRef / 429 / catch を撤去、`start` / `reroll` / `reset` / `hydrate` を
  `run` / `abort` で書き換え)
- [ ] **T1a-4** `use-recipe-detail-stream.ts` を同様に移行
- [ ] **T1a-5** 既存 + 新規テストがグリーン (`use-quicktap-stream.test` /
  `use-recipe-detail-stream.test` / unmount テスト)

### 1b. Firestore 購読基盤
- [ ] **T1b-1** `src/hooks/use-firestore-subscription.ts` を新規作成
  (`useFirestoreSubscription<T>` + `SubscribeFn<T>` + 認証ゲート + error)
- [ ] **T1b-2** `use-saved-recipes.ts` を移行 (`status → state` そのまま)
- [ ] **T1b-3** `use-saved-recipe.ts` を移行 (`status`+`data` から `saved`/`unsaved` 導出、
  save/unsave は据え置き)
- [ ] **T1b-4** `use-feedback.ts` の recipe 購読部分を可能なら移行 (3 箇所目の確認)
- [ ] **T1b-5** 既存テスト (`use-saved-recipes.test` / `use-saved-recipe.test` /
  `use-feedback.test`) がグリーン
  - 注: `use-furusato-items` は複数購読のため対象外 (据え置き)

### 1c. localStorage 購読基盤
- [ ] **T1c-1** `src/lib/localstorage/create-storage-store.ts` を新規作成
  (`createStorageStore<T>` / `useSyncExternalStore` 機構を内包)
- [ ] **T1c-2** `use-locale.ts` を移行 (公開シグネチャ不変)
- [ ] **T1c-3** `use-oven-profile.ts` を移行
- [ ] **T1c-4** `use-feedback-draft.ts` の localStorage 機構が同型か精査、該当すれば移行
- [ ] **T1c-5** 既存テスト (`use-locale.test` / `use-oven-profile.test` /
  `use-feedback-draft.test`) がグリーン

---

## Phase 3 — TS ⇔ Python スキーマ同期保証 【高 / M】

- [ ] **T3-1** Python: 全 `StreamEvent` サブタイプの代表インスタンスを `model_dump_json()` で
  出力するスクリプト/テストを作成 → `src/domain/__fixtures__/stream-events.generated.json`
- [ ] **T3-2** TS: `src/domain/schemas.contract.test.ts` で fixture 各行を zod パース検証
- [ ] **T3-3** 網羅性 assert: fixture の `type` 集合 == zod union の全 `type` リテラル
- [ ] **T3-4** CI: fixture 再生成で差分が出ないこと (Python generate → git diff) を確認する手順を
  README/CI に追記

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
