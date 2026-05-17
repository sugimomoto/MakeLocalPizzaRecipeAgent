# Slice 3 要求定義 (詳細画面 + Imagen 画像生成)

> 本書は `.steering/20260517-slice3-detail-imagen/` の作業要求を定義する。
> 永続的要件は [`docs/product-requirements.md`](../../docs/product-requirements.md)、
> アーキテクチャは [`docs/architecture.md`](../../docs/architecture.md) を参照。
> Slice 2 で完成した縦貫スタックの **「この一枚に決める →」 押下後の体験** を完成させるのが主題。

---

## 1. 目的と位置づけ

### 1.1 目的

Slice 2 で 3 案のサマリ表示まで体験できた状態に、**詳細画面 (Tap4)** を追加して
1 つの候補を「選んで眺める」体験を完成させる。

- 候補画面の「この一枚に決める →」押下で `/recipes/[id]` に遷移
- Gemini で **詳細レシピ** (材料分量・手順・「ゲストに語る」一段ストーリー) を生成
- **Imagen 4** で完成写真を生成してヒーロー表示
- 「ピザ帳に保存」/「作ってみる」ボタンは **UI のみ** (タップで alert、本実装は Slice 4)

### 1.2 位置づけ

- 全体ロードマップにおける **第 3 スライス**
- Slice 2 が「生成の中身を本物にする」スライスだったのに対し、Slice 3 は「**1 案ぶん深掘りする体験**」を追加する
- ハッカソン PR の見せ場として、Imagen 連動の「焼き上がり写真がふわっと出る」演出は強力
- Cloud Run デプロイ・Terraform・本番監視は引き続き Slice 6 に集約

### 1.3 後続スライスの想定 (本スライスでは扱わない)

| スライス | 想定内容 |
| --- | --- |
| Slice 4 | Firebase Auth + Firestore + フィードバック記録 + ピザ帳 (保存の永続化) |
| Slice 5 | 楽天ふるさと納税 API 連動 (キャッシュ + UI) |
| Slice 6 | Terraform + IaC + Cloud Run × 2 サービス本番デプロイ + 可観測性 |
| Slice 7 | Vertex AI Gen AI Evaluation + 戦略軸別品質モニタリング |

---

## 2. スコープ

### 2.1 IN (本スライスで実装する)

#### 2.1.1 Python Agent 拡張

- `agent/src/makelocal_agent/agents/detail_agent.py`: 詳細レシピ生成用の LlmAgent
  - 入力: locale / 選択食材 / 候補 (Slice 2 で生成された title・concept・strategy 等)
  - 出力: Pydantic `RecipeDetailLlmOutput` (材料配列・手順配列・「ゲストに語る」コピー・メタ)
  - モデル: **Gemini 2.5 Flash** (Slice 2 と同じ、コスト抑制)
- `agent/src/makelocal_agent/agents/image_agent.py`: Imagen 4 で画像生成
  - 入力: 候補の title / concept / keyIngredients から prompt 構築
  - 出力: 画像 (PNG bytes) または GCS 署名付き URL のいずれか (本スライスでは bytes → base64 で返す)
  - Vertex AI Imagen 4 API (`imagen-4.0-generate-001` 等の最新)
- `agent/src/makelocal_agent/routes/recipes.py`:
  - `POST /agent/recipes/[candidateId]`
  - リクエスト: `{ candidateId, localeId, ingredients, candidate: { title, concept, strategy, ... } }`
  - レスポンス: **NDJSON ストリーム** (Slice 2 と同じパターン)
    - `recipe.start` → `recipe.title` / `recipe.meta` / `recipe.materials` / `recipe.steps` / `recipe.story` / `recipe.done`
    - 並行して `image.start` → `image.ready { dataUri }` または `image.error`
- `agent/src/makelocal_agent/domain/recipe.py`: 詳細レシピ Pydantic 型
- `agent/src/makelocal_agent/domain/stream.py`: 上記 `recipe.*` `image.*` イベント型を追加 (discriminated union 拡張)

#### 2.1.2 Web (Next.js) BFF

- `app/api/recipes/[candidateId]/route.ts`: BFF route handler
  - Python Agent への pass-through (NDJSON ストリーム)
  - HttpAgentClient に `generateRecipeDetail(candidateId, payload)` メソッド追加
- `src/lib/agent/client.ts`: `AgentClient` interface に `generateRecipeDetail` を追加
- `src/lib/agent/mock-candidates.ts` (MockAgentClient): mock 実装も追加 (テスト用)

#### 2.1.3 Web (Next.js) 画面

