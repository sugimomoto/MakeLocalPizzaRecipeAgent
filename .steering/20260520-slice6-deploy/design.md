# Slice 6 設計書 — Cloud Run × 2 本番デプロイ + IaC + 可観測性

> 本書は [`requirements.md`](requirements.md) を実装する設計。
> Terraform / Cloud Build の構造は姉妹プロジェクト
> [`_reference/MakePizzaRecipeAgent/infra/`](../../_reference/MakePizzaRecipeAgent/infra/)
> を流用 + 本プロジェクトの命名 (`mlpr-*`) に調整。

---

## 1. 設計の全体方針

### 1.1 7 つの設計判断

1. **2 サービス分離** — `mlpr-web` (公開) と `mlpr-agent` (internal IAM 限定) を別 Cloud Run service に分離。
   - 理由: scale 特性が違う (Web は短時間 / Agent は LLM 待ちで長め)、権限境界も明確化
2. **internal traffic + ID トークン認証** — `mlpr-agent` は外部直アクセス不可、`mlpr-web` の SA のみ Invoker。Web 側で `google-auth-library` の `IdTokenClient` で `audience` を agent URL に指定し、`Authorization: Bearer <id_token>` 付きで HTTP 呼び出し。
3. **Terraform 単一ステート** — `infra/terraform/` で 1 つの workspace。state backend は GCS (project 内 `${PROJECT}-tfstate` バケット) を使う。複数環境は将来検討 (Slice 6 では `prod` 1 環境のみ)。
4. **Workload Identity Federation** — GitHub Actions に SA 鍵を持たせない。OIDC で `mlpr-deployer` を impersonate。
5. **Cloud Build for build, Cloud Run for runtime** — `gcloud run deploy --source` でも可能だが、build と deploy を分離して **`mlpr-web` / `mlpr-agent` を並列ビルド** + Artifact Registry に push する流儀を採用。
6. **Secret Manager で楽天 API キー** — Cloud Run の `--update-secrets` で env として注入。SA に `secretAccessor` 権限。
7. **Cloud Trace + Cloud Logging 最小配線** — `instrumentation.ts` (Next.js) + `google-cloud-trace` (Python) で span 出力。Cloud Run は標準出力を Cloud Logging に自動転送するので、JSON で出すだけで構造化される。

### 1.2 Slice 6 が決めること / 決めないこと

| カテゴリ | 決めること | 決めないこと |
|---|---|---|
| デプロイ環境数 | `prod` 1 環境 (Cloud Run × 2) | `dev` / `staging` の分離 (将来) |
| Cloud Run image registry | Artifact Registry (`asia-northeast1-docker.pkg.dev`) | Docker Hub / GCR |
| build 経路 | Cloud Build (`cloudbuild.yaml`) | `gcloud run deploy --source` |
| auth (GitHub→GCP) | Workload Identity Federation (OIDC) | SA 鍵 |
| Web→Agent 認証 | Cloud Run ID トークン (audience = agent URL) | Bearer の static token / カスタム JWT |
| Firestore Rules deploy | `firebase deploy --only firestore:rules` を Cloud Build に組込 | Terraform `google_firebaserules_release` (動くが UX 悪) |
| 監視 | Cloud Trace (auto-instrument) + Cloud Logging | Datadog / Sentry / Grafana |
| Cold start 対策 | min-instances 0 のまま (許容) | min-instances 1 (Slice 7 以降検討) |

---

## 2. アーキテクチャ

### 2.1 本番構成図 (Slice 6 完了時)

