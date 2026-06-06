#!/usr/bin/env bash
# Regenerate src-tauri/icons/* from the official Macfyi square mark.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SOURCE="$ROOT/public/macfyi-mark-square.png"
WORK="$ROOT/src-tauri/icons/macfyi-icon-source.png"

if [[ ! -f "$SOURCE" ]]; then
  echo "Missing brand source: $SOURCE" >&2
  exit 1
fi

mkdir -p "$(dirname "$WORK")"
sips -z 1024 1024 "$SOURCE" --out "$WORK" >/dev/null
echo "Generated 1024×1024 icon source from public/macfyi-mark-square.png"

npm exec tauri -- icon "$WORK"
echo "Tauri bundle icons updated under src-tauri/icons/"
