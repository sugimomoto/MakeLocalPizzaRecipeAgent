# =============================================================================
# Input variables
# =============================================================================

variable "project_id" {
  description = "GCP プロジェクト ID。terraform.tfvars に書く。"
  type        = string
}

variable "region" {
  description = "Cloud Run / Artifact Registry / Storage の region。"
  type        = string
  default     = "asia-northeast1"
}

variable "github_repository" {
  description = "GitHub Actions WIF の attribute.repository (例: sugimomoto/MakeLocalPizzaRecipeAgent)。"
  type        = string
  default     = "sugimomoto/MakeLocalPizzaRecipeAgent"
}

variable "name_prefix" {
  description = "リソース名のプレフィックス (SA / AR / bucket)。"
  type        = string
  default     = "mlpr"
}

# ── Cloud Run scaling ────────────────────────────────────────────────────────
variable "web_min_instances" {
  description = "mlpr-web の min instances。cold start 許容なので 0。"
  type        = number
  default     = 0
}

variable "web_max_instances" {
  description = "mlpr-web の max instances。ハッカソン提出環境なので小さく。"
  type        = number
  default     = 5
}

variable "agent_min_instances" {
  description = "mlpr-agent の min instances。"
  type        = number
  default     = 0
}

variable "agent_max_instances" {
  description = "mlpr-agent の max instances。LLM 呼び出しが重いため少し控えめ。"
  type        = number
  default     = 3
}

# ── 楽天 Secret 名 (Secret Manager に作成する空シークレットの ID) ─────────────
variable "rakuten_secret_keys" {
  description = "Secret Manager に作成する楽天関連 secret の ID リスト。値は手動投入。"
  type        = list(string)
  default = [
    "rakuten-application-id",
    "rakuten-access-key",
    "rakuten-affiliate-id",
  ]
}
