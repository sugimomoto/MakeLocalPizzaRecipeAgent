# infra/ — Slice 6 本番デプロイ手順

> Slice 6 では Cloud Run × 2 サービス (`mlpr-web` / `mlpr-agent`) を本番デプロイし、
> Terraform で IaC 化、GitHub Actions + Workload Identity Federation で自動デプロイする。
> 本ドキュメントは **新規開発者が手元から GCP プロジェクトをセットアップして
> Slice 6 を始められる** ことを目的とする。

---

## 0. 全体像

```
┌───────────────────┐    ID Token (Bearer)    ┌──────────────────────┐
│  mlpr-web         │ ───────────────────────▶│  mlpr-agent          │
│  Next.js (public) │                         │  FastAPI (internal)  │
│  asia-northeast1  │                         │  asia-northeast1     │
└─────────┬─────────┘                         └──────┬───────────────┘
          │                                          │
          │ Firebase Web SDK                         │ Vertex AI / Imagen
          ▼                                          │ Firestore / Storage
┌───────────────────┐                                │ Secret Manager
│  Firebase (Auth / │◀───────────────────────────────┘
│  Firestore / GCS) │
└───────────────────┘
```

- **Region**: `asia-northeast1` (東京) で固定
- **Service Account**: 3 つ (`mlpr-web` / `mlpr-agent` / `mlpr-deployer`)
- **Artifact Registry**: `mlpr` (DOCKER format, 1 repo に 2 image)
- **State**: GCS バケット `${PROJECT}-tfstate` (versioning 有効)
- **Secrets**: Secret Manager に楽天 API キー 3 本 (`rakuten-application-id` / `rakuten-access-key` / `rakuten-affiliate-id`)

---

## 1. 前提

| 項目              | 要件                                                                |
| ----------------- | ------------------------------------------------------------------- |
| Google アカウント | プロジェクトのオーナー権限                                          |
| GCP プロジェクト  | 新規 or 既存 (本書では既存 ID を使う)                               |
| 課金              | リンク済 (Cloud Run / Vertex AI / Firestore / Storage は無料枠あり) |
| gcloud CLI        | 本書では `gcloud --version >= 470` 想定                             |
| Terraform         | `>= 1.6`、`terraform fmt -check` / `terraform validate` が通ること  |
| GitHub repo       | `sugimomoto/MakeLocalPizzaRecipeAgent` に admin 権限                |

---

## 2. GCP プロジェクト準備

### 2.1 プロジェクト ID の確認

```bash
# 既存プロジェクトの一覧
gcloud projects list

# 以下のサンプルでは PROJECT_ID=mlpr-prod を使う
export PROJECT_ID=<your-project-id>
gcloud config set project ${PROJECT_ID}
```

### 2.2 必要 API を有効化

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  aiplatform.googleapis.com \
  firestore.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  storage.googleapis.com \
  cloudtrace.googleapis.com \
  logging.googleapis.com \
  serviceusage.googleapis.com \
  iam.googleapis.com \
  cloudresourcemanager.googleapis.com
