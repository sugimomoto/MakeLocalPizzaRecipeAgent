# Slice 6 タスクリスト — Cloud Run × 2 本番デプロイ + IaC + 可観測性

> 本書は [`requirements.md`](requirements.md) / [`design.md`](design.md) を実装する
> タスク分解。**1 task = 1 commit** (Conventional Commits)、Phase 末で push +
> 状態確認。インフラ作業を伴うため、Phase 1-2 はローカルで完結するが、
> Phase 3 以降は **実 GCP プロジェクトでの apply / deploy が必要**。

---

## 進捗ルール

- ステータス: `[ ]` 未着手 / `[~]` 進行中 / `[x]` 完了
- 完了条件 (DoC): 各タスクに記載
- フェーズ末で push → 動作確認 (deploy 系は実 GCP に反映済を verify)
- Conventional Commits + `Co-Authored-By: Claude` フッタ

---

## サマリ (合計 22 タスク / 7 フェーズ)

| Phase | 主題 | タスク数 |
|---|---|---|
| Phase 1 | 前提整備 (agent Dockerfile / 手順ドキュメント) | 3 |
| Phase 2 | Terraform 基盤 (providers / IAM / AR / Storage / Secret) | 5 |
| Phase 3 | Cloud Run service 定義 + 初回 manual deploy | 4 |
| Phase 4 | Web → Agent ID token 認証 | 2 |
| Phase 5 | 観測性 (Cloud Trace + structured logging) | 2 |
| Phase 6 | CI/CD (Cloud Build + GitHub Actions WIF) | 4 |
| Phase 7 | 本番 furusato refresh + README + v0.6.0 | 2 |

---

## Phase 1 — 前提整備

### T-601 GCP プロジェクト準備手順 + Firebase セットアップ doc

- [ ] `infra/README.md` を新規作成:
  - GCP プロジェクト ID の確認方法
  - 必要 API 有効化 (run / cloudbuild / artifactregistry / secretmanager / aiplatform / firestore / iamcredentials / sts / storage)
  - Firebase 追加 (Console 手動)、Auth Google プロバイダ有効化、Firestore ネイティブモード、Storage デフォルトバケット
  - 楽天 API キー 3 本を Secret Manager に投入する手順 (`gcloud secrets versions add`)
  - state 用 GCS バケット `${PROJECT}-tfstate` 作成 (versioning 有効)
- [ ] 段階的に追っていけるチェックリスト形式
- **DoC**: 新規開発者が `infra/README.md` だけで Slice 6 を始められる
- **commit**: `docs(slice6): add infra/README with GCP + Firebase setup guide`

### T-602 `agent/Dockerfile` + `.dockerignore` 新規作成

- [ ] `agent/Dockerfile`:
  - Base: `python:3.12-slim`
  - uv install + `uv sync --frozen --no-dev`
  - src/ + data/ をコピー
  - `CMD ["sh", "-c", "uv run uvicorn makelocal_agent.main:app --host 0.0.0.0 --port ${PORT}"]`
  - `PORT=8080` (Cloud Run 規約)
- [ ] `agent/.dockerignore`: tests/ / __pycache__ / .venv / .env を除外
- [ ] ローカルで `docker build -t mlpr-agent agent/` が成功すること
- [ ] `docker run -p 8001:8080 -e MLPR_USE_MOCK_LLM=true mlpr-agent` で `/agent/health` が応答する
- **DoC**: 手元で agent image が build + run できる
- **commit**: `feat(slice6): add agent/Dockerfile for Cloud Run`

### T-603 Web `Dockerfile` の Cloud Run 対応見直し

- [ ] 既存 `Dockerfile` を確認、`PORT` 環境変数を尊重する設定か確認 (Next.js standalone は `next start` で `process.env.PORT` を見る)
- [ ] `next.config.ts` で `output: 'standalone'` を確認 (既設定なら触らない)
- [ ] `pnpm prebuild` (build:data) が build に含まれることを確認
- [ ] ローカルで `docker build -t mlpr-web .` + `docker run -p 8080:8080 mlpr-web` で `/local` が 200
- **DoC**: 手元で web image が build + run できる
- **commit**: `chore(slice6): verify web Dockerfile for Cloud Run PORT env`

→ **push & CI green 確認** (Docker build は CI には組み込まない、ローカル確認のみ)

---

## Phase 2 — Terraform 基盤

### T-604 Terraform 骨格 (providers / backend / variables)

