#!/usr/bin/env bash
# Set GitHub Actions secrets with the correct Supabase URL format.
# Usage:
#   export SUPABASE_SERVICE_ROLE_KEY='eyJ...'
#   bash scripts/setup-github-supabase-secrets.sh
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-sgpjracvhokkmjkujabf}"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI: brew install gh && gh auth login" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Jalankan: gh auth login" >&2
  exit 1
fi

if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "Set SUPABASE_SERVICE_ROLE_KEY (Dashboard → Settings → API → service_role secret)." >&2
  exit 1
fi

echo "Setting SUPABASE_URL=$SUPABASE_URL"
gh secret set SUPABASE_URL --body "$SUPABASE_URL"

echo "Setting SUPABASE_SERVICE_ROLE_KEY (hidden)"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "$SUPABASE_SERVICE_ROLE_KEY"

echo "Done. Trigger workflow: gh workflow run supabase-dmg-upload.yml"