```

API 有効化は数十秒〜数分かかる。完了確認:

```bash
gcloud services list --enabled --filter="config.name ~ run|aiplatform|firestore"
```

### 2.3 ADC (Application Default Credentials) ログイン

```bash
gcloud auth login
gcloud auth application-default login
```

Terraform は ADC を使うので必須。

---

## 3. Firebase セットアップ (Console 手動)

Firebase は Terraform でも一部管理できるが、Console での操作のほうが安全。

### 3.1 Firebase プロジェクトとして追加

1. https://console.firebase.google.com/ にアクセス
2. 「プロジェクトを追加」→ 既存の GCP プロジェクト `${PROJECT_ID}` を選択
3. Google アナリティクスは **オフ** で OK (Slice 6 では使わない)

### 3.2 Authentication: Google プロバイダ有効化

1. Firebase Console → Authentication → 「始める」
2. Sign-in method → Google を有効化
3. プロジェクトのサポートメールを設定 (自分の Google アカウント)
4. 承認済みドメイン: Cloud Run の URL は Slice 6 デプロイ後に追加 (例: `mlpr-web-xxxxxxxxxx-an.a.run.app`)

### 3.3 Firestore: ネイティブモード作成

1. Firebase Console → Firestore Database → 「データベースを作成」
2. **ネイティブモード** を選択
3. ロケーション: **`asia-northeast1`** (東京、Cloud Run と同じ region)
4. 本番モード (locked) で開始 → ルールは後で `firestore.rules` を deploy

### 3.4 Storage: デフォルトバケット

1. Firebase Console → Storage → 「始める」
2. **本番モード** で開始
3. ロケーション: **`asia-northeast1`**
4. デフォルトバケット名は `${PROJECT_ID}.appspot.com` (Firebase 標準命名)

### 3.5 Web アプリ追加 + 設定値取得

1. Firebase Console → ⚙ → プロジェクト設定 → 全般タブ
2. 「アプリを追加」→ Web → ニックネーム `mlpr-web`
3. Firebase SDK の設定値が表示されるので控える:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `appId`

これらは Slice 6 デプロイ時に `NEXT_PUBLIC_FIREBASE_*` env として Cloud Run の Web service に渡す。

### 3.6 Firestore Rules + Storage Rules を deploy

ローカルの `firestore.rules` / `storage.rules` を本番に反映:

```bash
# firebase-tools が必要 (npm i -g firebase-tools)
firebase login
firebase use ${PROJECT_ID}
firebase deploy --only firestore:rules,storage:rules
```

---

## 4. tfstate バケットの手動作成

Terraform の state を GCS に保存する。**Terraform 自身では作れないため (chicken & egg)、`gsutil` で先に作る。**

```bash
gsutil mb -l asia-northeast1 -p ${PROJECT_ID} gs://${PROJECT_ID}-tfstate
gsutil versioning set on gs://${PROJECT_ID}-tfstate
```

---

## 5. Terraform 実行

### 5.1 tfvars 作成

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を編集:
#   project_id        = "${PROJECT_ID}"
#   github_repository = "sugimomoto/MakeLocalPizzaRecipeAgent"
```

### 5.2 初回 apply

```bash
terraform init   # backend (GCS) に接続
terraform plan
terraform apply
```

apply 完了で以下が作成される:

- 3 つの Service Account (`mlpr-web` / `mlpr-agent` / `mlpr-deployer`)
- Artifact Registry リポジトリ `mlpr` (DOCKER)
- Storage Bucket `${PROJECT_ID}-pizza-images` (画像公開用)
- Secret Manager 3 シークレット (値はまだ空)
- Cloud Run service `mlpr-web` / `mlpr-agent` (初期は placeholder image)
- Workload Identity Pool + Provider (GitHub Actions 用)

---

## 6. 楽天 API キーを Secret Manager に投入

Terraform は **シークレットの「箱」だけ** を作る。値は手動で投入する (誤って commit しないため)。

```bash
# applicationId (UUID 形式)
echo -n "<your-rakuten-application-id-uuid>" | \
  gcloud secrets versions add rakuten-application-id --data-file=-

# accessKey (pk_ プレフィックス、新エンドポイント必須)
echo -n "<your-rakuten-access-key-pk-prefix>" | \
  gcloud secrets versions add rakuten-access-key --data-file=-

# affiliateId (任意、未取得なら空文字)
echo -n "<your-rakuten-affiliate-id-or-empty>" | \
  gcloud secrets versions add rakuten-affiliate-id --data-file=-
```

確認:

```bash
gcloud secrets list
gcloud secrets versions list rakuten-application-id
```

楽天デベロッパー側の **IP 制限** に Cloud Run の egress IP を登録する必要はない。
楽天 API は `mlpr-agent` の **refresh CLI** のみが叩く (= ユーザ手元の `gcloud auth` 経由)、
本番 Cloud Run からは叩かない設計 (3 層分離、Slice 5 で確立)。

---

## 7. 初回 Cloud Build (placeholder → 本物 image に切替)

`terraform apply` 直後は両 service が `hello world` placeholder で動いている。
最初の本物 image push は手動で行う:

