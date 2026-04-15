-- Non-error product telemetry (admin read)

create table if not exists public.client_telemetry (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  source text not null default 'unknown',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists client_telemetry_created_idx on public.client_telemetry (created_at desc);
create index if not exists client_telemetry_event_idx on public.client_telemetry (event_type);

alter table public.client_telemetry enable row level security;

create policy "client_telemetry_admin_select"
  on public.client_telemetry for select
  using (public.jwt_is_admin());

comment on table public.client_telemetry is 'Privacy-scrubbed usage events from desktop/web (Edge insert, service role).';
