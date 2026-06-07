#!/usr/bin/env bash
# Upload newest DMG to staging object only (2-bucket model).
# Required env:
#   SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY
#   RELEASE_VERSION        e.g. 1.4.2
# Optional:
#   RELEASE_PLATFORM       default: macos-arm64

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# shellcheck source=scripts/lib/supabase-env.sh
source "$ROOT/scripts/lib/supabase-env.sh"
# shellcheck source=scripts/lib/release-platform.sh
source "$ROOT/scripts/lib/release-platform.sh"

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" || -z "${RELEASE_VERSION:-}" ]]; then
  echo "Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and RELEASE_VERSION." >&2
  exit 1
fi

SUPABASE_URL="$(normalize_supabase_url "$SUPABASE_URL")" || exit 1
RELEASE_PLATFORM="${RELEASE_PLATFORM:-macos-arm64}"

shopt -s nullglob
DMGS=()
while IFS= read -r dir; do
  DMGS+=("${dir}"/*.dmg)
done < <(tauri_dmg_search_dirs)
if [[ ${#DMGS[@]} -eq 0 ]]; then
  echo "No .dmg found. Run from repo root: npm run tauri:build:dmg" >&2
  exit 1
fi

# Newest modification time
DMG="$(ls -t "${DMGS[@]}" | head -1)"
echo "Uploading: $DMG"

BUCKET="releases"
OBJECT_PATH="$(staging_object_path "$RELEASE_PLATFORM")"
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

if [[ "${SKIP_RELEASE_STATE_ROW:-}" == "1" ]]; then
  echo "SKIP_RELEASE_STATE_ROW=1 — DMG uploaded; jalankan migrasi lalu register-staging-release."
else
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
fi
