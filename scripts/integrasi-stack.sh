#!/usr/bin/env bash
# Jalankan ~99% integrasi Supabase (link, db, secrets, deploy functions, uji curl).
# Opsional: deploy env + production ke Vercel untuk macfyi-landing-page.
#
# Prasyarat: supabase CLI, curl. Untuk --vercel: vercel CLI + sudah `vercel login`.
# Prasyarat: sudah `supabase login` sekali.
#
# Usage:
#   chmod +x scripts/integrasi-stack.sh
#   ./scripts/integrasi-stack.sh path/ke/macfyi-local.env
#   ./scripts/integrasi-stack.sh path/ke/macfyi-local.env --vercel
#   ./scripts/integrasi-stack.sh path/ke/macfyi-local.env --prod-midtrans
#
# Midtrans: kunci sandbox = SB-Mid-server-* / SB-Mid-client-* (API sandbox).
#           kunci production = Mid-server-* / Mid-client-* (API production).
# Skrip mengatur MIDTRANS_IS_PRODUCTION otomatis dari prefix Server Key, kecuali --prod-midtrans memaksa production.
#
# File env wajib berisi (export ...):
#   SUPABASE_URL, SUPABASE_ANON_KEY, PROJECT_REF,
#   MIDTRANS_SERVER_KEY, MIDTRANS_CLIENT_KEY,
#   RESEND_API_KEY, EMAIL_FROM

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

DO_VERCEL=false
DO_PROD_MIDTRANS=false
ENV_FILE=""

for arg in "$@"; do
  case "$arg" in
    --vercel) DO_VERCEL=true ;;
    --prod-midtrans) DO_PROD_MIDTRANS=true ;;
    -*)
      echo "Opsi tidak dikenal: $arg" >&2
      exit 1
      ;;
    *)
      if [[ -f "$arg" ]]; then
        ENV_FILE="$(cd "$(dirname "$arg")" && pwd)/$(basename "$arg")"
      fi
      ;;
  esac
done

if [[ -z "$ENV_FILE" ]]; then
  ENV_FILE="${REPO_ROOT}/macfyi-local.env"
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "File tidak ditemukan: $ENV_FILE" >&2
  echo "Usage: $0 <path/to/macfyi-local.env> [--vercel] [--prod-midtrans]" >&2
  exit 1
fi

if [[ ! -s "$ENV_FILE" ]]; then
  echo "File env kosong di disk: $ENV_FILE" >&2
  echo "Simpan dulu dari editor (Cmd+S / Ctrl+S). Variabel tidak ter-load jika file 0 byte." >&2
  exit 1
fi

echo "==> Memuat: $ENV_FILE"
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

require() {
  local n="$1"
  if [[ -z "${!n:-}" ]]; then
    echo "Variabel wajib kosong: $n (isi di $ENV_FILE)" >&2
    exit 1
  fi
}

require SUPABASE_URL
require SUPABASE_ANON_KEY
require PROJECT_REF
require MIDTRANS_SERVER_KEY
require MIDTRANS_CLIENT_KEY
require RESEND_API_KEY
require EMAIL_FROM

if ! command -v supabase &>/dev/null; then
  echo "Instal: npm install -g supabase" >&2
  exit 1
fi

if ! command -v curl &>/dev/null; then
  echo "curl tidak ditemukan." >&2
  exit 1
fi

echo "==> Cek: PROJECT_REF ada di akun Supabase CLI (supabase projects list)"
if ! PLIST=$(supabase projects list 2>&1); then
  echo "$PLIST" >&2
  echo "Perbaiki jaringan / login: supabase login" >&2
  exit 1
fi
if ! grep -qF "$PROJECT_REF" <<<"$PLIST"; then
  echo "PROJECT_REF \"$PROJECT_REF\" tidak muncul untuk akun Supabase CLI ini." >&2
  echo "Jalankan: supabase projects list   — jika ref Anda tidak ada, login dengan akun pemilik proyek:" >&2
  echo "  supabase logout && supabase login" >&2
  echo "Atau salin ulang SUPABASE_URL, SUPABASE_ANON_KEY, PROJECT_REF dari Dashboard → proyek yang benar." >&2
  exit 1
fi

echo "==> supabase link --project-ref $PROJECT_REF"
supabase link --project-ref "$PROJECT_REF"

echo "==> supabase db push"
supabase db push

# Midtrans: sandbox vs production URL harus cocok dengan jenis kunci (401 jika salah).
if [[ "$DO_PROD_MIDTRANS" == true ]]; then
  MIDTRANS_PROD_FLAG=true
  echo "==> Midtrans: mode PRODUCTION (--prod-midtrans)"
  if [[ "$MIDTRANS_SERVER_KEY" == SB-Mid-server-* ]] || [[ "$MIDTRANS_SERVER_KEY" == SB-Mid-* ]]; then
    echo "Konflik: kunci terlihat SANDBOX (SB-Mid-*) tapi Anda memakai --prod-midtrans." >&2
    echo "Hapus --prod-midtrans untuk sandbox, atau ganti ke kunci Mid-server-* production di $ENV_FILE." >&2
    exit 1
  fi
