# Refactoring Foundation — requirements

> コードベース全体レビュー (2026-06-13) を起点とした、技術的負債解消のための
> リファクタリング作業。機能追加ではなく **「振る舞いを変えずに重複を共通基盤へ集約する」**
> ことを目的とする。Slice 1〜10 の段階開発で各 Slice ごとに局所最適化された結果生じた
> 「同じパターンの再実装」を、共通フック/ヘルパ/基底クラスへ抽出する。

---

## 1. 背景・目的

Slice 単位の段階開発によりレイヤ分離・テスト・インフラは健全に保たれている一方、
**各 Slice で独立に同じパターンが再実装され、重複が蓄積している**。全体レビューの結果、
以下の構造的負債が確認された。

1. **フロントエンド hooks の重複が最も濃い**
   - NDJSON ストリーミング (`use-quicktap-stream` / `use-recipe-detail-stream`) が
     `consumeStream` / AbortController 管理 / 429 toast / sessionStorage hydrate まで
     ほぼ同一コードで二重実装されている (合わせて 546 行)
   - 上記ストリーム hook はアンマウント時に `abort()` されず、unmount 後 `dispatch` の
     race / メモリリークの恐れがある (**実バグ候補**)
   - Firestore 購読 (`use-saved-recipes` / `use-saved-recipe` / `use-furusato-items`) で
     認証チェック→購読→cleanup が毎回手書き、deps 安定化も不統一
   - localStorage 購読 (`use-locale` / `use-oven-profile`) の `useSyncExternalStore` +
     listener Set パターンが各自実装

2. **API 層の定型コードの重複**
   - JSON parse → zod safeParse → エラー整形が複数 Route Handler でコピペ、
     zod エラー整形方法も route ごとに不統一
   - パスパラメータの手動 `split` 抽出が複数箇所
   - `Candidate` の zod スキーマが Route 内で再定義され `domain/candidate.ts` と二重管理
   - Firestore 正規化 (Timestamp→Date 変換 / score clamp) が feedback / saved-recipe で重複

3. **TypeScript ⇔ Python のスキーマ二重管理 (構造的リスク最大)**
   - `src/domain/schemas.ts` (zod) と `agent/.../domain/stream.py` (Pydantic) で
     約 19 種のストリームイベント型・enum 値・フィールド名を手動同期している。
     現状は一致しているが、イベント追加時に片側を忘れると **本番でのみ** validation
     エラーになる構造。同期ずれを検出する仕組みが無い。

4. **Python エージェントの重複**
   - `deps.py` (248 行) で 5 つの依存 (LLM/Imagen/Storage/Furusato/Rakuten) について
     `get_* / reset_* / set_*_for_testing` の 3 点セットが完全に繰り返し
   - `orchestrator.py` と `recipe_orchestrator.py` で Queue + TaskGroup + sentinel ドレーンの
     並列イベントストリーミング骨格が同一
   - `routes/candidates.py` と `routes/recipes.py` で locale + 食材解決ロジックがコピペ、
     HTTPException の detail 形式も不統一

5. **UI レイヤの肥大化とマイクロ重複**
   - `FeedbackClient.tsx` (542 行: フォーム + 写真アップロード + 下書き自動保存 + モーダル混在)
   - `DetailClient.tsx` (451 行: snapshot 構築ロジックが 2 箇所に完全複製)
   - `equipment/page.tsx` (596 行: 14 個のインラインコンポーネント)
   - 日付フォーマット関数が 3 ファイルで個別定義、skeleton パターンが 5 箇所以上

6. **リポジトリ衛生**
   - `js-yaml` が devDependencies だが `prebuild` で必須 (本番ビルド経路で壊れる恐れ)
   - `docs/` (architecture / functional-design) が Slice 7 で停止、Slice 8〜10 未反映
   - `_reference/` (旧プロジェクト約 330 ファイル) が参照終了後も残存

### 目的

- 重複コードの集約により、今後の Slice 追加時に「どのパターンに従えばよいか」を明確化する
- 共通化と同時に、ストリーム hook のメモリリーク系バグを解消する
- TS ⇔ Python スキーマの同期ずれを CI で恒久的に検出できるようにする
- いずれも **既存の振る舞い・公開 API・UI を変えない** ことを絶対条件とする

---

## 2. ユーザストーリー (開発者視点)

