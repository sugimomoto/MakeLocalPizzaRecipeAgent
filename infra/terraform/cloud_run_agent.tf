# =============================================================================
# Cloud Run service — mlpr-agent (Python FastAPI)
# =============================================================================
# 設計判断:
# - `ingress = INGRESS_TRAFFIC_ALL` を採用するが、**認証で守る**:
#   `--no-allow-unauthenticated` + mlpr-web SA のみが invoker。
#   (`INTERNAL_ONLY` だと Cloud Run service-to-service が VPC connector 無しで
#   到達できず、外部 Internet 経由扱いになって 404 拒否される。
#   VPC connector を入れる選択肢もあるが、Slice 6 ではコストとセットアップ
#   工数を避け、IAM 認証で同等のセキュリティを担保する。)
# - mlpr-web SA だけを invoker にする (allUsers 不可)
# - Secret Manager の値を env として注入 (`value_source.secret_key_ref`)
# - placeholder image で初回 apply、T-612 で本物 image に切替
# - lifecycle.ignore_changes で image 差分を Terraform 管理外に
# =============================================================================

resource "google_cloud_run_v2_service" "agent" {
  name     = "${var.name_prefix}-agent"
  project  = var.project_id
  location = var.region

  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.agent.email

    scaling {
      min_instance_count = var.agent_min_instances
      max_instance_count = var.agent_max_instances
    }

    containers {
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
        cpu_idle = true
      }

      # ── 通常 env ──────────────────────────────────────────────────────
      env {
        name  = "MLPR_GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "MLPR_VERTEX_AI_LOCATION"
        value = var.region
      }
      env {
        name  = "MLPR_GEMINI_MODEL"
        value = "gemini-2.5-flash"
      }
      env {
        name  = "MLPR_IMAGEN_MODEL"
        value = "imagen-4.0-generate-001"
      }
      env {
        name  = "MLPR_USE_MOCK_LLM"
        value = "false"
      }
      env {
        name  = "MLPR_USE_MOCK_IMAGE"
        value = "false"
      }
      env {
        name  = "MLPR_USE_MOCK_STORAGE"
        value = "false"
      }
      env {
        name  = "MLPR_FIREBASE_STORAGE_BUCKET"
        value = google_storage_bucket.pizza_images.name
      }
      env {
        name  = "MLPR_FURUSATO_INTEGRATION"
        value = "on"
      }
      env {
        name  = "MLPR_USE_MOCK_FURUSATO"
        value = "false"
      }

      # ── Secret Manager 経由の env ─────────────────────────────────────
      # 楽天 API キー 3 本。値は Secret Manager に手動投入されている前提。
      env {
        name = "RAKUTEN_APPLICATION_ID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.rakuten["rakuten-application-id"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "RAKUTEN_ACCESS_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.rakuten["rakuten-access-key"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "RAKUTEN_AFFILIATE_ID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.rakuten["rakuten-affiliate-id"].secret_id
            version = "latest"
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version,
    ]
  }

  depends_on = [
    google_project_iam_member.agent_sa,
    google_artifact_registry_repository_iam_member.agent_reader,
    google_storage_bucket_iam_member.agent_writer,
    google_secret_manager_secret_iam_member.agent_accessor,
  ]
}

# ── invoker は mlpr-web SA のみ (公開アクセス禁止) ────────────────────────
resource "google_cloud_run_v2_service_iam_member" "agent_web_invoker" {
  project  = google_cloud_run_v2_service.agent.project
  location = google_cloud_run_v2_service.agent.location
  name     = google_cloud_run_v2_service.agent.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.web.email}"
}