else
  case "$MIDTRANS_SERVER_KEY" in
    SB-Mid-server-* | SB-Mid-*)
      MIDTRANS_PROD_FLAG=false
      echo "==> Midtrans: kunci sandbox (SB-Mid-*) → MIDTRANS_IS_PRODUCTION=false"
      ;;
    Mid-server-*)
      MIDTRANS_PROD_FLAG=true
      echo "==> Midtrans: kunci production (Mid-server-*) → MIDTRANS_IS_PRODUCTION=true"
      ;;
    *)
      MIDTRANS_PROD_FLAG=false
      echo "Peringatan: MIDTRANS_SERVER_KEY tidak diawali SB-Mid-* atau Mid-server-*." >&2
      echo "  Pakai kunci dari Midtrans Dashboard (Sandbox atau Production) apa adanya; default MIDTRANS_IS_PRODUCTION=false." >&2
      ;;
  esac
fi

echo "==> supabase secrets set (Midtrans, Resend, ...)"
supabase secrets set RESEND_API_KEY="$RESEND_API_KEY"
supabase secrets set EMAIL_FROM="$EMAIL_FROM"
supabase secrets set MIDTRANS_SERVER_KEY="$MIDTRANS_SERVER_KEY"
supabase secrets set MIDTRANS_CLIENT_KEY="$MIDTRANS_CLIENT_KEY"
supabase secrets set MIDTRANS_IS_PRODUCTION="$MIDTRANS_PROD_FLAG"

if [[ -n "${OPS_ALERT_EMAIL:-}" ]]; then
  echo "==> secrets: OPS_ALERT_EMAIL"
  supabase secrets set OPS_ALERT_EMAIL="$OPS_ALERT_EMAIL"
else
  echo "==> Lewati OPS_ALERT_EMAIL (kosong) — email alert penarikan tidak dikirim sampai diisi."
fi

if [[ -n "${CRON_SECRET:-}" ]]; then
  echo "==> secrets: CRON_SECRET"
  supabase secrets set CRON_SECRET="$CRON_SECRET"
else
  echo "==> Lewati CRON_SECRET (kosong) — scheduled-ops tidak bisa dipanggil aman sampai Anda set secret ini."
fi

echo "==> supabase functions deploy"
supabase functions deploy create-midtrans-snap --no-verify-jwt
supabase functions deploy payment-webhook --no-verify-jwt
supabase functions deploy activate-license --no-verify-jwt
supabase functions deploy track-event --no-verify-jwt
supabase functions deploy submit-withdrawal --no-verify-jwt
supabase functions deploy admin-withdrawal --no-verify-jwt
supabase functions deploy scheduled-ops --no-verify-jwt

echo "==> Uji create-midtrans-snap (curl)"
SNAP_OUT="$(mktemp)"
trap 'rm -f "$SNAP_OUT"' EXIT
HTTP_CODE="$(curl -sS -o "$SNAP_OUT" -w "%{http_code}" -X POST \
  "${SUPABASE_URL}/functions/v1/create-midtrans-snap" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","phone":"081234567890"}')"

echo "HTTP $HTTP_CODE"
if [[ "$HTTP_CODE" != "200" ]]; then
  cat "$SNAP_OUT" >&2 || true
  echo >&2
  echo "Gagal: periksa secret Midtrans / log function." >&2
  exit 1
fi
if ! grep -q snap_token "$SNAP_OUT" 2>/dev/null; then
  echo "Respons tidak berisi snap_token:" >&2
  head -c 800 "$SNAP_OUT" >&2
  echo >&2
  exit 1
fi
echo "OK (snap_token ada). Cuplikan:"
head -c 200 "$SNAP_OUT"
echo
trap - EXIT
rm -f "$SNAP_OUT"

if [[ "$DO_VERCEL" == true ]]; then
  if ! command -v vercel &>/dev/null; then
    echo "Instal: npm install -g vercel" >&2
    exit 1
  fi
  LANDING="${REPO_ROOT}/macfyi-landing-page"
  if [[ ! -d "$LANDING" ]]; then
    echo "Folder tidak ada: $LANDING" >&2
    exit 1
  fi
  echo "==> Vercel: pasang env + deploy"
  echo "    (perlu: vercel login sekali + di macfyi-landing-page: vercel link)"
  cd "$LANDING"
  if [[ ! -d .vercel ]]; then
    echo "Jalankan sekali: cd macfyi-landing-page && vercel link" >&2
    exit 1
  fi
  set +e
  printf '%s' "$SUPABASE_URL" | vercel env add VITE_SUPABASE_URL production
  printf '%s' "$SUPABASE_ANON_KEY" | vercel env add VITE_SUPABASE_ANON_KEY production
  set -e
  echo "==> vercel --prod"
  vercel --prod
  cd "$REPO_ROOT"
fi

echo
echo "Selesai. Anda (~1%): set Payment Notification URL di Midtrans ke:"
echo "  https://${PROJECT_REF}.supabase.co/functions/v1/payment-webhook"
