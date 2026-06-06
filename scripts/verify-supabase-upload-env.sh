#!/usr/bin/env bash
# Validate SUPABASE_URL + service role before DMG upload (CI or local).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=scripts/lib/supabase-env.sh
source "$ROOT/scripts/lib/supabase-env.sh"

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi." >&2
  exit 1
fi

NORMALIZED="$(normalize_supabase_url "$SUPABASE_URL")" || exit 1
export SUPABASE_URL="$NORMALIZED"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo "normalized_url=$NORMALIZED" >> "$GITHUB_OUTPUT"
fi

echo "Supabase URL OK: $NORMALIZED"

# Storage bucket releases must exist
HTTP="$(curl -sS -o /tmp/macfyi-bucket-check.json -w "%{http_code}" \
  "${SUPABASE_URL}/storage/v1/bucket/releases" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")"

if [[ "$HTTP" != "200" ]]; then
  echo "Bucket 'releases' tidak dapat diakses (HTTP $HTTP)." >&2
  echo "Pastikan migration storage releases sudah dijalankan di proyek Supabase." >&2
  cat /tmp/macfyi-bucket-check.json >&2 || true
  exit 1
fi

# release_state table (optional when uploading DMG before migration)
if [[ "${SKIP_RELEASE_STATE_CHECK:-}" != "1" ]]; then
  HTTP2="$(curl -sS -o /tmp/macfyi-rs-check.json -w "%{http_code}" \
    "${SUPABASE_URL}/rest/v1/release_state?select=id&limit=1" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")"

  if [[ "$HTTP2" != "200" ]]; then
    echo "Tabel release_state tidak dapat diakses (HTTP $HTTP2)." >&2
    echo "Jalankan migrasi Supabase (supabase db push / SQL migration)." >&2
    cat /tmp/macfyi-rs-check.json >&2 || true
    exit 1
  fi
else
  echo "SKIP_RELEASE_STATE_CHECK=1 — lewati cek tabel release_state."
fi

echo "Supabase credentials verified."
