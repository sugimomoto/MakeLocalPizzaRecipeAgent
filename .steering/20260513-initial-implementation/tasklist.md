# 初回実装 タスクリスト(Slice 1)

> 本書は [`design.md`](design.md) を実装するためのタスク分解と進捗管理を行う。
> 要求は [`requirements.md`](requirements.md) を参照。
> タスクの粒度は **1 タスク = 1 コミット** を目安に設定。

---

## 0. 進め方の規約

- タスクは **Phase 単位で順次実行**。Phase 内のタスクは概ね並行可だが、依存(`deps`)が明示されているものは順守
- 各タスクは 1 PR / 1 コミットを目安(Conventional Commits 準拠、`commit` フィールドの文面例を参考に)
- TDD 適用タスクには **`[TDD]`** マーカー。Red → Green → Refactor を1コミットで完結させる
- タスク完了時に各 `- [ ]` を `- [x]` に更新
- すべて完了したら [`requirements.md §6 完了の定義`](requirements.md#6-完了の定義-definition-of-done) のチェックを実行

---

## Phase 1: プロジェクトブートストラップ

| ID | タスク | deps | ファイル | コミット例 |
| --- | --- | --- | --- | --- |
| T-001 | `.nvmrc` 作成(Node 22 固定) | — | `.nvmrc` | `chore: pin node 22 via .nvmrc` |
| T-002 | `package.json` 初期化(name/scripts/engines/packageManager) | T-001 | `package.json` | `chore: scaffold package.json with pnpm 10` |
| T-003 | `pnpm install` で React 19 / Next.js 16 / TS 5 / Vitest / ESLint / Prettier 等を導入 | T-002 | `pnpm-lock.yaml` | `chore: install core dependencies` |
| T-004 | `tsconfig.json`(strict + paths エイリアス) | T-003 | `tsconfig.json` | `chore: configure tsconfig with strict + aliases` |
| T-005 | `next.config.ts` 雛形 + `instrumentation.ts` 雛形 | T-003 | `next.config.ts`, `instrumentation.ts` | `chore: scaffold next config` |
| T-006 | ESLint flat config(`next/core-web-vitals` + `@typescript-eslint` + `import/no-restricted-paths`) | T-003 | `eslint.config.mjs` | `chore: configure eslint flat config` |
| T-007 | Prettier 設定 | T-003 | `.prettierrc`, `.prettierignore` | `chore: add prettier config` |
| T-008 | Vitest 設定(jsdom 環境) | T-003 | `vitest.config.ts` | `chore: configure vitest with jsdom` |
| T-009 | lefthook 設定(pre-commit に lint/format/typecheck/gitleaks) | T-003 | `lefthook.yml` | `chore: setup lefthook pre-commit hooks` |
| T-010 | `.gitignore` / `.dockerignore` / `.editorconfig` / `.env.example` | — | 同左 | `chore: add baseline ignore + editor configs` |
| T-011 | `git init` + 初回コミット + GitHub リポジトリ作成 + 初回 push | T-001〜T-010 | — | `chore: initial commit` |

**完了条件**: `pnpm install && pnpm lint && pnpm typecheck && pnpm build` が空プロジェクトで通る

---

## Phase 2: デザインシステム移植

design.md §4 参照。

| ID | タスク | deps | ファイル | コミット例 |
| --- | --- | --- | --- | --- |
| T-021 | `src/styles/tokens.css`: `T` オブジェクト → CSS 変数(`--mlpr-*`)に移植 | Phase 1 | `src/styles/tokens.css` | `feat(design): port color tokens to css variables` |
| T-022 | `src/styles/washi-noise.css`: 和紙ノイズテクスチャ実装(SVG inline base64 or pattern) | T-021 | `src/styles/washi-noise.css` | `feat(design): add washi paper texture` |
| T-023 | `app/layout.tsx`: `next/font/google` で Shippori Mincho B1 / Zen Kaku Gothic / JetBrains Mono 読み込み + CSS 変数化 | T-021 | `app/layout.tsx` | `feat(design): configure web fonts via next/font` |
| T-024 | `app/globals.css`: リセット + tokens.css / washi-noise.css の import + body デフォルト | T-021,T-022 | `app/globals.css` | `feat(design): add globals.css with resets` |
| T-025 | `src/components/illustration/WashiTexture.tsx`: 背景コンポーネント | T-022 | 同左 | `feat(design): WashiTexture component` |
| T-026 | `src/components/illustration/PizzaDisk.tsx`: `design/pizza-tokens.jsx` の `PizzaDisk` を React コンポーネント化 | T-021 | 同左 + テスト | `feat(design): port PizzaDisk illustration` |

**完了条件**: 空白の `app/page.tsx` を作ってアクセスしたとき、和紙背景+正しいフォントで「Hello」が表示される

---

## Phase 3: ドメイン型・Zod スキーマ

design.md §5 参照。

| ID | タスク | deps | ファイル | コミット例 |
| --- | --- | --- | --- | --- |
| T-031 `[TDD]` | `src/domain/locale.ts`: `Locale`, `City`, `Region` 型定義 | Phase 1 | 同左 + テスト | `feat(domain): add Locale types` |
| T-032 `[TDD]` | `src/domain/ingredient.ts`: `Ingredient`, `Season`, `IngredientCategory` 型 | T-031 | 同左 + テスト | `feat(domain): add Ingredient types` |
| T-033 `[TDD]` | `src/domain/candidate.ts`: `Strategy`, `STRATEGY_LABELS`, `Candidate`, `QuickTapSessionPayload` | T-031,T-032 | 同左 + テスト | `feat(domain): add Candidate + Strategy types` |
| T-034 `[TDD]` | `src/domain/schemas.ts`: NDJSON `StreamEvent` の discriminated union Zod スキーマ | T-033 | 同左 + テスト(境界値5件以上) | `feat(domain): add NDJSON stream event schema` |

**完了条件**: `pnpm test` で domain/* のテストすべて pass

---

## Phase 4: ライブラリ層(observability / localstorage / http)

| ID | タスク | deps | ファイル | コミット例 |
| --- | --- | --- | --- | --- |
| T-041 | `src/lib/observability/logger.ts`: 構造化ロガー(console JSON 出力、後で Cloud Logging に差替可能な構造) | Phase 1 | 同左 + テスト | `feat(lib): structured logger` |
| T-042 | `src/lib/observability/span.ts`: `withSpan` ヘルパ(Slice 1 は no-op 実装、トレース API は揃える) | T-041 | 同左 + テスト | `feat(lib): withSpan helper (no-op for slice 1)` |
| T-043 `[TDD]` | `src/lib/localstorage/locale.ts`: キー名定数 + `readLocale` / `writeLocale` / `clearLocale` | Phase 3 | 同左 + テスト(R/W、broken JSON リカバリ、バージョン番号) | `feat(lib): localStorage locale persistence` |
| T-044 `[TDD]` | `src/lib/localstorage/guest-session.ts`: 匿名セッション ID の払い出し(UUID v4) | — | 同左 + テスト | `feat(lib): guest session id persistence` |
| T-045 | `src/lib/http/error.ts`: 共通エラー型 + ハンドラ(`{error:{code,message}}` 形式) | — | 同左 + テスト | `feat(lib): unified http error handler` |
| T-046 | `src/lib/http/with-auth.ts`: `withAuthOptional` 雛形(Slice 1 は常にゲスト通し) | T-045 | 同左 + テスト | `feat(lib): withAuthOptional skeleton` |

---

## Phase 5: Agent 層(モック)

design.md §5.4, §6 参照。

| ID | タスク | deps | ファイル | コミット例 |
| --- | --- | --- | --- | --- |
| T-051 `[TDD]` | `src/lib/agent/stream.ts`: `encodeNdjsonStream` / `decodeNdjsonStream`(`TextEncoderStream` ベース) | Phase 3 | 同左 + テスト(往復、行バッファリング、不正 JSON) | `feat(agent): NDJSON stream encode/decode` |
| T-052 | `src/lib/agent/client.ts`: `AgentClient` インターフェース + `GenerateCandidatesInput` 型 | T-051 | 同左 | `feat(agent): AgentClient interface` |
| T-053 `[TDD]` | `src/lib/agent/mock-candidates.ts`: 食材組合せから決定論的に Exploit/Tune/Explore 3 案を生成 | T-052 | 同左 + テスト(決定論、3軸揃う、reroll で seed 変化) | `feat(agent): mock candidate generator` |

---

## Phase 6: 静的データ

design.md §5.2, §5.3 参照。

| ID | タスク | deps | ファイル | コミット例 |
| --- | --- | --- | --- | --- |
| T-061 | `agent/data/ingredients.yaml`: 宮城(10件)+ 長野(10件)+ 高知(10件) のキュレーション | Phase 3 | 同左 | `feat(data): curate ingredients for miyagi/nagano/kochi` |
| T-062 `[TDD]` | `scripts/build-ingredient-data.mjs`: YAML 読み込み + Zod 検証 + JSON 出力 | T-061 | 同左 + テスト | `feat(build): yaml -> json ingredient data generator` |
| T-063 | `package.json` の `prebuild` フックに登録 + 初回実行で `src/data/ingredients.generated.json` 生成 | T-062 | `package.json`, `src/data/ingredients.generated.json` | `chore(build): wire prebuild ingredient data` |
| T-064 | `.gitignore` で `src/data/ingredients.generated.json` を管理するか決定(管理推奨) | T-063 | `.gitignore` | `chore: track generated ingredient json` |

---

## Phase 7: BFF API ルート

design.md §5.4, §7.1 参照。

| ID | タスク | deps | ファイル | コミット例 |
| --- | --- | --- | --- | --- |
| T-071 `[TDD]` | `app/api/health/route.ts`: `GET → {ok:true}` | Phase 4 | 同左 + テスト | `feat(api): health endpoint` |
| T-072 `[TDD]` | `app/api/locales/route.ts`: 都道府県一覧を `src/data/...json` から返す | T-063, Phase 4 | 同左 + テスト | `feat(api): list locales` |
| T-073 `[TDD]` | `app/api/locales/[id]/ingredients/route.ts`: 地元食材一覧、`?season=` / `?category=` フィルタ | T-072 | 同左 + テスト | `feat(api): list ingredients per locale` |
| T-074 `[TDD]` | `app/api/quicktap/sessions/route.ts`: `POST` で Zod 検証 → MockAgentClient.generateCandidates → NDJSON ストリーム返却 | Phase 5 | 同左 + テスト(契約: 9イベント以上、3軸揃う、Content-Type) | `feat(api): POST /api/quicktap/sessions with NDJSON stream` |
| T-075 `[TDD]` | `app/api/quicktap/sessions/[id]/reroll/route.ts`: 別 seed で再生成 | T-074 | 同左 + テスト | `feat(api): reroll candidates endpoint` |

---

## Phase 8: フック・ストア

design.md §6 参照。

| ID | タスク | deps | ファイル | コミット例 |
| --- | --- | --- | --- | --- |
| T-081 `[TDD]` | `src/hooks/use-locale.ts`: `useSyncExternalStore` で localStorage subscribe、`isHydrated` フラグ付き | T-043 | 同左 + テスト | `feat(hooks): useLocale with SSR-safe hydration` |
| T-082 `[TDD]` | `src/hooks/use-quicktap-stream.ts`: fetch → decodeNdjsonStream → useReducer で `PartialCandidate[]` を段階更新 | T-051,T-074 | 同左 + テスト | `feat(hooks): useQuickTapStream for candidate streaming` |
| T-083 | `src/stores/quicktap.ts`: Zustand で `selectedIngredients` の toggle/clear | — | 同左 + テスト | `feat(stores): quicktap selection store` |

---

## Phase 9: UI コンポーネント

design.md §3 / §4 参照。

### 9.1 プリミティブ

| ID | タスク | deps | ファイル | コミット例 |
| --- | --- | --- | --- | --- |
| T-091 | `src/components/primitives/Button.tsx`: 朱/山吹/藍/ghost の variant、CSS Modules | Phase 2 | 同左 | `feat(ui): Button primitive` |
| T-092 | `src/components/primitives/Chip.tsx`: 多選択チップ(active/inactive)、季節・カテゴリアイコン対応 | Phase 2 | 同左 | `feat(ui): Chip primitive` |
| T-093 | `src/components/primitives/Card.tsx`: 和紙カード(影、ヘアライン) | Phase 2 | 同左 | `feat(ui): Card primitive` |

### 9.2 機能別コンポーネント

| ID | タスク | deps | ファイル | コミット例 |
| --- | --- | --- | --- | --- |
| T-094 | `src/components/candidate/StrategySeal.tsx`: 朱印風の戦略印(`STRATEGY_LABELS` 参照、明朝・縦組み風) | T-033 | 同左 | `feat(ui): StrategySeal component` |
| T-095 | `src/components/candidate/CandidateCard.tsx`: タイトル/コンセプト/食材チップ/シーンタグ/why 注釈/戦略印 | T-091〜T-094 | 同左 | `feat(ui): CandidateCard component` |
| T-096 | `src/components/ingredient/SeasonTab.tsx` + `CategoryTab.tsx`: 季節タブ + カテゴリタブ(ミニアイコン付き) | T-092 | 同左 | `feat(ui): season + category tabs` |
| T-097 | `src/components/ingredient/IngredientCard.tsx`: 食材カード(画像 or プレースホルダ・季節バッジ・チェック切替) | T-091〜T-093 | 同左 | `feat(ui): IngredientCard component` |
| T-098 | `src/components/local/PrefectureGrid.tsx` + `RegionChip.tsx`: 47都道府県を地域別に並べる | T-091 | 同左 | `feat(ui): PrefectureGrid + RegionChip` |
| T-099 | `src/components/loading/BakingAnimation.tsx`: CSS keyframes でピザが焼ける情緒的演出、`prefers-reduced-motion` 対応 | T-026 | 同左 | `feat(ui): BakingAnimation` |

---

## Phase 10: 画面実装

design.md §7, §8 参照。

| ID | タスク | deps | ファイル | コミット例 |
| --- | --- | --- | --- | --- |
| T-101 | `app/page.tsx`: `<HomeRedirector />` Client Component で localStorage を見て `/local` or `/ingredients` にリダイレクト | T-081 | `app/page.tsx`, `app/_components/HomeRedirector.tsx` | `feat(app): home redirector based on saved locale` |
| T-102 | `app/local/page.tsx`: PrefectureGrid を埋め込み、選択即遷移ロジック | T-081, T-098, T-072 | 同左 + `_components/` | `feat(app): 01 local selection screen` |
| T-103 | `app/ingredients/page.tsx`: 上部地元表示 + 季節/カテゴリタブ + 食材一覧 + 「次へ」CTA | T-081, T-083, T-091, T-092, T-096, T-097, T-073 | 同左 + `_components/` | `feat(app): 02 ingredient selection screen` |
| T-104 | `app/candidates/[sessionId]/page.tsx`: mount で `useQuickTapStream.start()`、焼成中 → 段階表示、「もう一度ふる」「食材を変える」 | T-082, T-095, T-099, T-074, T-075 | 同左 + `_components/` | `feat(app): 04 candidates screen with NDJSON streaming` |
| T-105 | `app/not-found.tsx`: 簡素な 404 | Phase 2 | 同左 | `feat(app): basic 404 page` |

---

## Phase 11: テスト補完

requirements.md §4.3(ユニットテスト最低 5 本)が Phase 3〜8 で既に満たされている想定。ここでは**ハッピーパスの統合確認**を追加。

| ID | タスク | deps | ファイル | コミット例 |
| --- | --- | --- | --- | --- |
| T-111 | `tests/e2e/playwright.config.ts`: 雛形のみ(Slice 1 では走らせない) | — | 同左 | `test(e2e): playwright config skeleton` |
| T-112 | `tests/e2e/smoke.spec.ts`: `/api/health` を叩くだけのスモーク 1 本 | T-071 | 同左 | `test(e2e): health smoke test` |
| T-113 | 受け入れ条件 §4.1 を手動実行 → スクリーンショットを `.steering/.../screenshots/` に保存 | Phase 10 | `.steering/20260513-initial-implementation/screenshots/*` | (該当時のみ) `docs: add slice 1 acceptance screenshots` |

---

## Phase 12: CI とドキュメント

| ID | タスク | deps | ファイル | コミット例 |
| --- | --- | --- | --- | --- |
| T-121 | `.github/workflows/ci.yml`: Node ジョブ(install/lint/typecheck/test/build) | Phase 1 | 同左 | `ci: github actions for node` |
| T-122 | GitHub リポジトリのブランチ保護(main, status check 必須) | T-121 | (GitHub 設定) | — |
| T-123 | `Dockerfile`(Web 用、Next.js standalone output) | T-005 | `Dockerfile` | `chore: add web dockerfile` |
| T-124 | `README.md` ドラフト: プロダクト概要 / 技術スタック / セットアップ / 関連ドキュメントリンク | Phase 1〜11 | `README.md` | `docs: initial README draft` |
| T-125 | `.steering/20260513-initial-implementation/` の各ファイルにチェックを入れる(`- [x]`)更新 | T-124 | 本書他 | `docs: mark slice 1 tasks as complete` |

---

## Phase 13: 受け入れ最終確認

requirements.md §6 完了の定義に従う。

- [ ] **DoD-1**: §4.1 機能受け入れの 8 項目すべてが手元で動作確認
- [ ] **DoD-2**: §4.2 デザイン受け入れの 4 項目を満たす
- [ ] **DoD-3**: §4.3 DevOps 受け入れの 7 項目をすべて通過
- [ ] **DoD-4**: §4.4 コード品質受け入れの 5 項目をすべて通過
- [ ] **DoD-5**: §4.5 アーキテクチャ整合性受け入れの 3 項目をすべて通過
- [ ] **DoD-6**: `git log --oneline` を確認、Conventional Commits 準拠で粒度が読める状態
- [ ] **DoD-7**: README の手順だけで第三者がローカル起動できる(別端末で試す)
- [ ] **DoD-8**: 本書の全タスクに ✓

すべてに ✓ が付いたら、Slice 1 完了 → `git tag v0.1.0` を打って Slice 2 へ。

---

## タスク一覧サマリ(チェックボックス)

### Phase 1: ブートストラップ (11)
- [x] T-001 .nvmrc
- [x] T-002 package.json 初期化
- [ ] T-003 依存インストール
- [ ] T-004 tsconfig
- [ ] T-005 next.config
- [ ] T-006 eslint
- [ ] T-007 prettier
- [ ] T-008 vitest
- [ ] T-009 lefthook
- [ ] T-010 gitignore 他
- [ ] T-011 git init + push

### Phase 2: デザインシステム (6)
- [ ] T-021 tokens.css
- [ ] T-022 washi-noise.css
- [ ] T-023 next/font
- [ ] T-024 globals.css
- [ ] T-025 WashiTexture
- [ ] T-026 PizzaDisk

### Phase 3: ドメイン・スキーマ (4)
- [ ] T-031 Locale 型
- [ ] T-032 Ingredient 型
- [ ] T-033 Candidate / Strategy 型
- [ ] T-034 NDJSON Zod スキーマ

### Phase 4: ライブラリ層 (6)
- [ ] T-041 logger
- [ ] T-042 withSpan
- [ ] T-043 localStorage locale
- [ ] T-044 guest session id
- [ ] T-045 http error handler
- [ ] T-046 withAuthOptional

### Phase 5: Agent モック (3)
- [ ] T-051 NDJSON stream helper
- [ ] T-052 AgentClient interface
- [ ] T-053 mock-candidates

### Phase 6: 静的データ (4)
- [ ] T-061 ingredients.yaml
- [ ] T-062 build script
- [ ] T-063 prebuild フック
- [ ] T-064 .gitignore 判断

### Phase 7: BFF API (5)
- [ ] T-071 /api/health
- [ ] T-072 /api/locales
- [ ] T-073 /api/locales/[id]/ingredients
- [ ] T-074 POST /api/quicktap/sessions
- [ ] T-075 POST reroll

### Phase 8: フック・ストア (3)
- [ ] T-081 use-locale
- [ ] T-082 use-quicktap-stream
- [ ] T-083 quicktap store

### Phase 9: UI コンポーネント (9)
- [ ] T-091 Button
- [ ] T-092 Chip
- [ ] T-093 Card
- [ ] T-094 StrategySeal
- [ ] T-095 CandidateCard
- [ ] T-096 SeasonTab + CategoryTab
- [ ] T-097 IngredientCard
- [ ] T-098 PrefectureGrid + RegionChip
- [ ] T-099 BakingAnimation

### Phase 10: 画面実装 (5)
- [ ] T-101 HomeRedirector
- [ ] T-102 /local
- [ ] T-103 /ingredients
- [ ] T-104 /candidates/[sessionId]
- [ ] T-105 not-found

### Phase 11: テスト補完 (3)
- [ ] T-111 playwright config 雛形
- [ ] T-112 smoke spec
- [ ] T-113 受け入れ手動確認 + スクリーンショット

### Phase 12: CI・ドキュメント (5)
- [ ] T-121 ci.yml
- [ ] T-122 ブランチ保護
- [ ] T-123 Dockerfile
- [ ] T-124 README ドラフト
- [ ] T-125 tasklist の ✓ 更新

### Phase 13: 受け入れ最終 (8)
- [ ] DoD-1 機能受け入れ
- [ ] DoD-2 デザイン受け入れ
- [ ] DoD-3 DevOps 受け入れ
- [ ] DoD-4 コード品質
- [ ] DoD-5 アーキ整合
- [ ] DoD-6 git log 確認
- [ ] DoD-7 第三者検証
- [ ] DoD-8 全タスク ✓

**合計**: 56 タスク + 8 DoD = **64 項目**

---

## 想定スケジュール(2026/5/13〜2026/5/27)

| 週 | フェーズ | 想定タスク数 |
| --- | --- | --- |
| Week 1 (5/13〜5/19) | Phase 1〜6: 基盤 + デザイン + ドメイン + データ | 34 |
| Week 2 (5/20〜5/27) | Phase 7〜13: API + UI + 統合 + 受け入れ | 30 |

→ 平日 2〜3 タスク / 週末 5〜6 タスクが目安。リスクは Phase 9 (UI) と Phase 10 (画面実装) の見積もり甘め。詰まったら Phase 11 の E2E を後回しにする等で吸収。

---

## 改訂履歴

| 日付 | 版 | 変更内容 |
| --- | --- | --- |
| 2026-05-13 | 1.0 | 初版作成。Phase 1〜13 で 56 タスク + 8 DoD に分解。 |