- [ ] `infra/terraform/providers.tf`: `google` + `google-beta`、region=asia-northeast1
- [ ] `infra/terraform/backend.tf`: GCS backend (`bucket=${PROJECT}-tfstate`, `prefix=slice6`)
- [ ] `infra/terraform/variables.tf`: `project_id` / `region` / `github_repository` / `name_prefix="mlpr"` 等
- [ ] `infra/terraform/terraform.tfvars.example`: 値の例 (commit する、tfvars 本体は gitignore)
- [ ] `infra/terraform/main.tf`: `locals` で SA 名規約、`google_project_service` で必要 API 一括有効化
- [ ] `.gitignore` に `*.tfvars` / `.terraform/` / `.terraform.lock.hcl` (lock は commit する派/しない派ある、ここでは commit する) を整理
- [ ] `terraform fmt -check` / `terraform validate` がローカルで pass
- **DoC**: 骨格が validate green、apply 未実施
- **commit**: `feat(slice6): scaffold Terraform (providers / backend / variables)`

### T-605 IAM (3 SA + ロール定義)

- [ ] `infra/terraform/iam.tf`:
  - `mlpr-web` SA + cloudtrace.agent / logging.logWriter
  - `mlpr-agent` SA + aiplatform.user / datastore.user / storage.objectAdmin / secretmanager.secretAccessor / cloudtrace.agent / logging.logWriter
  - `mlpr-deployer` SA + run.admin / cloudbuild.builds.editor / artifactregistry.writer / iam.serviceAccountUser
- [ ] `mlpr-web` SA に `roles/run.invoker` on `mlpr-agent` (service-level binding は Phase 3 で agent 作成後に追加)
- [ ] terraform validate green
- **DoC**: ローカルで `terraform plan` clean
- **commit**: `feat(slice6): add IAM service accounts for Cloud Run + deployer`

### T-606 Artifact Registry (Docker repo)

- [ ] `infra/terraform/artifact_registry.tf`: `google_artifact_registry_repository`
  - `repository_id="mlpr"` / `format="DOCKER"` / `location=asia-northeast1`
- [ ] `mlpr-deployer` SA に `roles/artifactregistry.writer` on this repo
- [ ] `mlpr-web` / `mlpr-agent` の SA に `roles/artifactregistry.reader` (Cloud Run の image pull)
- **DoC**: terraform plan clean
- **commit**: `feat(slice6): add Artifact Registry repo (mlpr/docker)`

### T-607 Storage Bucket (画像) + Secret Manager (楽天キー)