```
              ┌────────────────────────────────────────┐
              │ Browser (公開ユーザ)                    │
              └─────────────────┬──────────────────────┘
                                │ HTTPS
                                ▼
              ┌────────────────────────────────────────┐
              │ Cloud Run: mlpr-web (asia-northeast1)  │
              │   - allUsers: roles/run.invoker        │
              │   - SA: mlpr-web@<PROJECT>             │
              │   - Next.js standalone (Dockerfile)    │
              └─────────────────┬──────────────────────┘
                                │ HTTPS + Bearer (Cloud Run ID token)
                                ▼
              ┌────────────────────────────────────────┐
              │ Cloud Run: mlpr-agent (internal only)  │
              │   - mlpr-web SA: roles/run.invoker     │
              │   - SA: mlpr-agent@<PROJECT>           │
              │   - FastAPI + Python ADK + Vertex      │
              └─────┬──────────────┬──────────────┬────┘
                    │              │              │
            ┌───────▼──────┐ ┌────▼────┐ ┌──────▼──────┐
            │ Vertex AI    │ │ GCS     │ │ Firestore   │
            │ Gemini Flash │ │ Storage │ │ (本番)       │
            │ Imagen 4     │ │ bucket  │ │ furusato +   │
            └──────────────┘ └─────────┘ │ savedRecipes │
                                          └──────────────┘
                                                ▲
                                                │ Web SDK (browser)
                                  ┌─────────────┴────────────┐
                                  │ Firebase Auth (Google)   │
                                  │ Firebase Hosting なし    │
                                  └──────────────────────────┘
                                                ▲
                                                │ Admin SDK
                                  ┌─────────────┴────────────┐
                                  │ refresh script (手動)    │
                                  │ Secret Manager → 楽天 API│
                                  └──────────────────────────┘
```

### 2.2 IAM の境界

```
┌───────────────────────────────────────────────────────────────┐
│ mlpr-web@<PROJECT>.iam.gserviceaccount.com                     │
│   ├─ roles/run.invoker         on  mlpr-agent (service-level)  │
│   ├─ roles/cloudtrace.agent    on  project                     │
│   └─ roles/logging.logWriter   on  project                     │
└───────────────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────────────┐
│ mlpr-agent@<PROJECT>.iam.gserviceaccount.com                   │
│   ├─ roles/aiplatform.user            on  project              │
│   ├─ roles/datastore.user             on  project              │
│   ├─ roles/storage.objectAdmin        on  ${PROJECT}-pizza-images │
│   ├─ roles/secretmanager.secretAccessor on  secrets/rakuten-*  │
│   ├─ roles/cloudtrace.agent           on  project              │
│   └─ roles/logging.logWriter          on  project              │
└───────────────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────────────┐
│ mlpr-deployer@<PROJECT>.iam.gserviceaccount.com                │
│   ├─ roles/run.admin                  on  project              │
│   ├─ roles/cloudbuild.builds.editor   on  project              │
│   ├─ roles/artifactregistry.writer    on  AR repository        │
│   ├─ roles/iam.serviceAccountUser     on  mlpr-web / mlpr-agent│
│   └─ roles/secretmanager.secretAccessor on  secrets/rakuten-*  │
│   (※ Workload Identity Federation で GitHub Actions が         │
│      この SA を impersonate)                                    │
└───────────────────────────────────────────────────────────────┘
```

---

## 3. ディレクトリ構成 (新規)

```
.
├── agent/
│   ├── Dockerfile                          ← NEW (Python 3.12 + uv + uvicorn)
│   └── .dockerignore                       ← NEW
├── infra/                                  ← NEW
│   ├── README.md
│   ├── terraform/
│   │   ├── backend.tf                      ← GCS backend (gs://<PROJECT>-tfstate)
│   │   ├── providers.tf                    ← google + google-beta
│   │   ├── variables.tf                    ← project_id / region / github_repository 等
│   │   ├── terraform.tfvars.example
│   │   ├── main.tf                         ← locals + IAM SA 定義
│   │   ├── artifact_registry.tf            ← Docker repo
│   │   ├── storage.tf                      ← pizza-images bucket
│   │   ├── secret_manager.tf               ← rakuten-application-id / -access-key / -affiliate-id
│   │   ├── cloud_run_web.tf                ← mlpr-web service
│   │   ├── cloud_run_agent.tf              ← mlpr-agent service (internal)
│   │   ├── workload_identity.tf            ← GitHub OIDC pool + provider
│   │   ├── outputs.tf                      ← web_url / agent_url / deployer_sa_email
│   │   └── modules/                        ← 再利用は最小限、Slice 6 ではほぼフラット
│   └── cloudbuild/
│       ├── deploy-web.yaml                 ← mlpr-web の build + deploy
│       └── deploy-agent.yaml               ← mlpr-agent の build + deploy
├── .github/workflows/
│   ├── ci.yml                              ← 既存 (拡張: terraform fmt -check)
│   └── deploy.yml                          ← NEW (main push → Cloud Build)
├── instrumentation.ts                      ← 既存 (Cloud Trace export を追加)
└── agent/src/makelocal_agent/observability.py ← 既存 (Cloud Logging + Cloud Trace 配線)
```

