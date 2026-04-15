-- Phase 6: Redacted client/server error reports (admin-only read via RLS)

create table if not exists public.app_error_reports (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('desktop', 'web', 'edge', 'unknown')),
  severity text not null default 'error' check (severity in ('debug', 'info', 'warning', 'error', 'fatal')),
  message text not null,
  stack_fingerprint text,
  user_or_lead_id text,
  payload jsonb not null default '{}'::jsonb,
  resolved boolean not null default false,
  resolved_at timestamptz,
  resolved_note text,
  created_at timestamptz not null default now()
);

create index if not exists app_error_reports_created_idx on public.app_error_reports (created_at desc);
create index if not exists app_error_reports_resolved_idx on public.app_error_reports (resolved, created_at desc);

alter table public.app_error_reports enable row level security;

create policy "app_error_reports_admin_select"
  on public.app_error_reports for select
  using (public.jwt_is_admin());

create policy "app_error_reports_admin_update"
  on public.app_error_reports for update
  using (public.jwt_is_admin())
  with check (public.jwt_is_admin());

-- Inserts from Edge use service role (bypass RLS). Optional anon insert via Edge only — no direct insert policy.

comment on table public.app_error_reports is 'Privacy-safe diagnostics; no full file paths in payload.';
