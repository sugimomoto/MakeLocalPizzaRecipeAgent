# =============================================================================
# Outputs — terraform apply 後に表示される値
# =============================================================================
# CI/CD (GitHub Actions) や手動 gcloud コマンドで使う値を集約。
# =============================================================================

output "web_url" {
  description = "mlpr-web Cloud Run の公開 URL。ハッカソン提出時に審査員に提示する URL。"
  value       = google_cloud_run_v2_service.web.uri
}

output "agent_url" {
  description = "mlpr-agent Cloud Run の URL (internal-only、Web→Agent でしか叩けない)。"
  value       = google_cloud_run_v2_service.agent.uri
}

output "web_service_name" {
  description = "Web service の Cloud Run service 名 (Cloud Build / gcloud run deploy の対象指定で使う)。"
  value       = google_cloud_run_v2_service.web.name
}

output "agent_service_name" {
  description = "Agent service の Cloud Run service 名。"
  value       = google_cloud_run_v2_service.agent.name
}

output "deployer_sa_email" {
  description = "Deployer SA の email。GitHub Actions WIF が impersonate する対象。"
  value       = google_service_account.deployer.email
}

output "web_sa_email" {
  description = "mlpr-web SA の email。Cloud Run service が起動するための SA。"
  value       = google_service_account.web.email
}

output "agent_sa_email" {
  description = "mlpr-agent SA の email。"
  value       = google_service_account.agent.email
}

output "artifact_registry_url" {
  description = "Docker push 用の base URL (タグは `mlpr/web:<sha>` / `mlpr/agent:<sha>` を付ける)。"
  value       = "${google_artifact_registry_repository.mlpr.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.mlpr.repository_id}"
}

output "images_bucket_name" {
  description = "Imagen 画像公開バケット。Agent 起動時の MLPR_FIREBASE_STORAGE_BUCKET と一致する。"
  value       = google_storage_bucket.pizza_images.name
}

output "rakuten_secret_ids" {
  description = "楽天 API キーを格納する Secret Manager のシークレット ID リスト。値の投入は手動。"
  value       = [for s in google_secret_manager_secret.rakuten : s.secret_id]
}
