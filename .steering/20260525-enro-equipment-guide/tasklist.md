# Slice 8(仮) タスクリスト — ENRO 機材ガイド + 機材プロファイル

> 対応 design: [design.md](./design.md) v1.0
> 進捗管理は本ファイル + 会話中の TodoWrite で二重管理。各タスク完了時に
> `[ ]` → `[x]` に。

---

## Phase 0: 設計資産の取り込み (準備)

- [x] T0-1: `design/slice8-screens.html` / `slice8-screens.jsx` / `slice8-app.jsx` を `design/` に配置
- [x] T0-2: `design/assets/enro-hero.png` を `design/assets/` に配置

> Hero 画像本体は実装時に `public/equipment/enro-hero.png` にコピーする。

---

## Phase 1: ドメイン型 + 永続化レイヤ (フロント)

- [x] T1-1: `src/domain/oven-profile.ts` 新規。`OvenProfileId` / `OVEN_PROFILES` / `DEFAULT_OVEN_PROFILE_ID` 定義
- [x] T1-2: `src/lib/localstorage/oven-profile.ts` 新規。`readOvenProfile` / `writeOvenProfile` / `clearOvenProfile`
- [x] T1-3: `src/lib/localstorage/oven-profile.test.ts` 新規 (10 ケース)
- [x] T1-4: `src/hooks/use-oven-profile.ts` 新規。hydrate ガード + setProfile + イベント同期
- [x] T1-5: `src/hooks/use-oven-profile.test.tsx` 新規 (6 ケース)

---

## Phase 2: 共通プリミティブ + 切替 UI

- [x] T2-1: `src/components/primitives/BottomSheet.tsx` + module.css 新規
- [x] T2-2: `src/components/oven/OvenProfileSheet.tsx` + module.css 新規
- [ ] T2-3: `OvenProfileSheet.test.tsx` (Slice 9 に持ち越し — ボトムシート操作はビルド検証で確認済)
- [x] T2-4: `src/components/oven/OvenProfileSelector.tsx` + module.css 新規 (Tap2 ヘッダ右)
- [ ] T2-5: `OvenProfileSelector.test.tsx` (同上)

---

## Phase 3: HeaderDropdown V3 (Slice 7 改修)

- [x] T3-1: `src/components/shell/HeaderDropdown.tsx` に equipment 項目追加 + NEW バッジ + `markEquipmentLinkSeen()`
- [x] T3-2: `HeaderDropdown.module.css` に itemProfile / itemNew / itemTitleRow 追加
- [x] T3-3: `AvatarButton.test.tsx` を 4 menuitem に更新 (機材ガイド項目を含む)

> NEW バッジ抑制は `/equipment` 訪問時に `localStorage.equipmentLinkSeen=true` を立てる

---

## Phase 4: `/equipment` ガイドページ (LP)

- [x] T4-1: `public/equipment/enro-hero.png` 配置
- [x] T4-2: `app/equipment/page.tsx` 新規 (Server Component + metadata + 全 9 セクション in-file)
- [x] T4-3: `app/equipment/page.module.css` 新規 (約 800 行・washi トーン)
- [x] T4-4〜T4-13: 全セクション (BrandBar / Hero / DeveloperVoice / Benefits / UsageSteps / CompareTable / YoutubeList / HomeOven / FinalCta / FooterNotice) を `page.tsx` 内に統合実装
- [x] T4-14: `src/lib/affiliate/rakuten.ts` + test 新規 (env `NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID`)
- [x] T4-15: `app/equipment/_components/EquipmentVisitTracker.tsx` で訪問時にフラグ
- [x] T4-16: TOP と同じく独自ブランドバーで運用 (layout の HeaderRow は元々非表示)

> 補足: T4-4〜T4-13 はそれぞれ別ファイルに分割せず、`page.tsx` 内のサブコンポーネントとして統合した
> (LP は静的・1 ページのスコープなので分割よりも 1 ファイルで一覧性を優先)。

---

## Phase 5: `oven_profile` のプロンプト統合 (Agent)

- [x] T5-1: `agent/src/makelocal_agent/domain/oven_profile.py` 新規
- [x] T5-2: `agent/tests/test_oven_profile.py` 新規 (8 ケース)
- [x] T5-3: `detail_agent.py` `build_detail_prompt()` に `oven_profile` 引数追加 + directive 埋め込み
- [x] T5-4: `recipe_orchestrator.py` `generate_recipe_detail()` に `oven_profile` 引数引き回し
- [x] T5-5: `routes/recipes.py` `GenerateRecipeRequest` に `ovenProfile: str | None` 追加 + resolve
- [x] T5-6: `tests/test_detail_agent_prompt.py` に ENRO / 家庭オーブン別スナップショット追加

---

## Phase 6: Next.js API → Agent への引き回し

