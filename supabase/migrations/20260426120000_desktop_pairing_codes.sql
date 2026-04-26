-- Short-lived codes to link Supabase web login with the desktop app (paste in app).

create table if not exists public.desktop_pairing_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  code text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint desktop_pairing_codes_code_key unique (code)
);

create index if not exists desktop_pairing_codes_pending_idx
  on public.desktop_pairing_codes (code)
  where consumed_at is null;

create index if not exists desktop_pairing_codes_user_idx on public.desktop_pairing_codes (user_id);

alter table public.desktop_pairing_codes enable row level security;

-- Block direct API access; Edge Functions use service role. Admin dashboard may read for support.
create policy "admin_select_desktop_pairing_codes" on public.desktop_pairing_codes
  for select using (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin');

comment on table public.desktop_pairing_codes is 'One-time pairing codes after web login; exchanged with device_fingerprint in Edge.';

-- Allow admin to clear a stuck activation (new Mac) from dashboard.
create policy "admin_delete_activations" on public.activations
  for delete using (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin');