- `app/recipes/[candidateId]/page.tsx`: 新画面
  - sessionStorage から候補 + 入力情報を取り出し
  - `useRecipeDetailStream` フックで NDJSON を受信
  - DetailScreen レイアウト:
    - **ヒーロー** (高さ 360px): 画像生成中はプレースホルダ + 「✦ 仕上がり画像を生成中…」、完了でフェードイン
    - 戻るボタン (左上) + ハート保存ボタン (右上) — ハートは Slice 4 で永続化
    - 「{県名} · {季節}の一枚」eyebrow + 大型 mincho タイトル + 戦略印 (右肩)
    - メタストリップ: 人数 / 時間 / 焼成温度 / 難易度
    - 材料一覧 (SectionLabel "食材 / INGREDIENTS" + 行に "材料名 / 分量")
    - 手順 (SectionLabel "手順 / STEPS" + 番号付きステップ)
    - ストーリーカード: 墨色背景 + 「ゲストに語る」eyebrow + mincho 引用 + 解説
    - CTA: 「ピザ帳に保存 (Slice 4)」 + 「作ってみる」(alert)
- `app/candidates/[sessionId]/_components/CandidatesClient.tsx`:
  - 「この一枚に決める →」を **alert ではなく `/recipes/[candidateId]` への遷移** に置換
  - sessionStorage に候補スナップショットを保存して渡す

#### 2.1.4 UI コンポーネント

- `src/components/recipe/RecipeHero.tsx`: 画像ヒーロー (生成中スケルトン + フェードイン)
- `src/components/recipe/MetaStrip.tsx`: 人数 / 時間 / 焼成温度 / 難易度
- `src/components/recipe/MaterialList.tsx`: 材料一覧
- `src/components/recipe/StepList.tsx`: 番号付き手順
- `src/components/recipe/StoryCard.tsx`: 「ゲストに語る」墨色背景カード
- `src/components/primitives/SectionLabel.tsx`: 既存 (Slice 1 Phase 14)、英語サブラベル対応に拡張

#### 2.1.5 環境変数

`.env.example` に追加:
```
MLPR_IMAGEN_MODEL=imagen-4.0-generate-001
MLPR_IMAGE_MAX_RETRY=2
```

#### 2.1.6 テスト

- Python: pytest で detail_agent / image_agent / routes/recipes を MockLlmClient + Mock Imagen でテスト
- TypeScript: HttpAgentClient.generateRecipeDetail / DetailScreen の RTL テスト
- E2E (smoke): manual (`AGENT_MODE=http` で /recipes 踏破)

### 2.2 OUT (本スライスで扱わない)

- **保存の永続化** (Firestore / Auth) → Slice 4
- **フィードバック収集** (★ / コメント) → Slice 4
- **ピザ帳一覧画面** → Slice 4
- 楽天ふるさと納税 → Slice 5
- Cloud Run デプロイ → Slice 6
- 画像の GCS 永続化 → Slice 4 or 6 (現状は dataUri base64 を毎回生成)
- Gemini 2.5 Pro (Flash で十分)
- detail のキャッシュ (毎回 LLM/Imagen 呼出、Slice 7 で品質指標と一緒に検討)

---

## 3. ユーザーストーリー

### 3.1 既存 PRD ストーリーで本スライスが満たすもの

- US-2「気に入った一枚の料理体験まで進めたい」: 詳細画面で材料/手順/写真が揃う
- US-3「『なぜこの提案か』を視覚で理解したい」: 写真と「ゲストに語る」コピーで実感が増す

### 3.2 開発者向けストーリー (本スライス固有)

#### DS-1: Imagen 連動を本番形式で固めたい
- 画像生成は時間がかかる (5〜15 秒)。recipe 生成 (text) と並行で走らせて、それぞれ別 NDJSON イベントで届くようにする
- 「テキストは早く出る → 数秒後に画像が ふわっ と入る」体験

#### DS-2: ストリーム契約を破らない
- Slice 1〜2 で確立した NDJSON discriminated union を維持
- recipe.* / image.* イベント追加だけで Web の汎用デコーダは無改修

#### DS-3: 保存 UI は形だけ作っておく
- DetailScreen に「ピザ帳に保存」ボタンが既にある状態で Slice 4 を開始したい
- スコープを切るために本スライスでは alert 止め

---

## 4. 受け入れ条件

### 4.1 機能受け入れ (ハッピーパスのデモ)

`AGENT_MODE=http` でローカル踏破:

- [ ] /candidates 上で「この一枚に決める →」押下 → `/recipes/[candidateId]` に遷移
- [ ] ヒーローに「✦ 仕上がり画像を生成中…」が一瞬出てから **Imagen 4 で生成された写真**にフェードイン
- [ ] タイトル / コンセプト / 戦略印 / 材料一覧 / 手順 / 「ゲストに語る」がすべて表示される
- [ ] 戻るボタンで `/candidates/[sessionId]` に戻れる
- [ ] ハートボタン / 「作ってみる」/「ピザ帳に保存」タップで alert (Slice 4 で本実装である旨を案内)
- [ ] Imagen が失敗した場合は **テキストレシピだけ表示**、画像は default skeleton 維持
- [ ] レシピ生成 + 画像生成 を 1 リクエストで並列実行 (両方が NDJSON 1 ストリームで届く)

### 4.2 Agent 受け入れ

