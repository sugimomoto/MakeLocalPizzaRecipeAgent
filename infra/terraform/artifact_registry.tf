# =============================================================================
# Artifact Registry — Docker image repository
# =============================================================================
# 1 repo に 2 image (mlpr-web / mlpr-agent) を相乗りさせる。
# tag は image 名側で区別:
#   - asia-northeast1-docker.pkg.dev/${PROJECT}/mlpr/web:<sha>
#   - asia-northeast1-docker.pkg.dev/${PROJECT}/mlpr/agent:<sha>
# =============================================================================

resource "google_artifact_registry_repository" "mlpr" {
  project       = var.project_id
  location      = var.region
  repository_id = local.ar_repo_name
  format        = "DOCKER"
  description   = "Container images for MakeLocalPizzaRecipeAgent (web + agent)"

  # cleanup policy: 直近 10 image / image 名 を保持、それ以前は削除
  # (Cloud Build が高頻度で push する想定で storage コスト抑制)
  cleanup_policies {
    id     = "keep-recent-10"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }

  cleanup_policies {
    id     = "delete-untagged-after-30d"
    action = "DELETE"
    condition {
      tag_state  = "UNTAGGED"
      older_than = "2592000s" # 30 days
    }
  }

  depends_on = [google_project_service.required]
}

# ── resource-level binding ────────────────────────────────────────────────
# Cloud Run service が pull するには reader 権限が必要。
# Web / Agent 両 SA に付与。

resource "google_artifact_registry_repository_iam_member" "web_reader" {
  project    = var.project_id
  location   = google_artifact_registry_repository.mlpr.location
  repository = google_artifact_registry_repository.mlpr.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${google_service_account.web.email}"
}

resource "google_artifact_registry_repository_iam_member" "agent_reader" {
  project    = var.project_id
  location   = google_artifact_registry_repository.mlpr.location
  repository = google_artifact_registry_repository.mlpr.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${google_service_account.agent.email}"
}

# Deployer の writer 権限は iam.tf でプロジェクトレベル付与済
# (artifactregistry.writer)。ここでは追加 binding 不要。
