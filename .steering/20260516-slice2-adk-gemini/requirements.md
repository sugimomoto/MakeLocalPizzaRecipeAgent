# Slice 2 要求定義 (Python ADK Agent + Vertex Gemini)

> 本書は `.steering/20260516-slice2-adk-gemini/` の作業要求を定義する。
> 永続的要件は [`docs/product-requirements.md`](../../docs/product-requirements.md) と
> [`docs/architecture.md`](../../docs/architecture.md) を参照。
> Slice 1 の縦貫スタック (Mock) を **本物の Gemini で動く ADK Agent に差し替える** のが本スライスの主題。

---

## 1. 目的と位置づけ

### 1.1 目的

Slice 1 で構築した縦貫スタックの **MockAgentClient を、Google ADK で構築した
Python Agent (Vertex AI Gemini 連携) に差し替え**、本物の LLM で動く 3 案生成体験を完成させる。

- ユーザ体験の見た目は Slice 1 と同じ NDJSON ストリーム + 3 案カード
- 中身は決定論的テンプレートから **実際の食材組合せに基づく Gemini 推論**へ
- AGENT_MODE 環境変数で **mock / http を切替** (テスト・オフライン開発は mock を維持)

### 1.2 位置づけ

- 全体ロードマップにおける **第 2 スライス**
- 本物の AI が動く瞬間 = ハッカソン審査員に見せる「中身が動いている」の主要な PR ポイント
- Cloud Run デプロイ・Terraform・本番監視は **Slice 6 に集約** (本スライスはローカル稼働まで)

### 1.3 後続スライスの想定 (本スライスでは扱わない)

| スライス | 想定内容 |
| --- | --- |
| Slice 3 | 詳細画面 (Tap4) + Imagen 画像生成 |
| Slice 4 | Firebase Auth + Firestore + フィードバック記録 + ピザ帳 |
| Slice 5 | 楽天ふるさと納税 API 連動 (キャッシュ + UI) |
| Slice 6 | Terraform + IaC + Cloud Run × 2 サービス本番デプロイ + 可観測性 |
| Slice 7 | Vertex AI Gen AI Evaluation + 戦略軸別品質モニタリング |

---

## 2. スコープ

### 2.1 IN (本スライスで実装する)

#### 2.1.1 Python Agent 基盤
- `agent/` 配下に独立 Python パッケージ作成 (`pyproject.toml` + `uv`)
- Python 3.12+ / FastAPI (uvicorn) で 8080 ポートを listen
- ADK (`google.adk.agents.LlmAgent`) で **candidates_agent** を 1 つ作る
- Pydantic で I/O schema を定義 (Web 側 Zod スキーマと semantic 同期)
- ローカルで `uv run uvicorn ...` で起動できる

#### 2.1.2 Gemini 連携
- Vertex AI 経由で **Gemini 2.5 Flash** (候補生成) を呼ぶ
  - Gemini 2.5 Pro は Slice 3 (詳細画面) で使う想定。Slice 2 では Flash で軽量化
- 認証: Application Default Credentials (`gcloud auth application-default login`)
- リトライ・タイムアウト・モデルバージョン固定

#### 2.1.3 候補生成エンドポイント
- `POST /agent/generate-candidates`
  - リクエスト: `{ localeId, ingredients, guestSessionId? }`
  - レスポンス: **NDJSON ストリーム** (Slice 1 の Zod スキーマと同じ `StreamEvent`)
- `POST /agent/reroll`
  - リクエスト: `{ sessionId }`
  - レスポンス: NDJSON ストリーム
- 戦略軸 3 つ (exploit / tune / explore) を **並列に Gemini 呼び出し** して順次 yield
  - 出力を構造化させる (Pydantic の response_schema)
  - 各候補のフィールドを candidate.* イベントとして emit

#### 2.1.4 静的データ (Python 側)
- `agent/src/makelocal_agent/data/ingredients.py`: `agent/data/ingredients.yaml` を起動時にロードして Pydantic モデル化
- Web 側と **同一の YAML を参照** (二重管理しない)

#### 2.1.5 Web → Agent 連携
- `src/lib/agent/http-client.ts`: 本物の HTTP クライアント実装
- `process.env.AGENT_MODE === 'mock' ? MockAgentClient : HttpAgentClient`
- `AGENT_BASE_URL` (default: `http://localhost:8080`)
- AGENT_TIMEOUT_MS (default: 60_000)
- リクエストヘッダで guestSessionId を pass-through

#### 2.1.6 DevContainer 拡張
- `.devcontainer/Dockerfile` に Python 3.12 + uv が既に入っていることを確認
- 不足あれば追加 (post-create.sh 修正)
- `pyproject.toml` の依存をインストールする post-create 手順