- [ ] `POST /agent/recipes/[candidateId]` が 200 + `application/x-ndjson` を返す
- [ ] 422 (リクエスト schema 違反) を返せる
- [ ] Vertex Imagen 失敗時は `{type:"image.error", code, message}` を NDJSON で 1 行送り、recipe.* は継続
- [ ] Vertex Gemini (detail) 失敗時は ErrorEvent (Slice 2 と同じ規則) で全体終了

### 4.3 DevOps 受け入れ

- [ ] Python: ruff / mypy strict / pytest 全 pass (詳細関連の新規 50+ tests を追加)
- [ ] TS: Vitest / tsc / lint / build 全 pass (新規 30+ tests)
- [ ] CI: Slice 2 と同じく Node + Python 両ジョブ緑
- [ ] gitleaks pass (Slice 1 から継続)

### 4.4 コード品質受け入れ

- [ ] Python: ruff / mypy strict 準拠、Any 濫用なし
- [ ] TS: lint clean、`any` なし、依存方向違反なし
- [ ] 画像 bytes を直接 React state に持たない (data URI 文字列で授受 / メモリ効率)
- [ ] 環境変数経由のシークレットがコードにハードコードされていない
- [ ] gitleaks pass

### 4.5 アーキテクチャ整合性受け入れ

- [ ] NDJSON ストリーム契約 (StreamEvent discriminated union) に `recipe.*` `image.*` を追加した形が
       Python (Pydantic) と TS (Zod) で同期している
- [ ] BFF route が Python Agent への pass-through に徹している (ロジック追加なし)
- [ ] 詳細画面の routing が design.md と整合 (`/recipes/[candidateId]`)

---

## 5. 制約事項

### 5.1 技術的制約

- **Gemini 2.5 Flash** を引き続き採用 (Pro は使わない、コスト抑制)
- **Imagen 4** (`imagen-4.0-generate-001`) を Vertex AI 経由で呼ぶ
- Imagen の出力は **base64 data URI** で Web に渡す (GCS は Slice 4 or 6)
- 並列性は引き続き **asyncio (TaskGroup)**
- 画像サイズは **1024×1024** (Imagen 4 の標準)、必要に応じて square aspect

### 5.2 スケジュール制約

- 開発期間目安: **1〜1.5 週間** (2026/5/17〜2026/5/27 を目処)
- ハッカソン提出に向けて、5/27 頃に Slice 1〜3 まとめて公開デモ可能な状態を狙う

### 5.3 スコープ制約 (過剰実装の禁止)

- ❌ 詳細レシピの後編集 UI (ユーザが材料を増減する等) — Slice 4 以降
- ❌ 「作ってみる」のタイマー / 工程進行 — 範囲外 (Slice 4+ で要検討)
- ❌ 画像の resize / WebP 変換 — Imagen 標準のまま
- ❌ Pro 切替の機構 — Flash 固定
- ❌ 楽天との連携 (材料の調達ボタン等) — Slice 5

### 5.4 ドキュメント制約

- 永続的ドキュメント (`docs/`) は本スライス内では原則変更しない
- 本書 / design.md / tasklist.md に集約
- 終了時に README に 詳細画面踏破 手順を追記

---

## 6. 完了の定義 (Definition of Done)

本スライスは以下すべてが満たされた時点で完了とする:

1. ✅ §4.1 機能受け入れの 7 項目すべてが手元で動作確認できる
2. ✅ §4.2 Agent 受け入れの 4 項目を満たす
3. ✅ §4.3 DevOps 受け入れの 4 項目を通過
4. ✅ §4.4 コード品質受け入れの 5 項目を通過
5. ✅ §4.5 アーキテクチャ整合性受け入れの 3 項目を通過
6. ✅ `git log --oneline` で Conventional Commits 粒度を維持
7. ✅ README に Slice 3 動作手順を追記

完了したら `git tag v0.3.0` を打って Slice 4 (Firebase + 保存) へ。

---

## 7. リスクと前提

### 7.1 想定リスク

| リスク | 対応 |
| --- | --- |
| Imagen 4 API のレイテンシが想定より大きい | テキストレシピは先に表示、画像は後追いの NDJSON で良い体験を維持 |
| Imagen 出力 (1024×1024 base64) が NDJSON で重い (~数 MB) | 必要なら GCS 化 (Slice 4) や PNG → WebP / JPEG (Slice 6) |
| Imagen 失敗時に体験が崩れる | image.error イベントで明示、テキストは継続表示 |
| 詳細レシピ生成が長く candidate.* 体験を上回る | 並列実行 + 焼成スタイルアニメで体験を持たせる |
| 「ピザ帳に保存」が alert 止まりで PR 弱い | 「Slice 4 で永続化、Slice 5 で楽天と連動」のロードマップを明示 |

### 7.2 前提

- Slice 2 で固めた Agent / NDJSON / Vertex 接続が動作する
- Vertex AI Imagen 4 が当該プロジェクトで利用可能 (要 quota 確認)
- 開発者の ADC で Imagen 呼び出しが許可されている (Vertex AI User 等)

---

## 8. 改訂履歴

| 日付 | 版 | 変更内容 |
| --- | --- | --- |
| 2026-05-17 | 1.0 | 初版作成 |
