# =============================================================================
# Workload Identity Federation — GitHub Actions OIDC
# =============================================================================
# 目的:
#   GitHub Actions に **SA 鍵を持たせない**。代わりに OIDC トークンで
#   mlpr-deployer SA を impersonate する。
#
# 利用フロー:
#   1. GitHub Actions ワークフローが github.token (OIDC) を要求 (`id-token: write`)
#   2. google-github-actions/auth@v2 が WIF provider に交換要求
#   3. provider の attribute_condition で `attribute.repository` を検証
#      → sugimomoto/MakeLocalPizzaRecipeAgent からの token のみ通る
#   4. mlpr-deployer の short-lived credential を取得 → gcloud / cloud build
#
# Slice 6 では main branch + PR からの両方を許可 (PR build も走らせるため)。
# 厳密化したい場合は attribute_condition に `attribute.ref == "refs/heads/main"`
# を加える。
# =============================================================================

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "${var.name_prefix}-github-pool"
  display_name              = "GitHub Actions (${var.name_prefix})"
  description               = "OIDC pool for GitHub Actions to impersonate ${local.deployer_sa_id}"

  depends_on = [google_project_service.required]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub OIDC"

  # repository を限定 (他リポジトリからの token は弾く)
  attribute_condition = "assertion.repository == \"${var.github_repository}\""

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
    "attribute.actor"      = "assertion.actor"
    "attribute.event_name" = "assertion.event_name"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# ── deployer SA を、対象 repo の OIDC token で impersonate できるように bind ──
resource "google_service_account_iam_member" "deployer_wif" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"

  # principalSet: 特定 attribute (repository) を持つすべての OIDC token
  member = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}

# ── outputs: GitHub Actions workflow が auth@v2 に渡すパラメータ ──────────
output "workload_identity_provider" {
  description = "GitHub Actions secrets / vars に設定する WIF provider 完全名。"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "workload_identity_pool_name" {
  description = "WIF pool の完全名 (参照用)。"
  value       = google_iam_workload_identity_pool.github.name
}