---

## 4. Web の Dockerfile (既存維持) + production env

既存 `Dockerfile` は Next.js standalone build。`prebuild` (`build:data`) も同梱されるので変更不要。

Cloud Run runtime env (production):

```bash
AGENT_MODE=http
AGENT_BASE_URL=https://mlpr-agent-<HASH>.a.run.app
AGENT_TIMEOUT_MS=60000
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<PROJECT>
NEXT_PUBLIC_FIREBASE_API_KEY=<本番 Web API Key (Firebase Console から)>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<PROJECT>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_APP_ID=<本番 App ID>
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false
NEXT_PUBLIC_FURUSATO_INTEGRATION=on
NEXT_TELEMETRY_DISABLED=1
PORT=8080  # Cloud Run の規約
```

## 5. Agent の Dockerfile (新規) + production env

```dockerfile
# agent/Dockerfile
FROM python:3.12-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

# uv をインストール (公式 image を使ってもよい)
RUN pip install --no-cache-dir uv

# 依存 install (cache 効くよう lock ファイルだけ先に)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# アプリコード
COPY src ./src
COPY data ./data

# uvicorn 起動
ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "uv run uvicorn makelocal_agent.main:app --host 0.0.0.0 --port ${PORT}"]
```

Cloud Run runtime env:

```bash
MLPR_GOOGLE_CLOUD_PROJECT=<PROJECT>
MLPR_VERTEX_AI_LOCATION=asia-northeast1
MLPR_GEMINI_MODEL=gemini-2.5-flash
MLPR_IMAGEN_MODEL=imagen-4.0-generate-001
MLPR_USE_MOCK_LLM=false
MLPR_USE_MOCK_IMAGE=false
MLPR_USE_MOCK_STORAGE=false
MLPR_FIREBASE_STORAGE_BUCKET=<PROJECT>-pizza-images
MLPR_FURUSATO_INTEGRATION=on
MLPR_USE_MOCK_FURUSATO=false
# Secret Manager 経由
RAKUTEN_APPLICATION_ID=<from Secret Manager>
RAKUTEN_ACCESS_KEY=<from Secret Manager>
RAKUTEN_AFFILIATE_ID=<from Secret Manager>
PORT=8080
```

## 6. Web → Agent の認証フロー

### 6.1 設計

```
Web /api/recipes/[id] route handler
  └─ HttpAgentClient (lib/agent/http-client.ts)
      └─ google-auth-library で audience=AGENT_BASE_URL の ID token を取得
      └─ Authorization: Bearer <id_token>
      └─ POST https://mlpr-agent-xxxx.a.run.app/agent/recipes/[id]
```

### 6.2 実装方針

`src/lib/agent/http-client.ts` を改修:

- 既存: 単純 `fetch(url, { method: 'POST', body, headers: { 'content-type': 'application/json' } })`
- 改修: `process.env.NODE_ENV === 'production'` (or 別フラグ) で google-auth-library を使い ID token を取得し Authorization ヘッダを付与
- ローカル dev (Cloud Run 外) では token 不要 → `AGENT_MODE=mock` or `localhost:8001` 直接

依存: `google-auth-library` (npm) を追加 (Node.js)。

### 6.3 Python 側受信

`agent/src/makelocal_agent/main.py` の FastAPI 起動時に、Cloud Run の Eventarc-like な ID token 検証は **自動** (Cloud Run の Invoker IAM チェック)。アプリ側で追加実装は不要。

---

## 7. Secret Manager 設計

### 7.1 シークレット 3 本

- `rakuten-application-id` (UUID 文字列)
- `rakuten-access-key` (`pk_*` 文字列)
- `rakuten-affiliate-id` (任意、空文字でも OK)

各シークレットの 1 つの version を maintain。

### 7.2 Cloud Run への注入

`gcloud run deploy --update-secrets='RAKUTEN_APPLICATION_ID=rakuten-application-id:latest,...'`

