#!/usr/bin/env bash
# DevContainer post-create setup for MakeLocalPizzaRecipeAgent
# This runs once on container creation.
set -euo pipefail

echo "[post-create] fixing ownership of mounted named volumes..."
sudo chown -R node:node \
  /home/node/.config/gcloud \
  /home/node/.local/share/pnpm/store \
  /home/node/.cache/uv

echo "[post-create] enabling corepack + pnpm 10..."
sudo corepack enable
sudo corepack prepare pnpm@10 --activate

echo "[post-create] installing global npm tools..."
npm install -g \
  firebase-tools \
  @anthropic-ai/claude-code

echo "[post-create] installing gitleaks (pre-commit secret scanner)..."
GITLEAKS_VERSION="8.21.0"
ARCH="$(dpkg --print-architecture)"
case "$ARCH" in
  amd64) GITLEAKS_ARCH="x64" ;;
  arm64) GITLEAKS_ARCH="arm64" ;;
  *) echo "Unsupported arch: $ARCH"; exit 1 ;;
esac
curl -sSL "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_${GITLEAKS_ARCH}.tar.gz" \
  | sudo tar -xz -C /usr/local/bin gitleaks
gitleaks version

echo "[post-create] installing lefthook globally (for pre-commit hooks)..."
npm install -g lefthook

echo "[post-create] verifying tool versions..."
node --version
pnpm --version
python3 --version
uv --version
gcloud --version | head -n 1
terraform --version | head -n 1
firebase --version
gh --version | head -n 1
gitleaks version
lefthook version || true

echo "[post-create] done."
echo ""
echo "Next steps:"
echo "  1. Authenticate gcloud:    gcloud auth login --no-launch-browser"
echo "  2. Set ADC:                gcloud auth application-default login --no-launch-browser"
echo "  3. Install project deps:   pnpm install   (after package.json exists in Phase 1)"
echo "  4. Begin Slice 1:          cat .steering/20260513-initial-implementation/tasklist.md"
