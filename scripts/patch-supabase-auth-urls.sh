#!/usr/bin/env bash
# Patch hosted project Auth URL config via Supabase Management API (CLI-friendly).
# Requires: SUPABASE_ACCESS_TOKEN (Dashboard → Account → Access Tokens) with auth_config_write.
#
# Usage:
#   export SUPABASE_ACCESS_TOKEN="sbp_..."
#   ./scripts/patch-supabase-auth-urls.sh
#
# Override defaults:
#   AUTH_SITE_URL=https://yourdomain.com ./scripts/patch-supabase-auth-urls.sh
#   AUTH_URI_ALLOW_LIST='https://yourdomain.com/**,http://localhost:5173/**' ./scripts/patch-supabase-auth-urls.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REF_FILE="$ROOT/supabase/.temp/project-ref"
if [[ ! -f "$REF_FILE" ]]; then
  echo "Missing $REF_FILE — run: cd \"$ROOT\" && supabase link --project-ref <ref>" >&2
  exit 1
fi
REF="$(tr -d '[:space:]' <"$REF_FILE")"
TOKEN="${SUPABASE_ACCESS_TOKEN:?Set SUPABASE_ACCESS_TOKEN (Dashboard → Account → Access Tokens)}"

SITE_URL="${AUTH_SITE_URL:-https://macfyi.com}"
URI_ALLOW_LIST="${AUTH_URI_ALLOW_LIST:-https://macfyi.com/**,https://macfyi.com/admin,https://macfyi.com/admin/**,https://admin.macfyi.com,https://admin.macfyi.com/**,https://www.macfyi.com/**,http://localhost:5173/**,http://127.0.0.1:5173/**,http://localhost:3000/**,http://127.0.0.1:3000/**}"

BODY="$(jq -nc --arg u "$SITE_URL" --arg l "$URI_ALLOW_LIST" '{site_url: $u, uri_allow_list: $l}')"

curl -sS -X PATCH "https://api.supabase.com/v1/projects/${REF}/config/auth" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$BODY" | jq .

echo "OK — site_url=$SITE_URL (redirect allow-list updated). Untuk dev lokal, jalankan dev server dan pastikan origin Anda ada di allow-list."