または Terraform `google_cloud_run_v2_service.template.containers[0].env` で `value_source.secret_key_ref` で参照。

### 7.3 Terraform IaC での値投入

シークレット **値** は Terraform で管理しない (`terraform.tfvars` に書きたくない)。手順:

1. `terraform apply` で `google_secret_manager_secret` (空シークレット) を作成
2. 手動で `gcloud secrets versions add rakuten-application-id --data-file=-` で値を投入
3. Cloud Run が起動時に `latest` を読む

---

## 8. Workload Identity Federation (WIF) 設計

### 8.1 構成

```
GitHub Actions OIDC token (iss=https://token.actions.githubusercontent.com)
  ↓
google_iam_workload_identity_pool.github_pool
  ↓
google_iam_workload_identity_pool_provider.github_provider
  ↓ (attribute mapping: google.subject=assertion.sub, attribute.repository=assertion.repository)
google_service_account_iam_member: mlpr-deployer に
  principalSet://iam.googleapis.com/.../workload_identity_pool/<pool>/attribute.repository/sugimomoto/MakeLocalPizzaRecipeAgent
  を roles/iam.workloadIdentityUser として bind
```

### 8.2 GitHub Actions 側

```yaml
# .github/workflows/deploy.yml
- uses: google-github-actions/auth@v2
  with:
    workload_identity_provider: projects/<PROJECT_NUM>/locations/global/workloadIdentityPools/<POOL>/providers/<PROVIDER>
    service_account: mlpr-deployer@<PROJECT>.iam.gserviceaccount.com

- uses: google-github-actions/setup-gcloud@v2

- run: gcloud builds submit --config=infra/cloudbuild/deploy-web.yaml
```

### 8.3 移行戦略

- Phase 6.1: 最初は手動で `gcloud auth application-default login` で deploy 動作確認
- Phase 6.2: WIF を Terraform で作成
- Phase 6.3: GitHub Actions に切替

途中で SA 鍵を使う中継は無し (鍵を作らない方針)。

---

## 9. Cloud Build パイプライン設計

### 9.1 `deploy-web.yaml`

```yaml
steps:
  # 1. Web の Docker image を build
  - name: gcr.io/cloud-builders/docker
    args:
      - build
      - -t
      - asia-northeast1-docker.pkg.dev/$PROJECT_ID/mlpr/web:$SHORT_SHA
      - -t
      - asia-northeast1-docker.pkg.dev/$PROJECT_ID/mlpr/web:latest
      - .
  # 2. push
  - name: gcr.io/cloud-builders/docker
    args: [push, --all-tags, asia-northeast1-docker.pkg.dev/$PROJECT_ID/mlpr/web]
  # 3. Cloud Run deploy
  - name: gcr.io/google.com/cloudsdktool/cloud-sdk
    args:
      - gcloud
      - run
      - deploy
      - mlpr-web
      - --image=asia-northeast1-docker.pkg.dev/$PROJECT_ID/mlpr/web:$SHORT_SHA
      - --region=asia-northeast1
      - --service-account=mlpr-web@$PROJECT_ID.iam.gserviceaccount.com
      - --allow-unauthenticated
      - --port=8080
      # 環境変数は terraform で既設定なので --update-env-vars は最小限
      - --update-env-vars=AGENT_BASE_URL=<agent_url>,NEXT_PUBLIC_FIREBASE_PROJECT_ID=$PROJECT_ID,...
options:
  logging: CLOUD_LOGGING_ONLY
timeout: 1200s
```

### 9.2 `deploy-agent.yaml`

ほぼ同じ構造。違いは:
- `--no-allow-unauthenticated`
- `--ingress=internal`
- `--service-account=mlpr-agent@$PROJECT_ID.iam.gserviceaccount.com`
- Secret Manager 注入: `--update-secrets=RAKUTEN_APPLICATION_ID=rakuten-application-id:latest,...`

### 9.3 並列 vs 直列

main push 時に web と agent の両方を deploy する場合、**並列実行** が時間効率良い (GitHub Actions の `matrix` strategy or 2 つの job 分離)。`deploy.yml` は 2 job を `parallel` 構成にする。

---

## 10. 観測性配線

### 10.1 Web (Next.js)

