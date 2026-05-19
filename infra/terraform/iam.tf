# =============================================================================
# IAM — 3 つの Service Account とプロジェクトレベルのロール bind
# =============================================================================
# - mlpr-web:      Web (Next.js) Cloud Run の SA。Agent への invoker 権限は
#                  cloud_run_agent.tf で service-level binding として付与。
# - mlpr-agent:    Agent (FastAPI) Cloud Run の SA。Vertex AI / Firestore /
#                  Storage / Secret Manager にアクセス。
# - mlpr-deployer: GitHub Actions / Cloud Build からデプロイする SA。
#                  WIF で principalSet:// 経由で impersonate される。
# =============================================================================

# ── Service Accounts ─────────────────────────────────────────────────────────
resource "google_service_account" "web" {
  account_id   = local.web_sa_id
  display_name = "Cloud Run service account for ${var.name_prefix}-web"
  project      = var.project_id

  depends_on = [google_project_service.required]
}

resource "google_service_account" "agent" {
  account_id   = local.agent_sa_id
  display_name = "Cloud Run service account for ${var.name_prefix}-agent"
  project      = var.project_id

  depends_on = [google_project_service.required]
}

resource "google_service_account" "deployer" {
  account_id   = local.deployer_sa_id
  display_name = "Deployer SA (used by GitHub Actions via WIF)"
  project      = var.project_id

  depends_on = [google_project_service.required]
}

# ── プロジェクトレベルのロール bind ────────────────────────────────────────
# Web SA: 観測性のみ。Firebase は ID トークン (クライアント認証) 経由なので
# 追加権限不要。Agent への invoker は service-level binding で別途付与。
locals {
  web_sa_project_roles = [
    "roles/cloudtrace.agent",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
  ]

  agent_sa_project_roles = [
    "roles/aiplatform.user",   # Vertex Gemini / Imagen
    "roles/datastore.user",    # Firestore (本番 furusato_items 書込、savedRecipes は client SDK 経由)
    "roles/cloudtrace.agent",  # Trace export
    "roles/logging.logWriter", # Cloud Logging
    "roles/monitoring.metricWriter",
  ]

  # Storage / Secret Manager は resource-level binding を使う (`storage.tf` /
  # `secret_manager.tf` で対象を限定して付与) のでここには含めない。
  # → 最小権限原則: 「全 bucket / 全 secret」ではなく特定リソースだけ。

  deployer_sa_project_roles = [
    "roles/run.admin",                # Cloud Run deploy
    "roles/cloudbuild.builds.editor", # Cloud Build trigger
    "roles/artifactregistry.writer",  # AR push
    "roles/iam.serviceAccountUser",   # `mlpr-web` / `mlpr-agent` SA を Cloud Run に attach する権限
    "roles/storage.admin",            # tfstate / artifact 操作
  ]
}

resource "google_project_iam_member" "web_sa" {
  for_each = toset(local.web_sa_project_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.web.email}"
}

resource "google_project_iam_member" "agent_sa" {
  for_each = toset(local.agent_sa_project_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.agent.email}"
}

resource "google_project_iam_member" "deployer_sa" {
  for_each = toset(local.deployer_sa_project_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.deployer.email}"
}
