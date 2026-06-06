#!/usr/bin/env bash
# Sign Macfyi .app (and optionally notarize .dmg) after `npm run tauri:build:dmg`.
#
# Without Apple Developer ID: ad-hoc sign (-) so Finder shows the correct app icon.
# Users still open the app via right-click → Open the first time (Gatekeeper).
#
# With secrets (CI or local):
#   APPLE_SIGNING_IDENTITY="Developer ID Application: …"
#   APPLE_ID, APPLE_TEAM_ID, APPLE_APP_SPECIFIC_PASSWORD  → notarize DMG when set
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ "${SKIP_MACOS_SIGN:-}" == "1" ]]; then
  echo "SKIP_MACOS_SIGN=1 — skipping codesign."
  exit 0
fi

shopt -s nullglob
APPS=(src-tauri/target/release/bundle/macos/*.app)
DMGS=(src-tauri/target/release/bundle/dmg/*.dmg)
if [[ ${#APPS[@]} -eq 0 ]]; then
  echo "No .app found under src-tauri/target/release/bundle/macos/" >&2
  exit 1
fi

APP="$(ls -td "${APPS[@]}" | head -1)"
SIGN_ID="${APPLE_SIGNING_IDENTITY:--}"

echo "Signing app: $APP"
if [[ "$SIGN_ID" == "-" ]]; then
  codesign --force --deep --sign - "$APP"
else
  codesign --force --deep --options runtime --timestamp --sign "$SIGN_ID" "$APP"
fi
codesign --verify --deep --strict "$APP"
echo "App signature OK."

if [[ ${#DMGS[@]} -eq 0 ]]; then
  echo "No DMG to sign/notarize."
  exit 0
fi

DMG="$(ls -t "${DMGS[@]}" | head -1)"
echo "DMG: $DMG"

if [[ "$SIGN_ID" != "-" ]]; then
  codesign --force --sign "$SIGN_ID" "$DMG"
  echo "DMG signed."
fi

if [[ -n "${APPLE_ID:-}" && -n "${APPLE_TEAM_ID:-}" && -n "${APPLE_APP_SPECIFIC_PASSWORD:-}" && "$SIGN_ID" != "-" ]]; then
  echo "Submitting DMG for notarization…"
  xcrun notarytool submit "$DMG" \
    --apple-id "$APPLE_ID" \
    --team-id "$APPLE_TEAM_ID" \
    --password "$APPLE_APP_SPECIFIC_PASSWORD" \
    --wait
  xcrun stapler staple "$DMG"
  echo "DMG notarized and stapled."
else
  echo "Skipping notarization (set APPLE_ID, APPLE_TEAM_ID, APPLE_APP_SPECIFIC_PASSWORD + Developer ID to enable)."
fi