`instrumentation.ts` (既存) を本番だけ Cloud Trace export に切替:

```ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.K_SERVICE) {
    // K_SERVICE は Cloud Run の組込環境変数
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { TraceExporter } = await import('@google-cloud/opentelemetry-cloud-trace-exporter');
    const sdk = new NodeSDK({ traceExporter: new TraceExporter() });
    sdk.start();
  }
}
```

依存: `@opentelemetry/sdk-node` + `@google-cloud/opentelemetry-cloud-trace-exporter`

### 10.2 Python (Agent)

`observability.py` (既存) に Cloud Trace + structured logging を配線:

```python
import logging
import os
import sys

def configure_observability():
    if not os.environ.get("K_SERVICE"):
        return  # ローカル dev では何もしない
    # Cloud Logging: structured JSON を stdout に
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())  # 自前 or python-json-logger
    logging.getLogger().addHandler(handler)
    # Cloud Trace: opentelemetry + auto-instrument
    from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    provider = TracerProvider()
    provider.add_span_processor(BatchSpanProcessor(CloudTraceSpanExporter()))
```

依存: `opentelemetry-exporter-gcp-trace` + (任意で) `python-json-logger`

### 10.3 trace propagation

Web → Agent の HTTP 呼び出しで W3C Trace Context (`traceparent` ヘッダ) を伝播させると、Cloud Trace で親子 span が繋がる。`google-auth-library` の HTTP client に instrumentation を被せる。

---

## 11. Terraform IaC ファイル別の中身

(`infra/terraform/` 配下、姉妹プロジェクトを流用 + 命名調整)

| ファイル | 内容 |
|---|---|
| `providers.tf` | google + google-beta、project / region |
| `backend.tf` | `gcs` backend (bucket=`<PROJECT>-tfstate`) |
| `variables.tf` | `project_id` / `region=asia-northeast1` / `github_repository="sugimomoto/MakeLocalPizzaRecipeAgent"` 等 |
| `main.tf` | `locals` で SA 名 / 役割定義、`google_project_service` で必要 API 有効化 (run / cloudbuild / artifactregistry / secretmanager / aiplatform / firestore / iamcredentials / sts) |
| `iam.tf` | 3 SA + role binding |
| `artifact_registry.tf` | `google_artifact_registry_repository` (docker, asia-northeast1) |
| `storage.tf` | `google_storage_bucket` (`${PROJECT}-pizza-images` + tfstate bucket は backend.tf で別管理) |
| `secret_manager.tf` | 3 secret (`rakuten-application-id` 等) + 各 SA への accessor 権限 |
| `cloud_run_web.tf` | `google_cloud_run_v2_service` (mlpr-web)、allUsers invoker、env 設定 |
| `cloud_run_agent.tf` | 同 (mlpr-agent)、`ingress=INGRESS_TRAFFIC_INTERNAL_ONLY`、mlpr-web SA を invoker |
| `workload_identity.tf` | `google_iam_workload_identity_pool` + provider + binding |
| `outputs.tf` | `web_url` / `agent_url` / `deployer_sa_email` を出力 |

### 11.1 Cloud Run の初回 image

Cloud Run service は image を **必須** で要求。初回 `terraform apply` 時点でアプリイメージがまだ無いので、placeholder `us-docker.pkg.dev/cloudrun/container/hello` を使う。Cloud Build 初回成功で本物に上書き。

これで「アプリ実装 → Terraform → Cloud Build → 本物デプロイ」の順序を破綻させない。

---

## 12. Firebase 本番プロジェクト設計

### 12.1 セットアップ手順 (Cloud Console 操作、Terraform 化しない)

1. Firebase Console で **既存 GCP プロジェクトを Firebase 追加** (or 新規)
2. **Authentication** → Google プロバイダ有効化
3. **承認済みドメイン** に Cloud Run URL (`mlpr-web-xxxx.a.run.app`) を追加 (Cloud Run deploy 後)
4. **Firestore** → ネイティブモードで作成 (asia-northeast1)
5. **Storage** → デフォルトバケット (Slice 4 とは別の本番バケット、`<PROJECT>-pizza-images` を使う)

### 12.2 Web 用 API キーの取得

