#!/usr/bin/env bash
# Apply release_state migrations via direct PostgreSQL (needs database password).
# Usage:
#   export SUPABASE_DB_PASSWORD='...'
#   bash scripts/apply-release-state-via-pg.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_REF="${SUPABASE_PROJECT_REF:-sgpjracvhokkmjkujabf}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"

if [[ -z "$DB_PASSWORD" ]]; then
  echo "Set SUPABASE_DB_PASSWORD (Dashboard → Project Settings → Database)." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Install psql (brew install libpq && brew link --force libpq)" >&2
  exit 1
fi

# Singapore pooler (project serves via ap-southeast / SIN edge)
DB_URL="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

for f in \
  "$ROOT/supabase/migrations/20260505161000_release_state_2_bucket.sql" \
  "$ROOT/supabase/migrations/20260606120000_release_state_admin_rls.sql"; do
  echo "Applying $(basename "$f")..."
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$f"
done

echo "release_state migrations applied via PostgreSQL."