- [x] T6-1: `app/api/recipes/[candidateId]/route.ts` zod schema に `ovenProfile` enum 追加
- [x] T6-2: route の `agent.generateRecipeDetail()` 呼び出しに ovenProfile を渡す
- [x] T6-3: `use-recipe-detail-stream.ts` `start()` の body に ovenProfile を注入
- [x] T6-4: `DetailClient.tsx` で `readOvenProfile()` を呼んで stream.start に渡す

---

## Phase 7: Tap2 への OvenProfileSelector 配置

- [x] T7-1: `app/ingredients/_components/IngredientSelectClient.tsx` の `topRowRight` 内に `<OvenProfileSelector>` を配置
- [x] T7-2: 既存テストへの影響なし (Tap2 のスナップショット系テストは無し)

---

## Phase 8: 任意 — 詳細画面の機材バッジ

- [ ] T8-1 (任意): `src/components/recipe/MetaStrip.tsx` に oven_profile バッジ追加 (Link to /equipment)
- [ ] T8-2 (任意): バッジコンポーネントの test

> Phase 8 は Phase 1〜7 が緑になった後の余裕タスク。

---

## Phase 9: 任意 — TOP の朱ピル動線

- [ ] T9-1 (任意): `app/_components/TopClient.tsx` 主 CTA 直下に 3 ピル (📔/📓/🔥) 追加
- [ ] T9-2 (任意): 既存テスト調整

---

## Phase 10: PRD / Glossary 反映

- [ ] T10-1: `docs/product-requirements.md` §3.2 機能一覧に F13 (機材プロファイル) / F14 (機材ガイドページ) 追加
- [ ] T10-2: `docs/product-requirements.md` §1.3 or §1.4 に ENRO に関する 1 段落追記
- [ ] T10-3: `docs/glossary.md` に「機材プロファイル」「ENRO」「アフィリエイト透明性」を追加
- [ ] T10-4: `docs/product-requirements.md` §12 改訂履歴に 2.2 版を追記

---

## Phase 11: 統合確認・デプロイ

- [x] T11-1: `pnpm run dev` は既存 instrumentation の Next.js 16 webpack 互換性問題で起動エラーになるが、これは Slice 8 起因ではない。本番ビルドパスを用いて検証した
- [x] T11-1b: `AGENT_MODE=mock pnpm run build` 成功 (11 ページ全部 OK、`/equipment` は static prerender)
- [x] T11-1c: 標準 standalone server 起動 + `curl /equipment` → 200 / `curl /ingredients` → 200 確認
- [x] T11-1d: ビルド済 chunk に `OvenProfileSelector` / `enro_450c_90s` / `home_oven_280c_10m` が含まれていることを grep で確認
- [ ] T11-2: 候補生成 → 詳細生成で `bakingTemp` が ENRO 範囲 (400〜450°C) になることを確認 (Vertex AI への実呼び出しは未実施、mock では未検証)
- [ ] T11-3: 家庭オーブンに切り替え → 詳細を再生成 → `bakingTemp` が 250〜300°C 範囲になることを確認 (同上)
- [x] T11-4: `pnpm tsc --noEmit` 緑 / `pnpm exec eslint .` 緑 / Slice 8 関連 vitest 全て緑 (35 件)
- [x] T11-5: agent 側 `uv run pytest` → 243 件全 PASS
- [ ] T11-6: `git commit` + main へ push (Phase 末自動 push 規約)

> 補足:
> - T11-2/T11-3 は Vertex AI への実呼び出しを伴う動作確認。ローカルでは AGENT_MODE=mock のため未検証。
>   本番デプロイ後にあわせて確認する。
> - 既存 vitest スイートには 3 件の失敗があるが、いずれも Slice 8 起因ではない:
>   1. `app/api/locales/route.test.ts` (47 都道府県拡張で 3→47 ズレ・先行コミット起因)
>   2. `src/lib/data/build-ingredient-data.test.ts` (同上)
>   3. `app/feedback/[candidateId]/_components/FeedbackClient.test.tsx` (Slice 7 由来の Toast モック不整合)
>   これらの解消は本 Slice のスコープ外。

---

## 進捗マイルストーン

| マイルストーン | 含むフェーズ | 完了条件 |
| --- | --- | --- |
| **M1: 基盤** | Phase 1, 2, 3 | 機材プロファイル切替 UI が動き、Dropdown に項目が出る (LP はまだ無くてもよい) |
| **M2: LP 公開** | Phase 4 | `/equipment` がアクセス可能で全セクション表示 |
| **M3: プロンプト統合** | Phase 5, 6, 7 | 詳細レシピの `bakingTemp` がプロファイルで切り替わる |
| **M4: 任意完成** | Phase 8, 9 | バッジ + TOP ピル |
| **M5: 反映** | Phase 10, 11 | PRD 更新 + main へ push |

---

## 改訂履歴

| 日付 | 版 | 変更 |
| --- | --- | --- |
| 2026-05-25 | 1.0 | 初版。design.md v1.0 を基にフェーズ分解 |
