#!/usr/bin/env bash
# Register staging release_state if releases/staging/macfyi-latest.dmg exists in Storage (no local DMG needed).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." >&2
  exit 1
fi

RELEASE_VERSION="${RELEASE_VERSION:-$(node -e 'const c=require("./src-tauri/tauri.conf.json");process.stdout.write(c.version||"0.2.0")')}"
RELEASE_PLATFORM="${RELEASE_PLATFORM:-macos-arm64}"
OBJECT_PATH="staging/macfyi-latest.dmg"
# shellcheck source=scripts/lib/supabase-env.sh
source "$ROOT/scripts/lib/supabase-env.sh"
SUPABASE_URL="$(normalize_supabase_url "$SUPABASE_URL")" || exit 1

HEAD_HTTP="$(curl -sS -o /dev/null -w "%{http_code}" -I \
  "${SUPABASE_URL}/storage/v1/object/releases/${OBJECT_PATH}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")"

if [[ "$HEAD_HTTP" != "200" ]]; then
  echo "DMG not found in Storage (HTTP $HEAD_HTTP)." >&2
  echo "Upload first: GitHub Actions → Upload DMG to Supabase, or npm run tauri:build:dmg && bash scripts/upload-latest-dmg-to-supabase.sh" >&2
  exit 1
fi

FILE_SIZE="$(curl -sS -I "${SUPABASE_URL}/storage/v1/object/releases/${OBJECT_PATH}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" | awk 'tolower($1)=="content-length:"{print $2}' | tr -d '\r')"

curl -sS -X DELETE \
  "${SUPABASE_URL}/rest/v1/release_state?environment=eq.staging&platform=eq.${RELEASE_PLATFORM}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Prefer: return=minimal" >/dev/null

INS_HTTP="$(curl -sS -o /tmp/macfyi-staging-ins.json -w "%{http_code}" -X POST \
  "${SUPABASE_URL}/rest/v1/release_state" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "{\"environment\":\"staging\",\"version\":\"${RELEASE_VERSION}\",\"platform\":\"${RELEASE_PLATFORM}\",\"storage_path\":\"releases/${OBJECT_PATH}\",\"file_size\":${FILE_SIZE:-null}}")"

if [[ "$INS_HTTP" != "201" && "$INS_HTTP" != "200" && "$INS_HTTP" != "204" ]]; then
  echo "Failed to insert release_state HTTP $INS_HTTP" >&2
  cat /tmp/macfyi-staging-ins.json >&2
  exit 1
fi

echo "OK — staging registered: platform=${RELEASE_PLATFORM} version=${RELEASE_VERSION}"
