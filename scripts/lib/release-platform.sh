#!/usr/bin/env bash
# Map release platform id → staging storage object + Tauri Rust target.

staging_object_path() {
  case "${1:-macos-arm64}" in
    macos-intel) printf '%s' "staging/macfyi-intel.dmg" ;;
    macos-arm64|*) printf '%s' "staging/macfyi-arm64.dmg" ;;
  esac
}

# Legacy arm64 uploads used staging/macfyi-latest.dmg
staging_object_fallback_path() {
  case "${1:-macos-arm64}" in
    macos-arm64) printf '%s' "staging/macfyi-latest.dmg" ;;
    *) printf '%s' "" ;;
  esac
}

tauri_dmg_search_dirs() {
  local target="${TAURI_TARGET:-}"
  if [[ -n "$target" ]]; then
    printf '%s\n' "src-tauri/target/${target}/release/bundle/dmg" "src-tauri/target/${target}/release/bundle/macos"
  fi
  printf '%s\n' "src-tauri/target/release/bundle/dmg" "src-tauri/target/release/bundle/macos"
}
