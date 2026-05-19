# Slice 6 要求書 — Cloud Run × 2 本番デプロイ + IaC + 可観測性

## 1. このスライスのゴール (1 行)

**ハッカソン審査員が触れる公開 URL を持つ**。Web/BFF (`mlpr-web`) と Python ADK Agent (`mlpr-agent`) を Cloud Run の 2 サービスとして Terraform で IaC 化し、Cloud Build からの自動デプロイで運用できる状態にする。

## 2. 背景

### 2.1 ハッカソン提出要件

[docs/hackathon-reference.md](../../docs/hackathon-reference.md) より:

- **必須**: Cloud Run デプロイ URL (動作確認可能な状態)
- 公開 GitHub リポジトリ
- 「つくる × まわす × とどける」3 軸 — 「**とどける** = Cloud Run デプロイ」が中核

### 2.2 これまでの実装状態

- v0.5.0 まで完了 (Slice 1〜5)。ローカル (devcontainer + Firebase Emulator) で全機能が動く
- Web (Next.js standalone Dockerfile) は既に存在、Python Agent には Dockerfile 未整備
- 楽天 API キーはローカル `.env` のみ、本番運用には Secret Manager が必要
- Firebase は Emulator のみ、本番 Firebase プロジェクトは未作成
- 観測性 (OTel / Cloud Logging) は未配線

### 2.3 姉妹プロジェクトの遺産

[`_reference/MakePizzaRecipeAgent/infra/`](../../_reference/MakePizzaRecipeAgent/infra/) に Terraform / Cloud Build YAML が一式揃っている。Slice 5 同様、**設計は流用 + 本プロジェクトのトーンに合わせて調整** する戦略で着手。

## 3. スコープ

### 3.1 IN (Slice 6 で実装)

| カテゴリ | 何 |
|---|---|
| **mlpr-web Cloud Run** | 既存 `Dockerfile` を Artifact Registry に push、Cloud Run service として deploy。公開アクセス可。`AGENT_BASE_URL` 経由で内部 `mlpr-agent` を呼ぶ |
| **mlpr-agent Cloud Run** | `agent/Dockerfile` を新規作成 (Python 3.12 + uv + FastAPI + uvicorn)。internal IAM 限定 (Cloud Run Invoker)、`mlpr-web` のサービスアカウントだけが呼べる |
| **Service-to-Service 認証** | `mlpr-web` のサービスアカウントが `mlpr-agent` の Invoker。Web 側で google-auth-library で ID トークン取得し `Authorization: Bearer` で渡す |
| **Firebase 本番プロジェクト** | Firebase Console で新規プロジェクト or 既存 GCP プロジェクトに Firebase 追加。Auth (Google) / Firestore / Storage を有効化。`firestore.rules` / `storage.rules` を deploy |
| **Secret Manager** | `RAKUTEN_APPLICATION_ID` / `RAKUTEN_ACCESS_KEY` / `RAKUTEN_AFFILIATE_ID` を Secret Manager に。Cloud Run から `--update-secrets` で env として注入 |
| **Terraform IaC** | `infra/terraform/` 配下に services / IAM / Artifact Registry / Storage Bucket / Secret Manager 参照 / Workload Identity Federation (GitHub Actions 用) を IaC 化 |
| **Cloud Build パイプライン** | `infra/cloudbuild/deploy-web.yaml` + `deploy-agent.yaml`。main push で自動 build + deploy。手動 trigger も可 |
| **GitHub Actions → Cloud Build** | `.github/workflows/deploy.yml` で main push → Cloud Build を起動 (Workload Identity Federation で OIDC 認証、サービスアカウント鍵レス) |
| **環境変数の本番化** | `NEXT_PUBLIC_FIREBASE_*` を本番プロジェクト値に。`NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false` で本番接続。`AGENT_MODE=http` でリアル Agent を呼ぶ |
| **OTel + Cloud Logging** | `instrumentation.ts` を本番 trace export (Cloud Trace) に。Python は `google-cloud-trace` + structured logging (`google-cloud-logging` の StructuredLogHandler) |
| **GCS バケット** | `${PROJECT}-pizza-images` を作成、`mlpr-agent` SA に `storage.objectAdmin`。`MLPR_FIREBASE_STORAGE_BUCKET` で参照 |
| **furusato_items 本番 Firestore に seed** | refresh script を Cloud Run Job として手動実行 (or 開発機から `FIRESTORE_EMULATOR_HOST` 未設定 + 本番認証) |
| **ドキュメント** | `infra/README.md` (デプロイ手順) + `docs/architecture.md` を本番構成に更新 + `README.md` の「デプロイ URL」セクション追加 |
| **CI 拡張** | 既存 CI に `terraform fmt -check` / `terraform validate` の lint step を追加 |

