# =============================================================================
# Terraform state backend (GCS)
# =============================================================================
# state bucket は terraform 自身では作れない (chicken & egg) ため、
# infra/README.md の手順で gsutil mb で先に作成する。
#
# bucket 名は ${PROJECT_ID}-tfstate に固定 (環境別の workspace は使わない、
# Slice 6 は prod 1 環境のみ)。
#
# 初回 terraform init で:
#   terraform init -backend-config="bucket=${PROJECT_ID}-tfstate"
# とするか、init 時に対話的に bucket 名を入力する。
# =============================================================================

terraform {
  backend "gcs" {
    # bucket は terraform init -backend-config="bucket=..." で渡す。
    # tfvars は backend ブロックには使えない (Terraform の制約) ため。
    prefix = "slice6"
  }
}
