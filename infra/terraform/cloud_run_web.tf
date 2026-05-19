# =============================================================================
# Cloud Run service — mlpr-web (Next.js public)
# =============================================================================
# 設計判断:
# - 初回 apply 時点ではアプリ image がまだ無いので、Cloud Run の
#   public placeholder `us-docker.pkg.dev/cloudrun/container/hello` を使う。
#   T-611 で本物 image に手動で切替、以降は Cloud Build (Phase 6) で更新。
# - allUsers を invoker (公開アクセス)
# - AGENT_BASE_URL は cloud_run_agent.uri を参照 (同 state 内で循環しない設計)
# - Firebase 設定値 (NEXT_PUBLIC_FIREBASE_*) は tfvars 経由ではなく
#   `gcloud run services update` で個別に渡す (sensitive ではないが、
#   Firebase Console の値を機械的に複製したくないため)。
#   Terraform 上は ignore_changes で env 変更を許容する。
# =============================================================================

resource "google_cloud_run_v2_service" "web" {
  name     = "${var.name_prefix}-web"
  project  = var.project_id
  location = var.region

  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.web.email

    scaling {
      min_instance_count = var.web_min_instances
      max_instance_count = var.web_max_instances
    }

    containers {
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle = true
      }

      env {
        name  = "AGENT_MODE"
        value = "http"
      }
      env {
        name  = "AGENT_BASE_URL"
        value = google_cloud_run_v2_service.agent.uri
      }
      env {
        name  = "AGENT_TIMEOUT_MS"
        value = "60000"
      }
      env {
        name  = "NEXT_PUBLIC_USE_FIREBASE_EMULATOR"
        value = "false"
      }
      env {
        name  = "NEXT_PUBLIC_FURUSATO_INTEGRATION"
        value = "on"
      }
      env {
        name  = "NEXT_TELEMETRY_DISABLED"
        value = "1"
      }
      # NEXT_PUBLIC_FIREBASE_* (PROJECT_ID / API_KEY / AUTH_DOMAIN / APP_ID) は
      # tfvars に書きたくないため、`gcloud run services update --update-env-vars`
      # で個別に設定する (T-611)。Terraform は env の差分を無視する。
    }
  }

  lifecycle {
    ignore_changes = [
      # 初回以降の image 更新は Cloud Build / gcloud run deploy 側に任せる
      template[0].containers[0].image,
      # NEXT_PUBLIC_FIREBASE_* は手動設定のため、env 差分を無視
      template[0].containers[0].env,
      client,
      client_version,
    ]
  }

  depends_on = [
    google_project_iam_member.web_sa,
    google_artifact_registry_repository_iam_member.web_reader,
  ]
}

# ── allUsers を invoker に (公開アクセス) ────────────────────────────────
resource "google_cloud_run_v2_service_iam_member" "web_public" {
  project  = google_cloud_run_v2_service.web.project
  location = google_cloud_run_v2_service.web.location
  name     = google_cloud_run_v2_service.web.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
