#!/usr/bin/env bash
# One-shot: migrate release_state, deploy release edge functions, upload/register staging DMG.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
PROJECT_REF="${SUPABASE_PROJECT_REF:-sgpjracvhokkmjkujabf}"

echo "==> 1/4 Apply release_state migrations"
if command -v supabase >/dev/null 2>&1 && supabase projects list >/dev/null 2>&1; then
  supabase link --project-ref "$PROJECT_REF" 2>/dev/null || true
  supabase db push
else
  bash scripts/apply-release-state-migration.sh
fi

echo "==> 2/4 Deploy release edge functions"
if command -v supabase >/dev/null 2>&1 && supabase projects list >/dev/null 2>&1; then
  SKIP_SECRETS=1 bash scripts/supabase-release.sh
else
  echo "Lewati deploy functions (supabase CLI belum login). Jalankan: SKIP_SECRETS=1 bash scripts/supabase-release.sh"
fi

echo "==> 3/4 Trigger GitHub upload (DMG only)"
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  gh workflow run "Upload DMG only (Supabase)" || gh workflow run supabase-dmg-upload-only.yml
else
  echo "Lewati trigger workflow (gh belum login)."
fi

echo "==> 4/4 Selesai"
echo "Buka admin → Releases → macOS Apple Silicon. Jika staging kosong, klik Sinkronkan dari Storage."