#### 2.1.7 テスト
- Python: `pytest` で Agent 単体テスト
  - 候補生成 (Gemini モック使用 — 実呼び出しはしない)
  - NDJSON エンコーディング
  - スキーマ検証 (Pydantic)
- TypeScript: `HttpAgentClient` の単体テスト (fetch モック)
- E2E (smoke): `AGENT_MODE=http` で起動した状態で `/api/quicktap/sessions` を叩いて NDJSON が流れること (※ Vertex AI を実呼び出しするので CI ではスキップ)

#### 2.1.8 CI 拡張
- `.github/workflows/ci.yml` に **Python ジョブ** 追加 (ruff / mypy / pytest)
- Node ジョブと並列実行

#### 2.1.9 ドキュメント
- README に Python セットアップ手順 (uv venv / .env サンプル / 起動) を追記
- `.env.example` に `AGENT_MODE` / `AGENT_BASE_URL` / `GOOGLE_CLOUD_PROJECT` / `VERTEX_AI_LOCATION` を追加

### 2.2 OUT (本スライスで扱わない)

- Cloud Run デプロイ・Terraform・Artifact Registry → Slice 6
- IAM ID トークンによる web → agent 認証 → Slice 6 (ローカル開発では認証なし)
- Firestore / Firebase Auth → Slice 4
- 楽天 API 連動 → Slice 5
- 詳細画面 (Tap4) / Imagen → Slice 3
- 多並列実行のコスト最適化 / トレース送信 → Slice 6, 7
- traits_agent (T5 ユーザ嗜好学習) → Slice 4 以降
- Gemini 出力の Evaluation 連動 → Slice 7
- prompt の i18n → 当面日本語固定

---

## 3. ユーザーストーリー

### 3.1 既存 PRD ストーリーで本スライスが満たすもの

PRD の主要ユーザストーリーから抜粋:
- US-1「タップ 2〜3 回でレシピ候補が見たい」: Slice 1 で UX 形成済み。**中身が本物の AI 出力に置き換わる**
- US-3「『なぜこの提案か』を理解したい」: Gemini に why フィールドを生成させ、戦略意図を説明

### 3.2 開発者向けストーリー (本スライス固有)

#### DS-1: AGENT_MODE を切替えてオフライン開発ができる
- ローカル開発時は `AGENT_MODE=mock` で従来通り
- Vertex AI 呼び出しテストは `AGENT_MODE=http` + 起動した Python agent

#### DS-2: Gemini 出力が構造化されている
- Pydantic response_schema で出力フィールドが固定
- レスポンスの shape ブレに振り回されない

#### DS-3: Python と TypeScript で同じドメイン語彙を共有する
- `agent/src/makelocal_agent/domain.py` (Pydantic) と
- `src/domain/*.ts` (Zod) を semantic に同期
- フィールド名・enum 値が一致 (CI で検証は Slice 6 で考える)

---

## 4. 受け入れ条件

### 4.1 機能受け入れ (ハッピーパスのデモ)

ローカルで Web (`pnpm dev`) と Agent (`uv run uvicorn ...`) を両方起動し、以下が動くこと:

- [ ] `AGENT_MODE=http` で /ingredients → 「次へ」 → /candidates が動く
- [ ] 候補 3 案が **戦略軸ごとに異なる文体・食材組合せ** で表示される (テンプレート的でない)
- [ ] 「振り直し」で **別の 3 案** が生成される (前回と内容が異なる)
- [ ] 未対応 locale (現状 44 県) は引き続き Slice 1 と同じ「準備中」表示
- [ ] `AGENT_MODE=mock` に戻すと Slice 1 の挙動に戻る (regression なし)

### 4.2 Agent 受け入れ

- [ ] `uv run uvicorn agent.src.makelocal_agent.main:app --port 8080` で起動できる
- [ ] `GET /agent/health` が 200 を返す
- [ ] `POST /agent/generate-candidates` が `application/x-ndjson` の 200 を返す
- [ ] Pydantic スキーマ違反は 422 を返す
- [ ] Gemini 失敗時は `{type:"error", code, message}` を NDJSON で 1 行送って終わる

### 4.3 DevOps 受け入れ

- [ ] `uv sync` で Python 依存解決
- [ ] `uv run ruff check .` が pass
- [ ] `uv run mypy .` が pass
- [ ] `uv run pytest` が pass (Gemini はモック)
- [ ] GitHub Actions に Python ジョブが追加され、ruff/mypy/pytest が緑

### 4.4 コード品質受け入れ

