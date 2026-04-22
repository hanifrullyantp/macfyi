#!/usr/bin/env bash
# Upload the newest .dmg from a local Tauri build to Supabase Storage (bucket: releases).
# Does not commit binaries to git. Requires env:
#   SUPABASE_URL                 e.g. https://xxxx.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY    service_role JWT
# Optional:
#   UPDATE_APP_SETTINGS=true     PATCH app_settings.download_base_url + bump config_version
#
# Usage (from repo root, after npm run tauri:build:dmg):
#   export SUPABASE_URL=...
#   export SUPABASE_SERVICE_ROLE_KEY=...
#   UPDATE_APP_SETTINGS=true ./scripts/upload-latest-dmg-to-supabase.sh

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Dashboard → Settings → API)." >&2
  exit 1
fi

SUPABASE_URL="${SUPABASE_URL%/}"

shopt -s nullglob
DMGS=(src-tauri/target/release/bundle/dmg/*.dmg)
if [[ ${#DMGS[@]} -eq 0 ]]; then
  DMGS=(src-tauri/target/release/bundle/macos/*.dmg)
fi
if [[ ${#DMGS[@]} -eq 0 ]]; then
  echo "No .dmg found. Run from repo root: npm run tauri:build:dmg" >&2
  exit 1
fi

# Newest modification time
DMG="$(ls -t "${DMGS[@]}" | head -1)"
echo "Uploading: $DMG"

BUCKET="releases"
OBJECT_PATH="macfyi-latest.dmg"
PUBLIC_URL="${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${OBJECT_PATH}"

TMP_OUT="$(mktemp)"
HTTP_CODE="$(curl -sS -o "$TMP_OUT" -w "%{http_code}" -X POST \
  "${SUPABASE_URL}/storage/v1/object/${BUCKET}/${OBJECT_PATH}?upsert=true" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/x-apple-diskimage" \
  --data-binary "@${DMG}")"

if [[ "$HTTP_CODE" != "200" && "$HTTP_CODE" != "201" ]]; then
  echo "Upload failed HTTP $HTTP_CODE" >&2
  cat "$TMP_OUT" >&2
  rm -f "$TMP_OUT"
  exit 1
fi
rm -f "$TMP_OUT"

echo "OK — public URL: $PUBLIC_URL"

if [[ "${UPDATE_APP_SETTINGS:-}" == "true" || "${UPDATE_APP_SETTINGS:-}" == "1" ]]; then
  VER="$(date +%s)"
  PATCH_OUT="$(mktemp)"
  HTTP_PATCH="$(curl -sS -o "$PATCH_OUT" -w "%{http_code}" -X PATCH \
    "${SUPABASE_URL}/rest/v1/app_settings?id=eq.default" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "{\"download_base_url\": \"${PUBLIC_URL}\", \"config_version\": ${VER}}")"
  if [[ "$HTTP_PATCH" != "204" && "$HTTP_PATCH" != "200" ]]; then
    echo "PATCH app_settings failed HTTP $HTTP_PATCH" >&2
    cat "$PATCH_OUT" >&2
    rm -f "$PATCH_OUT"
    exit 1
  fi
  rm -f "$PATCH_OUT"
  echo "Updated app_settings.download_base_url and config_version=${VER}"
fi