### US-R1 (主): 新しいストリーミング機能を追加する開発者
> 開発者として、新しい NDJSON ストリームを扱う機能を追加するとき、
> AbortController・429 処理・hydrate を再実装せず共通フックに乗せたい。
> なぜなら、同じ仕組みを毎回書くと実装漏れ (特に cleanup) でバグが入るから。

### US-R2 (主): ストリームイベント型を追加する開発者
> 開発者として、新しいストリームイベントを追加したとき、TS 側か Python 側の
> どちらかの更新を忘れたら CI で即座に気づきたい。なぜなら、現状は本番で
> 初めて validation エラーが顕在化し、デバッグコストが高いから。

### US-R3 (副): 新しい API Route を追加する開発者
> 開発者として、新しい Route Handler を追加するとき、JSON parse・zod 検証・
> エラー整形のボイラープレートを共通ヘルパで済ませたい。なぜなら、route ごとに
> 微妙に異なる実装が増えると、エラーレスポンス形式が不統一になるから。

### US-R4 (副): エージェントに新しい依存やオーケストレータを足す開発者
> 開発者として、Python エージェントに新しい依存や並列タスクを追加するとき、
> シングルトン管理や TaskGroup ドレーンの定型を再実装したくない。

---

## 3. 受け入れ条件

リファクタリングのため、全 AC に共通する大前提:

- **AC-R0 (絶対条件)**: 既存の全テスト (`pnpm test` / `pnpm test:rules` / `agent` の pytest /
  可能なら `pnpm test:e2e`) が、各フェーズ完了時点でグリーンであること。
  振る舞い・公開 API・UI・レスポンス形式を一切変えない。

- **AC-R1**: 2 つのストリーム hook が共通基盤 `useStream` を利用し、
  `consumeStream` / AbortController / 429 処理の重複コードが解消されている。
  かつ **アンマウント時に進行中ストリームが abort される** こと (新規テストで担保)。

- **AC-R2**: saved-recipe 系 3 hook が共通の Firestore 購読基盤を利用し、
  認証チェック・cleanup の重複が解消されている。

- **AC-R3**: localStorage 購読 hook (locale / oven-profile) が共通基盤を利用している。

- **AC-R4**: 全 Route Handler が共通の body parse / zod 検証ヘルパを利用し、
  zod エラー整形とパスパラメータ抽出が統一されている。

- **AC-R5**: `Candidate` の zod スキーマが `domain/` に一元化され、`z.infer` で型が導出されている
  (Route 内の再定義を排除)。

- **AC-R6**: TS ⇔ Python のストリームイベントスキーマ同期を検証する **契約テスト** が
  存在し、CI で同期ずれを検出できる。

- **AC-R7**: `deps.py` の 5 依存が汎用シングルトン管理に統一され、重複が解消されている。

- **AC-R8**: 2 つのオーケストレータが共通の並列イベントストリーミング基盤を利用している。

- **AC-R9**: `js-yaml` が `dependencies` へ移動し、`pnpm build` (prebuild 含む) が
  production install 相当の状態でも成功する。

- **AC-R10**: 肥大化した 3 コンポーネント (Feedback / Detail / equipment) が責務分割され、
  特に `DetailClient` の snapshot 構築の複製が単一関数に集約されている。

- **AC-R11**: `docs/architecture.md` / `docs/functional-design.md` に Slice 8〜10 の内容が
  反映されている (本リファクタで触れた箇所の整合も含む)。

---

## 4. スコープ

### 4.1 IN

リファクタリングを 5 フェーズに分割。各フェーズは独立して完結し、既存テストを安全網とする。

- **Phase 1 — フロントエンド共通基盤** 【効果: 高 / 工数: L】
  - `src/hooks/use-stream.ts` (NDJSON + AbortController + 429 + unmount abort cleanup)
  - 2 ストリーム hook を移行
  - `src/hooks/use-firestore-query.ts` (認証 + 購読 + cleanup)、saved-recipe 系 3 hook 移行
  - `src/lib/localstorage/` に `useStorageValue` 共通基盤、locale / oven-profile 移行
- **Phase 2 — API 層の定型コード統一** 【効果: 中 / 工数: M】
  - `src/lib/http/parse-body.ts` (parse + zod + エラー整形)、`getPathParam` ヘルパ
  - 全 Route Handler 移行、zod エラー整形 / rate-limit ヘッダ出力の統一
  - `CandidateSchema` を `domain/candidate.ts` に集約、API リクエストスキーマも domain 集約
  - `src/lib/firebase/normalize.ts` に Timestamp 変換・clamp 共通化
