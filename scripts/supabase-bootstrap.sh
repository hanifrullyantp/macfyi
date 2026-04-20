#!/usr/bin/env bash
# Jalankan dari root repo setelah: npm i -g supabase && supabase login && supabase link --project-ref <ref>
# Menyinkronkan schema, mengunggah secret (opsional), dan deploy Edge Functions Macfyi.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SECRETS_FILE="${SUPABASE_SECRETS_FILE:-$ROOT/scripts/env.supabase.secrets}"

echo "==> Macfyi Supabase bootstrap (cwd: $ROOT)"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Instal CLI: npm i -g supabase" >&2
  exit 1
fi

echo "==> supabase db push"
supabase db push

if [[ -f "$SECRETS_FILE" ]]; then
  echo "==> supabase secrets set --env-file $SECRETS_FILE"
  supabase secrets set --env-file "$SECRETS_FILE"
else
  echo "Lewati secret (file tidak ada): $SECRETS_FILE"
  echo "    Salin scripts/env.supabase.secrets.example → scripts/env.supabase.secrets lalu isi nilai."
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
)

for fn in "${FUNCS_NO_JWT[@]}"; do
  if [[ -d "$ROOT/supabase/functions/$fn" ]]; then
    echo "==> deploy $fn"
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
echo "Selesai. Langkah manual yang masih perlu Anda lakukan:"
echo "  • Dashboard Midtrans / Lynk: webhook → https://<project-ref>.supabase.co/functions/v1/payment-webhook"
echo "  • Cron eksternal (GitHub Actions / cron job) POST ke …/scheduled-ops dengan header Authorization: Bearer \$CRON_SECRET"
echo "  • RLS & admin user: lihat docs/SUPABASE_OPERASI_LENGKAP_ID.md dan supabase/README.md"
