# =============================================================================
# main.tf — locals + 必要 API 一括有効化
# =============================================================================
# 個別の resource は責務ごとに別ファイルへ分割:
#   - iam.tf                 : 3 SA + ロール
#   - artifact_registry.tf   : Docker repository
#   - storage.tf             : 画像公開バケット
#   - secret_manager.tf      : 楽天 API キー 3 本
#   - cloud_run_web.tf       : Web service (public)  ← Phase 3
#   - cloud_run_agent.tf     : Agent service (internal) ← Phase 3
#   - workload_identity.tf   : GitHub Actions OIDC ← Phase 6
#   - outputs.tf             : 公開 URL 等
# =============================================================================

locals {
  # SA ID (`<id>@<project>.iam.gserviceaccount.com` の prefix)
  web_sa_id      = "${var.name_prefix}-web"
  agent_sa_id    = "${var.name_prefix}-agent"
  deployer_sa_id = "${var.name_prefix}-deployer"

  # Artifact Registry repository ID
  ar_repo_name = var.name_prefix

  # 公開画像バケット (Imagen の出力 PNG を put する場所)
  images_bucket_name = "${var.project_id}-pizza-images"

  # tfstate バケット (backend.tf で参照、Terraform 管理外だがここでは記録)
  tfstate_bucket_name = "${var.project_id}-tfstate"

  # ── 必要な GCP API ────────────────────────────────────────────────────
  # infra/README.md の `gcloud services enable` と同じセットを
  # Terraform からも宣言。`disable_on_destroy=false` で `terraform destroy`
  # しても API は無効化しない (他リソースに影響するため)。
  required_apis = [
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "aiplatform.googleapis.com",
    "firestore.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "storage.googleapis.com",
    "cloudtrace.googleapis.com",
    "logging.googleapis.com",
    "serviceusage.googleapis.com",
    "iam.googleapis.com",
    "cloudresourcemanager.googleapis.com",
  ]
}

resource "google_project_service" "required" {
  for_each = toset(local.required_apis)

  project = var.project_id
  service = each.value

  disable_on_destroy = false
}