- [ ] `infra/terraform/storage.tf`: `google_storage_bucket "${PROJECT}-pizza-images"` (uniform access, public read for recipes/* via bucket-level IAM)
- [ ] `mlpr-agent` SA に `roles/storage.objectAdmin` on this bucket
- [ ] `infra/terraform/secret_manager.tf`:
  - `rakuten-application-id` / `rakuten-access-key` / `rakuten-affiliate-id` の 3 secret
  - 各 secret の値投入はせず空のまま (`gcloud secrets versions add` で手動)
  - `mlpr-agent` SA に `secretAccessor` を各 secret に bind
- **DoC**: terraform plan clean、bucket / secret が plan に出る
- **commit**: `feat(slice6): add Storage bucket + Secret Manager (rakuten keys)`

### T-608 初回 Terraform apply (実 GCP プロジェクトで)

- [ ] **(ユーザ作業)** GCP プロジェクト ID を `terraform.tfvars` に書く
- [ ] **(ユーザ作業)** `gcloud auth application-default login`
- [ ] **(ユーザ作業)** `${PROJECT}-tfstate` バケットを `gsutil mb` で手動作成 (versioning 有効)、`gsutil versioning set on gs://${PROJECT}-tfstate`
- [ ] `cd infra/terraform && terraform init && terraform apply` を実行
- [ ] **(ユーザ作業)** 楽天 API キー 3 本を `gcloud secrets versions add` で投入
- **DoC**: GCP Console で 3 SA / AR repo / bucket / secret が見える
- **commit**: 該当なし (IaC コード自体は T-604〜T-607 で commit 済、`apply` は手元実行)

→ **push & 実 GCP に反映確認**

---

## Phase 3 — Cloud Run service 定義 + 初回 deploy

### T-609 `cloud_run_web.tf` (placeholder image で先に骨格)

- [ ] `infra/terraform/cloud_run_web.tf`:
  - `google_cloud_run_v2_service` `mlpr-web`
  - image = `us-docker.pkg.dev/cloudrun/container/hello` (placeholder)
  - region / SA / scaling (min=0, max=5) / cpu=1 / memory=512Mi / port=8080
  - env 設定 (`AGENT_BASE_URL` は Phase 3 末で agent URL を埋める、初期は dummy)
  - `google_cloud_run_v2_service_iam_member` で `allUsers` を invoker に
- **DoC**: terraform apply で hello service が起動、公開 URL で hello world が見える
- **commit**: `feat(slice6): add Cloud Run service for mlpr-web (placeholder image)`

### T-610 `cloud_run_agent.tf` (placeholder image + internal ingress)

- [ ] `infra/terraform/cloud_run_agent.tf`:
  - `google_cloud_run_v2_service` `mlpr-agent`
  - image = placeholder
  - `ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"`
  - SA / scaling (min=0, max=3) / cpu=2 / memory=1Gi
  - env 設定 + Secret Manager 参照 (`value_source.secret_key_ref`)
  - `google_cloud_run_v2_service_iam_member` で **mlpr-web SA** を invoker に (他は付与しない)
- **DoC**: terraform apply で hello service が起動、`mlpr-web` から呼べる (mlpr-agent URL に直接 curl すると 403)
- **commit**: `feat(slice6): add Cloud Run service for mlpr-agent (internal)`

### T-611 outputs.tf + manual Cloud Build (Web)

- [ ] `infra/terraform/outputs.tf`:
  - `web_url` / `agent_url` / `deployer_sa_email` / `artifact_registry_url`
- [ ] **(ユーザ作業)** 手元で `gcloud builds submit --tag asia-northeast1-docker.pkg.dev/${PROJECT}/mlpr/web:initial .` で Web image を build & push
- [ ] **(ユーザ作業)** `gcloud run deploy mlpr-web --image=... --region=asia-northeast1` で本物 image に切替
- [ ] 公開 URL で TOP ページが見える (Firebase なしでも /local まで動く)
- **DoC**: Cloud Run の `mlpr-web` が本物 image で起動、公開 URL で /local が 200
- **commit**: `feat(slice6): add outputs + initial manual web deploy`

### T-612 manual Cloud Build (Agent) + AGENT_BASE_URL を web に注入

- [ ] **(ユーザ作業)** `gcloud builds submit --tag asia-northeast1-docker.pkg.dev/${PROJECT}/mlpr/agent:initial agent/`
- [ ] **(ユーザ作業)** `gcloud run deploy mlpr-agent --image=... --region=asia-northeast1 --ingress=internal --no-allow-unauthenticated`
- [ ] Terraform で `cloud_run_web.tf` の `AGENT_BASE_URL` を `google_cloud_run_v2_service.agent.uri` で参照 (literal を depends_on で差し替え)
- [ ] terraform apply で Web の env が agent URL に更新される
- [ ] 公開 URL でレシピ生成フローが動く確認 (この時点ではまだ Web→Agent 認証なしなのでエラー予想、Phase 4 で解決)
- **DoC**: 両 service が deploy 済、Terraform で AGENT_BASE_URL が正しく流れる
- **commit**: `feat(slice6): wire AGENT_BASE_URL from agent service uri`

→ **push & 動作確認**

---

## Phase 4 — Web → Agent ID token 認証

### T-613 `HttpAgentClient` に google-auth-library で ID token 取得

- [ ] `pnpm add google-auth-library` (Node 22 サポート確認)
- [ ] `src/lib/agent/http-client.ts`:
  - Cloud Run 環境 (`K_SERVICE` env 存在) のときだけ google-auth-library を使う
  - `GoogleAuth.getIdTokenClient(audience)` で audience を `AGENT_BASE_URL` に
  - 既存 fetch に `Authorization: Bearer ${idToken}` を付与
  - ローカル dev (`K_SERVICE` 未設定) では従来通り (token なし)
- [ ] ユニットテスト追加: K_SERVICE あり/なしで header が付くか確認 (mock fetch)
- **DoC**: ローカル test green、デプロイ後に Web→Agent が 200 を返す
- **commit**: `feat(slice6): add ID token auth for Web → Agent (Cloud Run)`

### T-614 deploy + 認証フロー検証

- [ ] **(ユーザ作業)** Web image を再 build & deploy
- [ ] 公開 URL で TOP → 地元 → 食材 → 候補 → 詳細レシピ → /library フル動作確認
- [ ] Cloud Logging で Web → Agent の trace を確認 (audit log で invoker が `mlpr-web@...` で記録される)
- **DoC**: フルジャーニーが本番で動く、認証エラーなし
- **commit**: 該当なし (T-613 の deploy で完結)

→ **push & 動作確認**

---

## Phase 5 — 観測性

### T-615 Web Cloud Trace export (instrumentation.ts)

- [ ] `pnpm add @opentelemetry/sdk-node @google-cloud/opentelemetry-cloud-trace-exporter`
- [ ] `instrumentation.ts` を改修:
  - `K_SERVICE` あり → Cloud Trace export を起動
  - W3C Trace Context propagation を有効化 (HTTP outgoing)
- [ ] HttpAgentClient の fetch に traceparent header を伝播
- [ ] redeploy + Cloud Trace UI で `/api/recipes/[id]` → `/agent/recipes/[id]` の親子 span が見える
- **DoC**: Cloud Trace で 1 リクエストの全体 span が辿れる
- **commit**: `feat(slice6): wire Cloud Trace exporter for Web`

### T-616 Python observability + structured logging

- [ ] `agent/pyproject.toml` に `opentelemetry-exporter-gcp-trace` + `python-json-logger` 追加
- [ ] `agent/src/makelocal_agent/observability.py`:
  - `K_SERVICE` あり → `configure_observability()` で OTel + JsonFormatter
  - FastAPI の middleware で trace context を受け取り
- [ ] redeploy + Cloud Logging で JSON log が出る + Cloud Trace で agent 側 span も繋がる
- **DoC**: Cloud Logging に JSON log、Cloud Trace で web→agent の連続 span
- **commit**: `feat(slice6): wire Cloud Trace + structured logging for Agent`

→ **push & 動作確認**

---

## Phase 6 — CI/CD (Cloud Build + WIF)

### T-617 Cloud Build YAML × 2 (deploy-web / deploy-agent)

- [ ] `infra/cloudbuild/deploy-web.yaml`:
  - Docker build → AR push → `gcloud run deploy mlpr-web --image=...`
  - logs: CLOUD_LOGGING_ONLY
  - timeout: 1200s
- [ ] `infra/cloudbuild/deploy-agent.yaml`:
  - Docker build (`agent/`) → AR push → `gcloud run deploy mlpr-agent`
  - `--ingress=internal --no-allow-unauthenticated`
- [ ] **(ユーザ作業)** `gcloud builds submit --config=infra/cloudbuild/deploy-web.yaml` で手動 trigger 成功確認
- [ ] 同 agent
- **DoC**: 手動 Cloud Build trigger で両 service が再 deploy される
- **commit**: `feat(slice6): add Cloud Build YAML for web + agent`

### T-618 Workload Identity Federation (Terraform)

- [ ] `infra/terraform/workload_identity.tf`:
  - `google_iam_workload_identity_pool` `github`
  - `google_iam_workload_identity_pool_provider` `github`
  - attribute mapping (subject / repository / actor)
  - `mlpr-deployer` SA に `roles/iam.workloadIdentityUser` for `principalSet://...attribute.repository/sugimomoto/MakeLocalPizzaRecipeAgent`
- [ ] terraform apply
- [ ] outputs に WIF provider 名 + deployer SA を追加
- **DoC**: GCP Console で Workload Identity Pool が見える
- **commit**: `feat(slice6): add Workload Identity Federation for GitHub Actions`

### T-619 GitHub Actions deploy.yml (main push → Cloud Build)

- [ ] `.github/workflows/deploy.yml`:
  - main push trigger
  - `google-github-actions/auth@v2` (WIF)
  - `gcloud builds submit --config=infra/cloudbuild/deploy-web.yaml` (Web)
  - 並列で `deploy-agent.yaml`
- [ ] GitHub Actions secrets に `GCP_PROJECT_ID` のみ追加 (他は WIF 経由)
- [ ] テスト push で動作確認
- **DoC**: main に push → GitHub Actions が走り → Cloud Build → Cloud Run 両 service が更新される
- **commit**: `ci(slice6): add deploy.yml (GitHub Actions → Cloud Build via WIF)`

### T-620 CI に Terraform validate を追加

- [ ] `.github/workflows/ci.yml` に terraform job 追加:
  - `terraform fmt -check`
  - `terraform validate` (init 後)
- [ ] PR 時に diff が分かるよう `terraform plan` を comment するのは optional
- **DoC**: PR で terraform lint が走る
- **commit**: `ci(slice6): add terraform fmt/validate to CI`

→ **push & 自動 deploy が成功することを確認**

---

## Phase 7 — 本番 furusato refresh + ラップアップ

### T-621 本番 Firestore に furusato_items を seed (手動)

- [ ] **(ユーザ作業)** 開発機の egress IP が楽天 IP 制限に登録済か確認
- [ ] **(ユーザ作業)** `gcloud auth application-default login` で本番 ADC
- [ ] **(ユーザ作業)** `unset FIRESTORE_EMULATOR_HOST && MLPR_GOOGLE_CLOUD_PROJECT=<本番> cd agent && uv run python scripts/refresh_furusato_cache.py`
- [ ] 本番 Firestore Console で `furusato_items/` に 30 docs が見える
- [ ] 公開 URL の詳細レシピ画面で「取 寄 / FURUSATO」セクションが本物のデータで出る
- **DoC**: 公開 URL で furusato section が表示される (Slice 5 の機能が本番で動く)
- **commit**: 該当なし (refresh は実行のみ、コード変更なし)

### T-622 README + v0.6.0 タグ

- [ ] `README.md`:
  - 「公開 URL」セクションを追加 (Cloud Run の URL)
  - 「機能」リストに「Cloud Run 本番デプロイ済 (v0.6.0)」を追記
  - `📦 デプロイ` セクションを新設して `infra/README.md` へリンク
- [ ] `docs/architecture.md` を本番構成に更新 (Cloud Run × 2 + WIF + Secret Manager)
- [ ] `package.json` / `agent/pyproject.toml` を 0.6.0 にバンプ
- [ ] `.env.example` `NEXT_PUBLIC_APP_VERSION=0.6.0`
- [ ] CI 全 green を確認
- [ ] `git tag -a v0.6.0 -m "Slice 6 — Cloud Run × 2 production deploy"` + push v0.6.0
- **DoC**: README から公開 URL がリンクされる / CI green / タグ push 済 / 公開 URL がハッカソン審査員に提示可能
- **commit**: `chore(slice6): wrap-up README + bump to v0.6.0`

→ **push & v0.6.0 タグ + ハッカソン提出 URL 確定**

---

## Slice 6 完了の DoD (Definition of Done)

1. 公開 URL (`https://mlpr-web-xxxx.a.run.app`) にアクセスできて TOP が見える
2. 「始める →」から /local → /ingredients → /candidates → /recipes → /library のフルジャーニーが動く
3. Google サインインで実 Google アカウントが使える (本番 Firebase Auth)
4. 詳細レシピでハート → 本番 Firestore に保存される / /library で一覧
5. Imagen が本物のピザ画像を生成する (Storage に put される)
6. ふるさと納税セクションで本物の楽天返礼品が出る (本番 Firestore furusato_items)
7. main push → GitHub Actions → Cloud Build → Cloud Run の自動 deploy が動く
8. SA 鍵が repository に無い (WIF で OIDC 認証)
9. Cloud Trace で `/api/recipes/[id]` → `/agent/recipes/[id]` の親子 span が見える
10. Cloud Logging に JSON 形式の structured log が出る
11. terraform plan が clean (drift なし)
12. CI 全 green (Node / Python / Rules / E2E / Terraform)
13. v0.6.0 タグ push 済

---

## 実 GCP 作業のチェックポイント (ユーザ依頼)

各 Phase で **ユーザの実機作業** が必要な部分を明示:

| Phase | ユーザ作業 |
|---|---|
| 1 | GCP プロジェクト ID 確認、API 有効化、Firebase Console セットアップ、楽天 API キーを Secret Manager 投入する準備 |
| 2 | `terraform.tfvars` 作成 + ADC ログイン + tfstate バケット作成 + `terraform apply` 実行 + 楽天キー投入 |
| 3 | 初回 `gcloud builds submit` (web / agent) + 動作確認 |
| 6 | GitHub Actions secrets に `GCP_PROJECT_ID` 設定 + WIF 設定の Cloud Console 確認 |
| 7 | 本番 furusato refresh 実行、公開 URL でフル動作確認、Firebase 承認済ドメイン追加 |

---

## 改訂履歴

| 日付 | 版 | 変更内容 |
|---|---|---|
| 2026-05-20 | 1.0 | 初版作成 (フルスコープ + 既存 GCP プロジェクト前提) |
