#!/usr/bin/env bash
# Normalize Supabase project URL (no /rest/v1, no trailing slash).
# Usage: source scripts/lib/supabase-env.sh && normalize_supabase_url "$SUPABASE_URL"
normalize_supabase_url() {
  local raw="${1:-}"
  raw="${raw%/}"
  raw="${raw%/rest/v1}"
  raw="${raw%/}"
  if [[ ! "$raw" =~ ^https://[a-z0-9-]+\.supabase\.co$ ]]; then
    echo "SUPABASE_URL tidak valid: gunakan https://<project-ref>.supabase.co (tanpa /rest/v1)." >&2
    return 1
  fi
  printf '%s' "$raw"
}
