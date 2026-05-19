# =============================================================================
# Secret Manager — 楽天 API キー 3 本
# =============================================================================
# Terraform は **シークレットの「箱」だけ** を作る。値の投入は手動で:
#   echo -n "<value>" | gcloud secrets versions add <secret-id> --data-file=-
#
# 理由:
# - tfvars に値を入れると state に平文で残る (誤共有リスク)
# - rotate は人手で運用する想定 (頻度低)
#
# Slice 5 までは agent/.env に直書きだったキーを Slice 6 で集中管理。
# =============================================================================

resource "google_secret_manager_secret" "rakuten" {
  for_each = toset(var.rakuten_secret_keys)

  project   = var.project_id
  secret_id = each.value

  replication {
    auto {}
  }

  depends_on = [google_project_service.required]
}

# ── Agent SA への accessor 権限 (per-secret、最小権限) ────────────────────
resource "google_secret_manager_secret_iam_member" "agent_accessor" {
  for_each = google_secret_manager_secret.rakuten

  project   = each.value.project
  secret_id = each.value.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.agent.email}"
}
