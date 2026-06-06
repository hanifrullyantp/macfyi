#!/usr/bin/env bash
# Create public.release_state table via Supabase Management API or CLI db push.
#
# Option A — CLI (all pending migrations):
#   supabase login
#   supabase link --project-ref sgpjracvhokkmjkujabf
#   bash scripts/apply-release-state-migration.sh
#
# Option B — access token only:
#   export SUPABASE_ACCESS_TOKEN='sbp_...'
#   bash scripts/apply-release-state-migration.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_REF="${SUPABASE_PROJECT_REF:-sgpjracvhokkmjkujabf}"
MIGRATIONS=(
  "$ROOT/supabase/migrations/20260505161000_release_state_2_bucket.sql"
  "$ROOT/supabase/migrations/20260606120000_release_state_admin_rls.sql"
)

for MIGRATION in "${MIGRATIONS[@]}"; do
  if [[ ! -f "$MIGRATION" ]]; then
    echo "Migration file not found: $MIGRATION" >&2
    exit 1
  fi
done

if command -v supabase >/dev/null 2>&1 && supabase projects list >/dev/null 2>&1; then
  echo "Applying migrations via supabase db push..."
  cd "$ROOT"
  supabase link --project-ref "$PROJECT_REF" 2>/dev/null || true
  supabase db push
  echo "Done."
  exit 0
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Belum login Supabase CLI dan SUPABASE_ACCESS_TOKEN kosong." >&2
  echo "" >&2
  echo "Pilih salah satu:" >&2
  echo "  1) supabase login && bash $0" >&2
  echo "  2) Dashboard → SQL Editor → jalankan kedua file di supabase/migrations/:" >&2
  echo "     20260505161000_release_state_2_bucket.sql" >&2
  echo "     20260606120000_release_state_admin_rls.sql" >&2
  echo "  3) export SUPABASE_ACCESS_TOKEN=... && bash $0" >&2
  exit 1
fi

for MIGRATION in "${MIGRATIONS[@]}"; do
  echo "Applying $(basename "$MIGRATION")..."
  PAYLOAD="$(node -e 'const fs=require("fs");const q=fs.readFileSync(process.argv[1],"utf8");process.stdout.write(JSON.stringify({query:q}))' "$MIGRATION")"
  HTTP="$(curl -sS -o /tmp/macfyi-migration-out.json -w "%{http_code}" \
    -X POST "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")"
  if [[ "$HTTP" != "200" && "$HTTP" != "201" ]]; then
    echo "Migration failed (HTTP $HTTP): $(basename "$MIGRATION")" >&2
    cat /tmp/macfyi-migration-out.json >&2
    exit 1
  fi
done

echo "release_state migrations applied."
