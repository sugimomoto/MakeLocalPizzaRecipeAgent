# =============================================================================
# Cloud Storage — 画像公開バケット
# =============================================================================
# Imagen が生成した PNG を put する場所。Web からは <bucket>.storage.googleapis.com
# 経由で直接配信されるので、Cloud Run の egress を食わない。
#
# - uniform_bucket_level_access: true (object-ACL を使わず IAM のみ)
# - public_access_prevention: enforced を **付けない** (公開バケットのため)
# - Lifecycle: 90 日経過した object は削除 (生成物の長期保持はしない)
# =============================================================================

resource "google_storage_bucket" "pizza_images" {
  name     = local.images_bucket_name
  project  = var.project_id
  location = var.region

  uniform_bucket_level_access = true
  force_destroy               = false # 誤 destroy で画像消失を防ぐ

  # 公開バケットだが、`storage.objectViewer` を allUsers に付与する形で
  # 公開する (下記 google_storage_bucket_iam_member)。
  public_access_prevention = "inherited"

  # Imagen 出力は 90 日で削除 (ユーザの savedRecipes には URL のみ保存)
  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }

  # CORS: Web (Cloud Run) からのプリロード等を許容
  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }

  depends_on = [google_project_service.required]
}

# ── 全 object を public read に ────────────────────────────────────────────
# (Imagen 画像は誰でも閲覧可能、SavedRecipe の URL は public link)
resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.pizza_images.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# ── Agent SA に書き込み権限 (resource-level、最小権限) ────────────────────
resource "google_storage_bucket_iam_member" "agent_writer" {
  bucket = google_storage_bucket.pizza_images.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.agent.email}"
}