### 3.2 OUT (Slice 6 では実装しない)

| 何 | いつ |
|---|---|
| Cloud Run Jobs による週次 refresh 自動化 (Cloud Scheduler 連動) | Slice 6 で手動 trigger まで、自動化は Slice 7 |
| Vertex AI Gen AI Evaluation | Slice 7 |
| カスタムドメイン (例: `mlpr.example.com`) + SSL | Slice 6 では Cloud Run の `*.run.app` URL を使う |
| マルチリージョン / オートスケール調整 | デフォルトのまま |
| Cloud Run の最小インスタンス数 > 0 (= cold start なし) | コスト最適化のため初期は 0 (起動 ~2-3 秒許容) |
| 本番データのバックアップ / 災害復旧 | ハッカソン提出後 |
| アクセスログ分析・SLO/SLI 監視 | OTel + Cloud Logging の最低限まで |
| HTTPS 強制 / CSP / セキュリティヘッダー強化 | Cloud Run の既定 HTTPS で十分、CSP は Slice 7+ |

## 4. ユーザーストーリー

- **US-1** (審査員): 公開 URL にアクセスして実際に動くアプリを触りたい。サインインも実 Google アカウントでできて、保存も本物の Firestore に残る
- **US-2** (審査員): デモのスクリーンショットや動画と同じ画面が見られる
- **US-3** (開発者): main にマージしたら自動でデプロイされてほしい (手動デプロイ作業ゼロ)
- **US-4** (開発者): 楽天 API キーやサービスアカウント鍵を git に commit したくない (Secret Manager 経由)
- **US-5** (開発者): 障害時にログ / トレースを見て原因を特定したい (Cloud Logging + Cloud Trace 必須)

## 5. 機能要件

### 5.1 Web (`mlpr-web`)

- Cloud Run service、リージョン `asia-northeast1` (東京)
- min instances 0、max 5、CPU 1、memory 512Mi
- 公開アクセス (allUsers, Cloud Run Invoker)
- 環境変数:
  - `AGENT_MODE=http`
  - `AGENT_BASE_URL=https://<mlpr-agent-internal-url>`
  - `NEXT_PUBLIC_FIREBASE_*` (本番値)
  - `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false`
  - `NEXT_PUBLIC_FURUSATO_INTEGRATION=on`
  - `NEXT_TELEMETRY_DISABLED=1`

### 5.2 Agent (`mlpr-agent`)

- Cloud Run service、同リージョン
- min instances 0、max 3、CPU 2、memory 1Gi (Imagen / Gemini 並列)
- **internal traffic only** (Cloud Run Invoker は `mlpr-web` の SA だけ)
- 環境変数:
  - `MLPR_GOOGLE_CLOUD_PROJECT=<本番 project_id>`
  - `MLPR_VERTEX_AI_LOCATION=asia-northeast1`
  - `MLPR_USE_MOCK_LLM=false` / `MLPR_USE_MOCK_IMAGE=false` / `MLPR_USE_MOCK_STORAGE=false`
  - `MLPR_FIREBASE_STORAGE_BUCKET=<PROJECT>-pizza-images`
  - `MLPR_FURUSATO_INTEGRATION=on`
- Secret Manager 経由:
  - `RAKUTEN_APPLICATION_ID`
  - `RAKUTEN_ACCESS_KEY`
  - `RAKUTEN_AFFILIATE_ID` (任意)

