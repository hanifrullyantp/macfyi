#!/usr/bin/env bash
# Admin ops via Supabase CLI (no Dashboard clicking).
# Usage:
#   ./scripts/supabase-admin-cli.sh push
#   ./scripts/supabase-admin-cli.sh secrets              # secrets set dari scripts/env.supabase.secrets
#   ./scripts/supabase-admin-cli.sh release            # db push + secrets (jika ada file) + deploy semua (sama skrip supabase-release.sh)
#   ./scripts/supabase-admin-cli.sh deploy payment-webhook
#   ./scripts/supabase-admin-cli.sh deploy-all
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

cmd="${1:-}"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI not found. Install: npm i -g supabase" >&2
  exit 1
fi

case "$cmd" in
  push)
    supabase db push
    ;;
  secrets)
    SECRETS_FILE="${SUPABASE_SECRETS_FILE:-$ROOT/scripts/env.supabase.secrets}"
    if [[ ! -f "$SECRETS_FILE" ]]; then
      echo "File secret tidak ada: $SECRETS_FILE" >&2
      echo "Salin scripts/env.supabase.secrets.example → scripts/env.supabase.secrets lalu isi nilai." >&2
      exit 1
    fi
    supabase secrets set --env-file "$SECRETS_FILE"
    ;;
  release)
    exec "$ROOT/scripts/supabase-release.sh"
    ;;
  deploy)
    fn="${2:-}"
    if [[ -z "$fn" ]]; then
      echo "Usage: $0 deploy <function-name>" >&2
      exit 1
    fi
    supabase functions deploy "$fn" --no-verify-jwt
    ;;
  deploy-all)
    # Deploy all functions that exist in repo.
    for d in supabase/functions/*; do
      [[ -d "$d" ]] || continue
      name="$(basename "$d")"
      if [[ "$name" == "_shared" || "$name" == "tests" ]]; then
        continue
      fi
      if [[ "$name" == "ai-proxy" ]]; then
        supabase functions deploy "$name"
      else
        supabase functions deploy "$name" --no-verify-jwt
      fi
    done
    ;;
  *)
    echo "Commands:" >&2
    echo "  push                     # supabase db push" >&2
    echo "  secrets                  # supabase secrets set --env-file (SUPABASE_SECRETS_FILE atau scripts/env.supabase.secrets)" >&2
    echo "  release                  # push + secrets (jika ada) + deploy semua function (lihat scripts/supabase-release.sh)" >&2
    echo "  deploy <fn>              # deploy one function" >&2
    echo "  deploy-all               # deploy all functions in supabase/functions" >&2
    exit 1
    ;;
esac

