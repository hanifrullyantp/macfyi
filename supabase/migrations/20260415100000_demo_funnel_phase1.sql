-- Phase 1: Demo tokens + CRM pipeline stages + app_settings / payment link columns

-- ---------------------------------------------------------------------------
-- demo_tokens (hashed at rest; Edge Functions use service role)
-- ---------------------------------------------------------------------------
create table if not exists public.demo_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  contact_id uuid not null references public.crm_contacts (id) on delete cascade,
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists demo_tokens_hash_idx on public.demo_tokens (token_hash);
create index if not exists demo_tokens_contact_idx on public.demo_tokens (contact_id);

alter table public.demo_tokens enable row level security;
-- No policies: deny via PostgREST; service_role bypasses RLS.

comment on table public.demo_tokens is 'Demo install tokens; plain token only returned once from demo-request Edge.';

-- ---------------------------------------------------------------------------
-- crm_contacts: expand pipeline stages + optional phone
-- ---------------------------------------------------------------------------
alter table public.crm_contacts add column if not exists phone text;

alter table public.crm_contacts drop constraint if exists crm_contacts_stage_check;

update public.crm_contacts set stage = 'DEMO_REQUESTED' where stage = 'lead';
update public.crm_contacts set stage = 'UPGRADE_INTENT' where stage in ('interested', 'payment_pending');
update public.crm_contacts set stage = 'PAID' where stage = 'paid';

alter table public.crm_contacts add constraint crm_contacts_stage_check check (
  stage in (
    'DEMO_REQUESTED',
    'DOWNLOADED',
    'DEMO_ACTIVATED',
    'SCANNED',
    'UPGRADE_INTENT',
    'PAID',
    'ACTIVATED',
    'ARCHIVED',
    'affiliate_customer'
  )
);

-- ---------------------------------------------------------------------------
-- app_settings: central config version + checkout success base URL
-- ---------------------------------------------------------------------------
alter table public.app_settings add column if not exists config_version bigint not null default 1;
alter table public.app_settings add column if not exists checkout_success_base_url text;

comment on column public.app_settings.config_version is 'Bump when admin changes pricing/settings; clients refetch public-config.';
comment on column public.app_settings.checkout_success_base_url is 'Origin for Midtrans finish_redirect, e.g. https://your-landing.vercel.app';

-- ---------------------------------------------------------------------------
-- payment_transactions: link to CRM lead when known
-- ---------------------------------------------------------------------------
alter table public.payment_transactions add column if not exists crm_contact_id uuid references public.crm_contacts (id);

create index if not exists payment_transactions_crm_contact_idx on public.payment_transactions (crm_contact_id);

-- Default demo / gating toggles (admin can edit in platform_settings UI)
insert into public.platform_settings (key, value) values
  ('demo.token_ttl_days', '14'::jsonb),
  ('demo.clean_daily_gb_cap', '2'::jsonb),
  ('demo.clean_daily_items_cap', '30'::jsonb),
  ('demo.clean_safe_risk_only', 'true'::jsonb),
  ('demo.uninstall_actions_per_day', '1'::jsonb),
  ('demo.ai_questions_per_day', '10'::jsonb),
  ('ai.global_enabled', 'true'::jsonb),
  ('ai.default_model_id', '"lite-3b-q4"'::jsonb),
  ('ai.max_output_tokens', '512'::jsonb),
  ('marketing.notification_banner_enabled', 'false'::jsonb),
  ('marketing.social_toast_enabled', 'false'::jsonb),
  ('seo.ga4_measurement_id', '""'::jsonb),
  ('seo.facebook_pixel_id', '""'::jsonb)
on conflict (key) do nothing;
