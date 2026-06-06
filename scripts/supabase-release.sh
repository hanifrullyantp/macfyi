#!/usr/bin/env bash
# Satu perintah untuk rilis backend Supabase: migrasi DB, secret (opsional), deploy semua Edge Functions.
# Prasyarat: npm i -g supabase && supabase login && supabase link --project-ref <ref>
#
# Usage:
#   ./scripts/supabase-release.sh
#   SKIP_SECRETS=1 ./scripts/supabase-release.sh
#   SUPABASE_SECRETS_FILE=/path/to/env ./scripts/supabase-release.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SECRETS_FILE="${SUPABASE_SECRETS_FILE:-$ROOT/scripts/env.supabase.secrets}"
SKIP_SECRETS="${SKIP_SECRETS:-0}"

echo "==> Macfyi Supabase release (cwd: $ROOT)"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Instal CLI: npm i -g supabase" >&2
  exit 1
fi

echo "==> supabase db push"
supabase db push

if [[ "$SKIP_SECRETS" != "1" && -f "$SECRETS_FILE" ]]; then
  echo "==> supabase secrets set --env-file $SECRETS_FILE"
  supabase secrets set --env-file "$SECRETS_FILE"
elif [[ "$SKIP_SECRETS" == "1" ]]; then
  echo "==> Lewati secrets (SKIP_SECRETS=1)"
else
  echo "==> Lewati secrets (file tidak ada): $SECRETS_FILE"
  echo "    Salin scripts/env.supabase.secrets.example → scripts/env.supabase.secrets lalu isi nilai, atau SKIP_SECRETS=1."
fi

# Urutan bebas; --no-verify-jwt untuk function yang dipanggil publik/anon/webhook.
FUNCS_NO_JWT=(
  public-config
  payment-webhook
  create-midtrans-snap
  create-lynk-checkout
  preview-checkout-price
  activate-license
  demo-request
  demo-download-verify
  demo-verify
  track-event
  client-telemetry
  submit-withdrawal
  admin-withdrawal
  scheduled-ops
  check-update
  release-state
  release-sync-staging
  release-publish
  release-rollback
  release-track-download
  release-train
)

for fn in "${FUNCS_NO_JWT[@]}"; do
  if [[ -d "$ROOT/supabase/functions/$fn" ]]; then
    echo "==> deploy $fn (--no-verify-jwt)"
    supabase functions deploy "$fn" --no-verify-jwt
  else
    echo "Lewati (folder tidak ada): $fn"
  fi
done

if [[ -d "$ROOT/supabase/functions/ai-proxy" ]]; then
  echo "==> deploy ai-proxy (JWT default)"
  supabase functions deploy ai-proxy
fi

echo ""
echo "Selesai. Ingat: webhook Midtrans/Lynk → …/payment-webhook; cron → …/scheduled-ops (Bearer CRON_SECRET)."
