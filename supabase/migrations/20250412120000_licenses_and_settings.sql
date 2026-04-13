-- Macfyi: licenses, device activations, and app settings (admin-editable)
-- Run via: supabase db push / supabase migration up

create extension if not exists "pgcrypto";

-- Product / pricing (single row or versioned)
create table if not exists public.app_settings (
  id text primary key default 'default',
  lifetime_price_idr integer not null default 173000,
  product_version text not null default '1.0.0',
  terms_url text,
  privacy_url text,
  crm_webhook_url text,
  email_from_name text,
  download_base_url text,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values ('default')
on conflict (id) do nothing;

-- AI provider keys (encrypted at rest in production — use Vault or encrypt in app layer)
create table if not exists public.ai_provider_secrets (
  id text primary key,
  provider text not null,
  api_key_encrypted text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  license_key_hash text not null unique,
  price_paid_idr integer,
  product_version text,
  status text not null default 'active' check (status in ('active', 'revoked', 'refunded')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists licenses_email_idx on public.licenses (email);

-- One active device per license (lifetime SKU)
create table if not exists public.activations (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses (id) on delete cascade,
  device_fingerprint text not null,
  activated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (license_id)
);

create index if not exists activations_device_idx on public.activations (device_fingerprint);

-- Payment provider events (idempotency)
create table if not exists public.payment_events (
  id text primary key,
  provider text not null,
  payload jsonb not null,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
alter table public.ai_provider_secrets enable row level security;
alter table public.licenses enable row level security;
alter table public.activations enable row level security;
alter table public.payment_events enable row level security;

-- Service role bypasses RLS; Edge Functions use service role.
-- Authenticated admin role (set in Supabase Auth) policies — adjust role name:
-- create policy "admin read licenses" on public.licenses for select using (auth.jwt() ->> 'role' = 'admin');

comment on table public.licenses is 'License rows issued after successful payment; license_key stored hashed only.';
comment on table public.activations is 'At most one row per license_id for single-device lifetime policy.';