```bash
# Web
gcloud builds submit \
  --tag asia-northeast1-docker.pkg.dev/${PROJECT_ID}/mlpr/web:initial \
  .

gcloud run deploy mlpr-web \
  --image=asia-northeast1-docker.pkg.dev/${PROJECT_ID}/mlpr/web:initial \
  --region=asia-northeast1 \
  --platform=managed

# Agent
gcloud builds submit \
  --tag asia-northeast1-docker.pkg.dev/${PROJECT_ID}/mlpr/agent:initial \
  agent/

gcloud run deploy mlpr-agent \
  --image=asia-northeast1-docker.pkg.dev/${PROJECT_ID}/mlpr/agent:initial \
  --region=asia-northeast1 \
  --platform=managed \
  --ingress=internal \
  --no-allow-unauthenticated
```

以降は GitHub Actions で自動デプロイされる (Phase 6 完了後)。

### 7.1 GitHub Actions の自動デプロイを有効化する

`.github/workflows/deploy.yml` は初期状態では `workflow_dispatch` のみ (手動 trigger)。
以下の手順で main push 自動デプロイに切替える:

1. **GitHub repo の Settings → Secrets and variables → Actions → Variables** で 3 つ追加:
   ```
   GCP_PROJECT_ID         = <your-project-id>
   GCP_WIF_PROVIDER       = <terraform output workload_identity_provider の値>
   GCP_DEPLOYER_SA_EMAIL  = <terraform output deployer_sa_email の値>
   ```
2. `.github/workflows/deploy.yml` の以下 2 行のコメントを外す:
   ```yaml
   # push:
   #   branches: [main]
   ```
   → `push: branches: [main]` を有効化。
3. main に push すると `deploy` job が起動し、Web / Agent を並列ビルド + Cloud Run 更新。

### 7.2 手動 trigger でテストしたい

Actions タブ → 「Deploy」 ワークフロー → 「Run workflow」 で手動実行できる。
初回検証や緊急デプロイ時に使う。

---

## 8. 動作確認チェックリスト

Slice 6 完了時は以下が成立:

- [ ] `https://mlpr-web-xxxx-an.a.run.app` で TOP ページが見える
- [ ] 「Google で続ける」で実 Google アカウントでサインインできる
- [ ] /local → /ingredients → /candidates → /recipes → /library のフルジャーニーが動く
- [ ] 詳細レシピでハート → 本番 Firestore に保存される
- [ ] Imagen が本物のピザ画像を生成し、Storage に put される
- [ ] ふるさと納税セクションで本物の楽天返礼品が表示される
- [ ] main push → GitHub Actions → Cloud Build → Cloud Run の自動 deploy が動く
- [ ] Cloud Trace で Web → Agent の親子 span が見える
- [ ] Cloud Logging に JSON structured log が出る

---

## 9. トラブルシュート

| 症状                                                         | 原因 / 対処                                                                                                    |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `terraform apply` で `Permission denied on resource project` | ADC のアカウントにオーナー権限がない → `gcloud auth application-default login` でオーナーアカウントを使う      |
| Cloud Run の `mlpr-web` で 500 (Firebase init error)         | env が反映されてない → `gcloud run services describe mlpr-web` で `NEXT_PUBLIC_FIREBASE_*` を確認              |
| Web → Agent が 403 (Forbidden)                               | `mlpr-web` SA に `roles/run.invoker` on `mlpr-agent` が付いてない → Terraform の IAM binding を確認            |
| Imagen の `permission denied`                                | `mlpr-agent` SA に `roles/aiplatform.user` が付いてない                                                        |
| ふるさと納税が出ない                                         | 本番 Firestore の `furusato_items/` が空 → Phase 7 の手動 refresh (`scripts/refresh_furusato_cache.py`) を実行 |
| `gcloud secrets versions access` で `403`                    | `mlpr-agent` SA に `roles/secretmanager.secretAccessor` を各 secret に bind (Terraform 側で per-secret に付与) |

---

## 10. 参照

- [`requirements.md`](../.steering/20260520-slice6-deploy/requirements.md) — Slice 6 要求
- [`design.md`](../.steering/20260520-slice6-deploy/design.md) — Slice 6 設計
- [`tasklist.md`](../.steering/20260520-slice6-deploy/tasklist.md) — Slice 6 タスクリスト
- [`docs/architecture.md`](../docs/architecture.md) — プロジェクト技術仕様 (Slice 6 で本番構成を反映)
- [Cloud Run pricing](https://cloud.google.com/run/pricing) — 無料枠あり、開発中は低コスト
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation) — SA 鍵レス認証