Firebase Console → プロジェクト設定 → Web アプリを登録 → `firebaseConfig` の値を取得:
- `apiKey`
- `authDomain`
- `appId`

これを Cloud Run env (`NEXT_PUBLIC_FIREBASE_*`) に設定。

### 12.3 Rules deploy

Cloud Build の `deploy-web.yaml` に最後の step として追加:

```yaml
- name: gcr.io/firebase-tools/firebase
  args: [deploy, --only=firestore:rules,storage:rules, --project=$PROJECT_ID]
```

Cloud Build SA に `roles/firebaserules.admin` を付与必要。

---

## 13. 本番 furusato refresh

### 13.1 初回手動 refresh (Slice 6)

開発機から:

```bash
export MLPR_GOOGLE_CLOUD_PROJECT=<本番 PROJECT>
# Firestore Emulator host は空にしておく (= 本番 Firestore に向ける)
unset FIRESTORE_EMULATOR_HOST

cd agent
uv run python scripts/refresh_furusato_cache.py --max-items 3
```

- 開発機の egress IP を楽天 API の IP ホワイトリストに登録済の前提 (Slice 5 と同じ)
- `gcloud auth application-default login` でユーザ ADC をセット (or `gcloud iam service-accounts keys create` を使わずに `gcloud auth print-access-token` で OK)

### 13.2 cron 自動化 (Slice 7)

- Cloud Run Jobs に refresh script を deploy
- Cloud Scheduler で週次 trigger
- Cloud NAT で静的 IP を確保 (楽天 IP 登録のため) → Slice 7

---

## 14. 移行・ロールアウト

### 14.1 Phase 別の deploy 状態

| Phase | mlpr-web | mlpr-agent | Firebase | Secret |
|---|---|---|---|---|
| Phase 1 (前提) | (devcontainer) | (devcontainer) | Emulator | .env |
| Phase 2 (Terraform 基盤) | hello placeholder | hello placeholder | 本番 Auth/Firestore 作成 | 空シークレット |
| Phase 3 (deploy) | 本物 web image | hello placeholder | 同上 | 値投入 |
| Phase 4 (auth) | 本物 + ID token 取得 | 本物 agent image | 同上 | 同 |
| Phase 5 (観測) | + Cloud Trace export | + Cloud Trace | 同 | 同 |
| Phase 6 (CI/CD) | main push で自動 | 同 | 同 | 同 |
| Phase 7 (ラップアップ) | 本番 furusato 反映済 | 同 | 同 | 同 |

### 14.2 ロールバック戦略

- Cloud Run のリビジョン履歴で 1-click ロールバック可能
- Terraform state は GCS bucket でバージョニング有効化、`terraform state pull` で過去取得可
- Secret Manager は version 履歴あり、`gcloud secrets versions disable` で前 version に戻せる

---

## 15. 既知のリスクと緩和 (Phase 別)

| Phase | リスク | 緩和 |
|---|---|---|
| 1 | agent Dockerfile が initial build で失敗 | ローカルで `docker build` を回してから push、cache 効かせる |
| 2 | Terraform の API 有効化が時間かかる (5-10 分) | `google_project_service` を `apply` する step を分ける、CI の retry でリカバ |
| 3 | Cloud Run の Vertex AI 呼び出しでクォータ不足 | プロジェクトで `aiplatform.googleapis.com` を確認、Vertex AI dashboard でクォータ確認 |
| 4 | Web → Agent の ID token audience mismatch | `audience` を agent の **正確な URL** (https 含む) に。Cloud Run の自動 URL とドキュメントで両確認 |
| 5 | OTel SDK の version conflict (Next 16 + Node 22) | `instrumentation.ts` で動的 import + try/catch、本番のみ有効化 |
| 6 | GitHub Actions WIF の `attribute mapping` 設定漏れ | 姉妹プロジェクトの設定を流用、Cloud Console の Workload Identity Pools で属性ベース絞込確認 |
| 7 | 本番 furusato refresh で楽天 IP 制限 | 開発機 IP の登録を確認、Cloud NAT 化は Slice 7 で |

---

## 16. 改訂履歴

| 日付 | 版 | 変更内容 |
|---|---|---|
| 2026-05-20 | 1.0 | 初版作成 |
