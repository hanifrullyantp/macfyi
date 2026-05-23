#!/usr/bin/env bash
# Upload newest DMG to a stable public object (overwrite each run).
# Required env:
#   SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY
#   RELEASE_VERSION        e.g. 1.4.2
# Optional:
#   RELEASE_PLATFORM       default: macos-arm64
#   UPDATE_APP_SETTINGS    set to "true" to PATCH app_settings.download_base_url + bump config_version

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" || -z "${RELEASE_VERSION:-}" ]]; then
  echo "Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and RELEASE_VERSION." >&2
  exit 1
fi

SUPABASE_URL="${SUPABASE_URL%/}"
RELEASE_PLATFORM="${RELEASE_PLATFORM:-macos-arm64}"

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
# Stable key — matches docs/RELEASE_MACOS.md; landing reads download_base_url from public-config.
OBJECT_PATH="macfyi-latest.dmg"
PUBLIC_URL="${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${OBJECT_PATH}"
FILE_SIZE="$(wc -c < "$DMG" | tr -d '[:space:]')"
CHECKSUM="$(shasum -a 256 "$DMG" | awk '{print $1}')"

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
echo "Checksum: $CHECKSUM"
echo "Size bytes: $FILE_SIZE"

DEL_OUT="$(mktemp)"
DEL_HTTP="$(curl -sS -o "$DEL_OUT" -w "%{http_code}" -X DELETE \
  "${SUPABASE_URL}/rest/v1/release_state?environment=eq.staging&platform=eq.${RELEASE_PLATFORM}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Prefer: return=minimal")"
if [[ "$DEL_HTTP" != "204" && "$DEL_HTTP" != "200" ]]; then
  echo "Failed deleting prior staging row HTTP $DEL_HTTP" >&2
  cat "$DEL_OUT" >&2
  rm -f "$DEL_OUT"
  exit 1
fi
rm -f "$DEL_OUT"

INS_OUT="$(mktemp)"
INS_PAYLOAD="$(mktemp)"
cat > "$INS_PAYLOAD" <<EOF
{
  "environment": "staging",
  "version": "${RELEASE_VERSION}",
  "platform": "${RELEASE_PLATFORM}",
  "storage_path": "releases/${OBJECT_PATH}",
  "file_size": ${FILE_SIZE},
  "checksum": "${CHECKSUM}"
}
EOF
INS_HTTP="$(curl -sS -o "$INS_OUT" -w "%{http_code}" -X POST \
  "${SUPABASE_URL}/rest/v1/release_state" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  --data-binary "@${INS_PAYLOAD}")"
if [[ "$INS_HTTP" != "201" && "$INS_HTTP" != "200" && "$INS_HTTP" != "204" ]]; then
  echo "Failed inserting staging row HTTP $INS_HTTP" >&2
  cat "$INS_OUT" >&2
  rm -f "$INS_OUT" "$INS_PAYLOAD"
  exit 1
fi
rm -f "$INS_OUT" "$INS_PAYLOAD"
echo "Staging row upserted in release_state."

if [[ "${UPDATE_APP_SETTINGS:-}" == "true" ]]; then
  echo "UPDATE_APP_SETTINGS=true — syncing app_settings.download_base_url and bumping config_version."
  CFG_TMP="$(mktemp)"
  CFG_HTTP="$(curl -sS -o "$CFG_TMP" -w "%{http_code}" -G \
    "${SUPABASE_URL}/rest/v1/app_settings" \
    --data-urlencode "id=eq.default" \
    --data-urlencode "select=config_version" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")"
  if [[ "$CFG_HTTP" != "200" ]]; then
    echo "Failed reading app_settings HTTP $CFG_HTTP" >&2
    cat "$CFG_TMP" >&2
    rm -f "$CFG_TMP"
    exit 1
  fi
  NEXT_VER="$(node -e "
    const fs = require('fs');
    const j = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
    const row = Array.isArray(j) ? j[0] : j;
    const v = Number(row?.config_version) || 1;
    process.stdout.write(String(v + 1));
  " "$CFG_TMP")"
  rm -f "$CFG_TMP"

  export PATCH_PUBLIC_URL="$PUBLIC_URL" PATCH_NEXT_VER="$NEXT_VER"
  UPD_TMP="$(mktemp)"
  UPD_BODY="$(node -e "
    process.stdout.write(JSON.stringify({
      download_base_url: process.env.PATCH_PUBLIC_URL,
      config_version: Number(process.env.PATCH_NEXT_VER),
      updated_at: new Date().toISOString(),
    }));
  ")"
  UPD_HTTP="$(curl -sS -o "$UPD_TMP" -w "%{http_code}" -X PATCH \
    "${SUPABASE_URL}/rest/v1/app_settings?id=eq.default" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "$UPD_BODY")"
  unset PATCH_PUBLIC_URL PATCH_NEXT_VER
  if [[ "$UPD_HTTP" != "200" && "$UPD_HTTP" != "204" ]]; then
    echo "Failed PATCH app_settings HTTP $UPD_HTTP" >&2
    cat "$UPD_TMP" >&2
    rm -f "$UPD_TMP"
    exit 1
  fi
  rm -f "$UPD_TMP"
  echo "app_settings.download_base_url -> $PUBLIC_URL (config_version=$NEXT_VER)"
fi