### 5.3 IAM サービスアカウント

| SA | 用途 | 主要ロール |
|---|---|---|
| `mlpr-web@<PROJECT>.iam.gserviceaccount.com` | mlpr-web の実行 ID | `roles/run.invoker` on mlpr-agent / `roles/cloudtrace.agent` / `roles/logging.logWriter` |
| `mlpr-agent@<PROJECT>.iam.gserviceaccount.com` | mlpr-agent の実行 ID | `roles/aiplatform.user` (Vertex Gemini/Imagen) / `roles/datastore.user` (Firestore) / `roles/storage.objectAdmin` (画像 put) / `roles/secretmanager.secretAccessor` (楽天キー) / `roles/cloudtrace.agent` / `roles/logging.logWriter` |
| `mlpr-deployer@<PROJECT>.iam.gserviceaccount.com` | Cloud Build から deploy する SA | `roles/run.admin` / `roles/cloudbuild.builds.editor` / `roles/artifactregistry.writer` / `roles/iam.serviceAccountUser` |
| GitHub Actions (Workload Identity Federation) | OIDC 経由で `mlpr-deployer` の権限を impersonate | (鍵レス) |

### 5.4 観測性

- **Cloud Trace**: Web の `instrumentation.ts` + Python `OpenTelemetry instrumentation` で trace を export
- **Cloud Logging**: structured logging (JSON)、Cloud Run が自動で標準出力を取り込む
- **エラー通知**: 最低限 Cloud Run の Error Reporting (自動 / 設定不要) で見える状態
- **メトリクス**: Cloud Run の標準メトリクス (リクエスト数 / レイテンシ / メモリ / CPU) でOK、custom metrics は Slice 7 で

### 5.5 furusato 連動の本番化

- 楽天 API キーを Secret Manager に登録
- `mlpr-agent` の SA に `secretAccessor` 権限
- 初回 refresh: 開発機から `MLPR_GOOGLE_CLOUD_PROJECT=<本番>` で `uv run python scripts/refresh_furusato_cache.py` を実行 (Firestore に 30 docs を書き込み)
- 本番 Firestore に書くため楽天 API の IP ホワイトリストに開発機 IP を登録 (Slice 5 と同様)
- 自動化 (Cloud Run Jobs + Cloud Scheduler) は Slice 7

## 6. 非機能要件

### 6.1 セキュリティ

- **サービスアカウント鍵を git に commit しない** — Workload Identity Federation で OIDC 認証
- **楽天 API キー** は Secret Manager のみ。`.env` 本番値を repo に置かない
- **mlpr-agent は internal traffic** で外部直アクセス不可
- **Firestore rules** は本番でも `users/{uid}/savedRecipes` 本人限定、`furusato_items` public read を維持
- **Storage rules** は recipes/ public read / client write 不可

### 6.2 デプロイの再現性

- Terraform で全 GCP リソースを管理。手動コンソール操作は最小限
- Cloud Build pipeline は `infra/cloudbuild/*.yaml` に明文化
- GitHub Actions の secret は **GCP project ID** のみ (それ以外はすべて WIF + Secret Manager 経由)

### 6.3 コスト

- Cloud Run min instances 0 (cold start 許容)
- Imagen 4 のコスト ~$0.04/画像 は Slice 4 から既知。本番ユーザが増えたら考える
- Vertex Gemini Flash は安価 (~$0.001/1000 token 程度)
- 楽天 API は無料 (レート制限 1 req/秒)

### 6.4 観測性最低ライン

- 障害発生時に **Cloud Logging で URL とエラー内容が紐づく** こと
- レイテンシ p50 < 3s、p95 < 8s (Imagen 画像生成を含むレシピ詳細を想定)
- エラー率 < 1% (Imagen quota 超過等は除く)

## 7. 成功基準 (DoD)