- [ ] Python: `ruff` + `mypy --strict` 準拠
- [ ] Python: `Any` 型の濫用なし (Pydantic で narrowing)
- [ ] TS 側: HttpAgentClient が `AgentClient` interface を implement
- [ ] 環境変数経由のシークレット (GOOGLE_CLOUD_PROJECT 等) がコードにハードコードされていない
- [ ] gitleaks pass (Slice 1 から継続)

### 4.5 アーキテクチャ整合性受け入れ

- [ ] NDJSON ストリーム契約 (`StreamEvent`) が Slice 1 と完全互換 (web 側コード無変更で受信できる)
- [ ] Web → Agent の HTTP インターフェースが [`docs/architecture.md`](../../docs/architecture.md) のシーケンスと一致
- [ ] Python `domain.py` と TS `domain/*.ts` が同名フィールド・同型

---

## 5. 制約事項

### 5.1 技術的制約

- **Python 3.12 LTS** を採用 (`pyproject.toml` で requires-python 固定)
- **uv** によるパッケージ管理 (pip / poetry は使わない)
- **ADK** (`google-adk`) を agent 構築の中核に置く (シンプルな vertex SDK 直叩きは避ける)
- **Vertex AI** 経由で Gemini 2.5 Flash を呼ぶ (Generative Language API の直叩きは使わない)
- **uvicorn 8080** をローカル稼働ポートに固定 (DevContainer の forwardPorts に既存)
- 並列性は **asyncio (TaskGroup)** で実現 (multiprocessing は使わない)

### 5.2 スケジュール制約

- 開発期間目安: **1.5〜2 週間** (2026/5/16〜2026/5/30 を目処)
- ハッカソン提出に向けて、Slice 3 (詳細画面 + Imagen) との合算で 6 月中旬完了を狙う

### 5.3 スコープ制約 (過剰実装の禁止)

- ❌ Cloud Run デプロイのための Dockerfile 最適化 (Slice 6)
- ❌ Pub/Sub などのキュー連動 (Slice 1 設計に無い)
- ❌ Vertex AI Evaluation 連動 (Slice 7)
- ❌ traits_agent / detail_agent (Slice 3/4 で着手)
- ❌ Python パッケージを Docker でラップしたまま起動 (Slice 6)
- ❌ ストリーミング以外のレスポンス形式 (JSON 一括等) の追加

### 5.4 ドキュメント制約

- 永続的ドキュメント (`docs/`) は **本スライス内で変更しない** (既に Python ADK 計画記載済み)
- 本書 (`requirements.md`) / `design.md` / `tasklist.md` に集約
- 終了時に README に Python 側セットアップを追記 (T-124 README ドラフトの章追加)

---

## 6. 完了の定義 (Definition of Done)

本スライスは以下すべてが満たされた時点で完了とする:

1. ✅ §4.1 機能受け入れの 5 項目すべてが手元で動作確認できる
2. ✅ §4.2 Agent 受け入れの 5 項目を満たす
3. ✅ §4.3 DevOps 受け入れの 5 項目をすべて通過
4. ✅ §4.4 コード品質受け入れの 5 項目をすべて通過
5. ✅ §4.5 アーキテクチャ整合性受け入れの 3 項目をすべて通過
6. ✅ `git log --oneline` で Conventional Commits 粒度を維持
7. ✅ Python 側セットアップが README に追記され、別端末で再現できる

完了したら `git tag v0.2.0` を打って Slice 3 へ。

---

## 7. リスクと前提

### 7.1 想定リスク

| リスク | 対応 |
| --- | --- |
| Vertex AI クォータ・料金が予想以上 | Gemini 2.5 Flash を採用 + 開発時はキャッシュ or AGENT_MODE=mock |
| ADK の API が安定していない (preview) | バージョン固定 + Pydantic で出力スキーマを縛る |
| Python と TS のドメイン定義が乖離する | CI 検証は Slice 6 で。本スライスは目視 + テスト |
| ストリーミング JSON の chunk 境界バグ | Slice 1 で TS 側は実装済 (stream.ts)、Python 側は同様にバッファリング |
| ADK + asyncio + Vertex SDK の組み合わせで未知の落とし穴 | Slice 2 早期に「Hello Gemini」レベルの spike を組んで疎通確認 |

### 7.2 前提

- ハッカソン参加者として Google Cloud プロジェクト + Vertex AI 利用権限がある
- 開発者の端末で `gcloud auth application-default login` 済み
- Slice 1 の Web 側コードと NDJSON 契約が安定している (v0.1.0)
- DevContainer の Python 3.12 + uv が動作する

---

## 8. 改訂履歴

| 日付 | 版 | 変更内容 |
| --- | --- | --- |
| 2026-05-16 | 1.0 | 初版作成 |