- **Phase 3 — TS ⇔ Python スキーマ同期保証** 【効果: 高 / 工数: M】
  - Python 側で全イベント型のサンプル JSON fixture を生成し、TS 側テストが zod でパースする
    契約テストを追加 (CI で同期ずれ検出)
  - (任意・余力次第) Pydantic を source of truth に JSON Schema 経由で zod 自動生成は別途検討
- **Phase 4 — Python エージェント整理** 【効果: 中 / 工数: M】
  - `deps.py` に汎用 `SingletonManager[T]` 導入、5 依存を統一
  - 並列イベントストリーミング基盤を抽出し orchestrator / recipe_orchestrator 載せ替え
  - routes の locale+食材解決を共通関数化、HTTPException detail 形式を統一
  - refresh_furusato_cache.py のコアロジックをサービスクラスに抽出
- **Phase 5 — UI 分割 + 衛生** 【効果: 中 / 工数: M】
  - FeedbackClient / DetailClient / equipment/page.tsx の責務分割
  - `src/lib/format-date.ts` 統一、skeleton 共通コンポーネント、CSS utilities 集約
  - **即時対応 (フェーズ前倒し可)**: js-yaml を dependencies へ移動、docs/ への Slice 8〜10
    反映、_reference/ の削除判断

### 4.2 OUT (将来 / 別作業)

- Pydantic → zod の完全自動生成パイプライン (codegen) の本格導入
- レートリミットの fail-open 方針 (`store.ts` の Firestore エラー時 `allowed: true`) の
  仕様変更 — 本リファクタでは触らず、別途方針確認の上で判断
- テストカバレッジ計測の CI 組み込み / app/ 側 Route Handler のユニットテスト新規追加
- Zustand と useReducer を跨ぐ QuickTap フロー全体の状態管理再設計 (大規模・別スライス)
- next.config の redirect ホスト名の環境変数化
- Terraform のモジュール分割

---

## 5. 非機能要件

- **安全性**: 各フェーズは小さな PR 単位に分割し、フェーズ完了ごとに全テストグリーンを確認。
  振る舞いの変化が無いことを既存テストで担保する。テストが薄い箇所 (ストリーム unmount /
  契約テスト) は **先に characterization テストを足してから** リファクタする。
- **可逆性**: 各フェーズはコミット単位で revert 可能にする。複数フェーズを 1 コミットに混ぜない。
- **一貫性**: 抽出した共通基盤は CLAUDE.md / development-guidelines.md の命名規則に従う。
- **テスト容易性**: 共通基盤は DI 可能な形で設計し、既存のモック方針 (mock client / emulator)
  を壊さない。

---

## 6. 制約事項

- **CLAUDE.md の手順遵守**: requirements → design → tasklist を順に承認後に着手。
  永続ドキュメント (`docs/`) に影響する変更 (AC-R11) は該当ドキュメントを更新する。
- **既存ジャーニーへの影響ゼロ**: QuickTap → 候補 → 詳細 → ハート保存 → フィードバック →
  ピザ帳 → 振り返り → 共有 の全ジャーニーの挙動を変えない。
- **Firestore Rules / インフラは変更しない**: 本リファクタはアプリケーションコードのみ対象。
- **段階適用**: Phase 1 と即時対応 (js-yaml) を最優先。Phase 間の依存は無いが、
  推奨着手順は js-yaml → Phase 1 → Phase 3 (契約テスト) → Phase 2 → Phase 4 → Phase 5。

---

## 7. 想定リスク

- **リファクタによる回帰**: 既存テストが薄い箇所で振る舞いが変わる恐れ →
  characterization テストを先に追加し、差分を最小コミットで進める
- **共通化の過剰抽象化**: 早すぎる抽象化で逆に読みにくくなる恐れ →
  「3 箇所以上で重複が確認できたパターンのみ」を抽出対象とし、2 箇所の重複は対象外
- **TS/Python 契約テストの偽陰性**: fixture が一部イベントを網羅しないと同期ずれを見逃す →
  全イベント型を列挙する網羅性チェック (型 union の要素数と fixture 件数の一致) を入れる
- **工数の見積もりブレ**: Phase 1 (L) と Phase 3 が想定より大きくなる可能性 →
  各フェーズ着手前に tasklist で再見積もりし、肥大化時はサブ分割する