1. ✅ 公開 URL (`https://mlpr-web-xxxx.a.run.app`) にアクセスできる
2. ✅ TOP → 地元選択 → 食材選択 → 候補 3 案 → 詳細レシピ → ピザ帳保存 → /library までフル動作
3. ✅ Google サインインが本物の Google アカウントで動く (Firebase Auth 本番)
4. ✅ Firestore に保存 / read できる (本番プロジェクト)
5. ✅ Imagen が本物の画像を生成する (Storage に put される)
6. ✅ ふるさと納税セクションが本物のデータで出る (本番 Firestore furusato_items)
7. ✅ main ブランチに push したら Cloud Build が走り、自動で deploy される
8. ✅ Cloud Run の SA 鍵がリポジトリに無い (Workload Identity Federation で OIDC)
9. ✅ Secret Manager から楽天キーを取れている (Cloud Run env 経由)
10. ✅ Terraform で `terraform plan` が clean (drift なし)
11. ✅ Cloud Trace に trace が出る (詳細レシピストリームの 1 リクエストで `/api/recipes/[id]` → `/agent/recipes/[id]` の親子関係が見える)
12. ✅ CI 全 green、`infra/terraform` の `terraform fmt -check` / `validate` も含む
13. ✅ v0.6.0 タグ push 済

## 8. 想定外スコープ (やらない)

- ❌ カスタムドメイン (Cloud Run の `*.run.app` URL を使う)
- ❌ Cloud Run Jobs + Cloud Scheduler による refresh 自動化 (Slice 7)
- ❌ Vertex AI Evaluation 連動 (Slice 7)
- ❌ CDN / Edge Cache (静的アセットは Cloud Run の自動 cache で十分)
- ❌ マルチリージョン
- ❌ Sentry / Datadog 等の外部監視ツール

## 9. リスクと緩和

| リスク | 緩和策 |
|---|---|
| GCP プロジェクト未準備 / API 有効化漏れ | Terraform で `google_project_service` を明示、`infra/README.md` で前提手順を documented |
| Workload Identity Federation の OIDC 設定難航 | 姉妹プロジェクトの設定を流用、最初は SA 鍵で deploy → 後で WIF に移行する 2 段階移行も許容 |
| Firebase 本番 Auth の OAuth クライアント設定漏れ | Firebase Console で「承認済みドメイン」に Cloud Run URL を追加する手順を README に |
| 楽天 API の IP ホワイトリスト (本番 refresh 用) | 初回は開発機 IP で実行、Cloud Run Jobs 化は Slice 7 |
| Imagen quota 超過 | `MLPR_USE_MOCK_IMAGE=true` への fallback で凌ぐ、本番値変更は Cloud Run env 一発 |
| Cold start の遅さ | 初期は許容、ハッカソン提出後に min-instances を 1 に上げるか |
| Cloud Build のリージョン (asia-northeast1 で動くか) | Artifact Registry も同リージョンに |
| Web → Agent の ID トークン期限切れ | google-auth-library は自動 refresh、`audience` (=`mlpr-agent` URL) を正しく設定 |

## 10. 実装順序の方針

Phase 構成 (詳細は `tasklist.md` で):

1. **Phase 1**: 前提整備 — GCP プロジェクト準備手順 doc / `agent/Dockerfile` 作成 / Firebase 本番プロジェクト作成手順
2. **Phase 2**: Terraform 基盤 — IAM / Artifact Registry / Storage Bucket / Secret Manager の枠組み
3. **Phase 3**: Cloud Run deploy — `mlpr-web` / `mlpr-agent` の service 定義、初回 manual deploy
4. **Phase 4**: Service-to-Service 認証 — Web → Agent の ID トークンフロー実装
5. **Phase 5**: 観測性 — Cloud Trace / structured logging の本番配線
6. **Phase 6**: CI/CD — Cloud Build pipeline + GitHub Actions WIF
7. **Phase 7**: ラップアップ — 本番 refresh / README / v0.6.0 タグ

## 11. 改訂履歴

| 日付 | 版 | 変更内容 |
|---|---|---|
| 2026-05-20 | 1.0 | 初版作成 (フルスコープ + 既存 GCP プロジェクト前提) |
