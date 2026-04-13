-- Affiliate, CRM, notifications, events, platform toggles (BATCH 1 foundation)
-- Service role (Edge Functions) bypasses RLS. Admin = app_metadata.role = 'admin'.

create or replace function public.jwt_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin';
$$;

-- ---------------------------------------------------------------------------
-- Platform settings (key-value JSON for all toggles)
-- ---------------------------------------------------------------------------
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (key, value) values
  ('affiliate.auto_approve', 'true'::jsonb),
  ('affiliate.allow_self_referral', 'false'::jsonb),
  ('affiliate.allow_custom_slug', 'true'::jsonb),
  ('affiliate.default_commission_percent', '30'::jsonb),
  ('affiliate.cookie_duration_days', '30'::jsonb),
  ('affiliate.commission_hold_days', '7'::jsonb),
  ('affiliate.auto_confirm_commission', 'true'::jsonb),
  ('affiliate.auto_tier_upgrade', 'true'::jsonb),
  ('withdrawal.auto_approve', 'false'::jsonb),
  ('withdrawal.min_amount_idr', '100000'::jsonb),
  ('withdrawal.max_per_day_idr', '10000000'::jsonb),
  ('withdrawal.fee_type', '"fixed"'::jsonb),
  ('withdrawal.fee_value_idr', '0'::jsonb),
  ('email.sale_to_affiliate', 'true'::jsonb),
  ('email.commission_confirmed_to_affiliate', 'true'::jsonb),
  ('email.withdrawal_processed_to_affiliate', 'true'::jsonb),
  ('email.new_affiliate_to_admin', 'true'::jsonb),
  ('email.withdrawal_request_to_admin', 'true'::jsonb),
  ('email.large_transaction_to_admin', 'true'::jsonb),
  ('email.large_transaction_threshold_idr', '1000000'::jsonb),
  ('leaderboard.show_to_all_members', 'true'::jsonb),
  ('leaderboard.mask_names', 'false'::jsonb),
  ('leaderboard.show_earnings', 'false'::jsonb),
  ('events.auto_join', 'false'::jsonb),
  ('registration.allow_public', 'true'::jsonb),
  ('registration.require_email_verification', 'false'::jsonb),
  ('ui.show_affiliate_menu_to_all', 'true'::jsonb)
on conflict (key) do nothing;

alter table public.platform_settings enable row level security;

create policy "platform_settings_admin_all"
  on public.platform_settings for all
  using (public.jwt_is_admin())
  with check (public.jwt_is_admin());

create policy "platform_settings_authenticated_read"
  on public.platform_settings for select
  to authenticated
  using (true);

create policy "platform_settings_anon_read"
  on public.platform_settings for select
  to anon
  using (true);

-- ---------------------------------------------------------------------------
-- Profiles (1:1 auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_self_select"
  on public.profiles for select
  using (auth.uid() = id or public.jwt_is_admin());

create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = id or public.jwt_is_admin())
  with check (auth.uid() = id or public.jwt_is_admin());

create policy "profiles_admin_insert"
  on public.profiles for insert
  with check (public.jwt_is_admin());

-- Trigger: new auth user → profile
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(coalesce(new.email, 'user'), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profiles on auth.users;
create trigger on_auth_user_created_profiles
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();

-- ---------------------------------------------------------------------------
-- Affiliate tiers
-- ---------------------------------------------------------------------------
create table if not exists public.affiliate_tiers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  min_sales integer not null default 0,
  commission_rate_bps integer not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.affiliate_tiers (code, name, min_sales, commission_rate_bps, sort_order) values
  ('bronze', 'Perunggu', 0, 2500, 1),
  ('silver', 'Perak', 10, 3000, 2),
  ('gold', 'Emas', 50, 3500, 3),
  ('platinum', 'Platinum', 100, 4000, 4)
on conflict (code) do nothing;

alter table public.affiliate_tiers enable row level security;

create policy "affiliate_tiers_public_read"
  on public.affiliate_tiers for select
  using (true);

create policy "affiliate_tiers_admin_write"
  on public.affiliate_tiers for all
  using (public.jwt_is_admin())
  with check (public.jwt_is_admin());

-- ---------------------------------------------------------------------------
-- Affiliates
-- ---------------------------------------------------------------------------
create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  slug text not null unique,
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended', 'rejected')),
  tier_id uuid references public.affiliate_tiers (id),
  commission_rate_bps integer,
  bank jsonb default '{}'::jsonb,
  ewallet jsonb default '{}'::jsonb,
  bio text,
  total_sales integer not null default 0,
  total_commission_idr bigint not null default 0,
  balance_available_idr bigint not null default 0,
  balance_pending_idr bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists affiliates_slug_idx on public.affiliates (slug);
create index if not exists affiliates_status_idx on public.affiliates (status);

alter table public.affiliates enable row level security;

create policy "affiliates_select_own_or_admin"
  on public.affiliates for select
  using (user_id = auth.uid() or public.jwt_is_admin());

create policy "affiliates_insert_own"
  on public.affiliates for insert
  with check (user_id = auth.uid());

create policy "affiliates_update_admin"
  on public.affiliates for update
  using (public.jwt_is_admin())
  with check (public.jwt_is_admin());

create policy "affiliates_delete_admin"
  on public.affiliates for delete
  using (public.jwt_is_admin());

-- ---------------------------------------------------------------------------
-- Referral clicks (analytics)
-- ---------------------------------------------------------------------------
create table if not exists public.referral_clicks (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates (id) on delete cascade,
  visitor_id text not null,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

create index if not exists referral_clicks_affiliate_created_idx
  on public.referral_clicks (affiliate_id, created_at desc);

alter table public.referral_clicks enable row level security;

create policy "referral_clicks_affiliate_own"
  on public.referral_clicks for select
  using (
    public.jwt_is_admin()
    or exists (select 1 from public.affiliates a where a.id = affiliate_id and a.user_id = auth.uid())
  );

create policy "referral_clicks_admin_all"
  on public.referral_clicks for all
  using (public.jwt_is_admin())
  with check (public.jwt_is_admin());

-- ---------------------------------------------------------------------------
-- payment_transactions: affiliate attribution (additive columns)
-- ---------------------------------------------------------------------------
alter table public.payment_transactions
  add column if not exists affiliate_id uuid references public.affiliates (id),
  add column if not exists referral_slug text,
  add column if not exists buyer_user_id uuid references public.profiles (id),
  add column if not exists referral_attribution jsonb default '{}'::jsonb;

create index if not exists payment_transactions_affiliate_idx on public.payment_transactions (affiliate_id);

-- ---------------------------------------------------------------------------
-- Commissions (idempotent per order_id)
-- ---------------------------------------------------------------------------
create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates (id) on delete cascade,
  order_id text not null unique,
  payment_transaction_id uuid references public.payment_transactions (id),
  gross_amount_idr integer not null default 0,
  amount_idr bigint not null,
  rate_bps integer not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'paid', 'cancelled')),
  available_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commissions_affiliate_status_idx on public.commissions (affiliate_id, status);
create index if not exists commissions_created_idx on public.commissions (created_at desc);

alter table public.commissions enable row level security;

create policy "commissions_affiliate_own"
  on public.commissions for select
  using (
    public.jwt_is_admin()
    or exists (select 1 from public.affiliates a where a.id = affiliate_id and a.user_id = auth.uid())
  );

create policy "commissions_admin_all"
  on public.commissions for all
  using (public.jwt_is_admin())
  with check (public.jwt_is_admin());

-- ---------------------------------------------------------------------------
-- Withdrawals
-- ---------------------------------------------------------------------------
create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates (id) on delete cascade,
  amount_idr bigint not null,
  fee_idr bigint not null default 0,
  method text not null check (method in ('bank', 'ewallet')),
  account_details jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed')),
  admin_note text,
  proof_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists withdrawal_affiliate_idx on public.withdrawal_requests (affiliate_id, created_at desc);

alter table public.withdrawal_requests enable row level security;

create policy "withdrawal_affiliate_own"
  on public.withdrawal_requests for select
  using (
    public.jwt_is_admin()
    or exists (select 1 from public.affiliates a where a.id = affiliate_id and a.user_id = auth.uid())
  );

create policy "withdrawal_affiliate_insert"
  on public.withdrawal_requests for insert
  with check (
    exists (select 1 from public.affiliates a where a.id = affiliate_id and a.user_id = auth.uid() and a.status = 'active')
  );

create policy "withdrawal_admin_update"
  on public.withdrawal_requests for update
  using (public.jwt_is_admin())
  with check (public.jwt_is_admin());

-- ---------------------------------------------------------------------------
-- CRM
-- ---------------------------------------------------------------------------
create table if not exists public.crm_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  visitor_id text unique,
  email text,
  user_id uuid references public.profiles (id),
  display_name text,
  stage text not null default 'lead' check (stage in ('lead', 'interested', 'payment_pending', 'paid', 'affiliate_customer')),
  source text default 'direct',
  affiliate_id uuid references public.affiliates (id),
  estimated_value_idr bigint default 0,
  actual_value_idr bigint,
  last_activity_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_contacts_stage_idx on public.crm_contacts (stage);
create index if not exists crm_contacts_email_idx on public.crm_contacts (email);
create index if not exists crm_contacts_visitor_idx on public.crm_contacts (visitor_id);

create table if not exists public.crm_events (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.crm_contacts (id) on delete cascade,
  event_type text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists crm_events_contact_idx on public.crm_events (contact_id, created_at desc);

create table if not exists public.crm_notes (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.crm_contacts (id) on delete cascade,
  author_id uuid,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_contact_tags (
  contact_id uuid not null references public.crm_contacts (id) on delete cascade,
  tag_id uuid not null references public.crm_tags (id) on delete cascade,
  primary key (contact_id, tag_id)
);

alter table public.crm_tags enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.crm_events enable row level security;
alter table public.crm_notes enable row level security;
alter table public.crm_contact_tags enable row level security;

create policy "crm_tags_admin"
  on public.crm_tags for all
  using (public.jwt_is_admin())
  with check (public.jwt_is_admin());

create policy "crm_contacts_admin"
  on public.crm_contacts for all
  using (public.jwt_is_admin())
  with check (public.jwt_is_admin());

create policy "crm_events_admin"
  on public.crm_events for all
  using (public.jwt_is_admin())
  with check (public.jwt_is_admin());

create policy "crm_notes_admin"
  on public.crm_notes for all
  using (public.jwt_is_admin())
  with check (public.jwt_is_admin());

create policy "crm_contact_tags_admin"
  on public.crm_contact_tags for all
  using (public.jwt_is_admin())
  with check (public.jwt_is_admin());

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_own"
  on public.notifications for select
  using (user_id = auth.uid() or public.jwt_is_admin());

create policy "notifications_own_update"
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications_admin_insert"
  on public.notifications for insert
  with check (public.jwt_is_admin());

-- Allow service role inserts from Edge via bypass; authenticated users cannot insert own (server creates)

-- ---------------------------------------------------------------------------
-- Promo events & participants
-- ---------------------------------------------------------------------------
create table if not exists public.promo_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  banner_url text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  event_type text not null default 'sales_contest' check (event_type in ('sales_contest', 'threshold_bonus', 'milestone')),
  rules text,
  prizes jsonb default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'active', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.promo_events (id) on delete cascade,
  affiliate_id uuid not null references public.affiliates (id) on delete cascade,
  sales_count integer not null default 0,
  joined_at timestamptz not null default now(),
  unique (event_id, affiliate_id)
);

create table if not exists public.event_leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.promo_events (id) on delete cascade,
  affiliate_id uuid not null references public.affiliates (id) on delete cascade,
  rank integer not null,
  sales_count integer not null,
  snapshot_at timestamptz not null default now()
);

alter table public.promo_events enable row level security;
alter table public.event_participants enable row level security;
alter table public.event_leaderboard_snapshots enable row level security;

create policy "promo_events_read"
  on public.promo_events for select
  using (status in ('active', 'ended') or public.jwt_is_admin());

create policy "promo_events_admin_write"
  on public.promo_events for all
  using (public.jwt_is_admin())
  with check (public.jwt_is_admin());

create policy "event_participants_read"
  on public.event_participants for select
  using (
    public.jwt_is_admin()
    or exists (select 1 from public.affiliates a where a.id = affiliate_id and a.user_id = auth.uid())
  );

create policy "event_participants_admin"
  on public.event_participants for all
  using (public.jwt_is_admin())
  with check (public.jwt_is_admin());

create policy "event_participants_insert_own"
  on public.event_participants for insert
  with check (
    exists (select 1 from public.affiliates a where a.id = affiliate_id and a.user_id = auth.uid())
  );

create policy "leaderboard_snapshots_read"
  on public.event_leaderboard_snapshots for select
  using (true);

create policy "leaderboard_snapshots_admin"
  on public.event_leaderboard_snapshots for all
  using (public.jwt_is_admin())
  with check (public.jwt_is_admin());

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  type text not null default 'info' check (type in ('info', 'promo', 'event', 'urgent')),
  audience text not null default 'all' check (audience in ('all', 'affiliate', 'buyer')),
  pinned boolean not null default false,
  publish_at timestamptz not null default now(),
  expire_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.announcement_reads (
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

alter table public.announcements enable row level security;
alter table public.announcement_reads enable row level security;

create policy "announcements_read"
  on public.announcements for select
  using (
    (publish_at <= now() and (expire_at is null or expire_at > now()))
    or public.jwt_is_admin()
  );

create policy "announcements_admin"
  on public.announcements for all
  using (public.jwt_is_admin())
  with check (public.jwt_is_admin());

create policy "announcement_reads_own"
  on public.announcement_reads for all
  using (user_id = auth.uid() or public.jwt_is_admin())
  with check (user_id = auth.uid() or public.jwt_is_admin());

-- ---------------------------------------------------------------------------
-- Affiliate referral sales (buyer name only for privacy — no email to affiliate)
-- ---------------------------------------------------------------------------
create table if not exists public.affiliate_referral_sales (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates (id) on delete cascade,
  order_id text not null,
  buyer_display_name text,
  gross_amount_idr integer not null default 0,
  payment_status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (affiliate_id, order_id)
);

create index if not exists affiliate_referral_sales_aff_idx on public.affiliate_referral_sales (affiliate_id, created_at desc);

alter table public.affiliate_referral_sales enable row level security;

create policy "affiliate_referral_sales_own"
  on public.affiliate_referral_sales for select
  using (
    public.jwt_is_admin()
    or exists (select 1 from public.affiliates a where a.id = affiliate_id and a.user_id = auth.uid())
  );

create policy "affiliate_referral_sales_admin"
  on public.affiliate_referral_sales for all
  using (public.jwt_is_admin())
  with check (public.jwt_is_admin());

-- ---------------------------------------------------------------------------
-- Daily stats snapshot (for charts / cron)
-- ---------------------------------------------------------------------------
create table if not exists public.affiliate_daily_stats (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates (id) on delete cascade,
  stat_date date not null,
  clicks integer not null default 0,
  sales integer not null default 0,
  commission_idr bigint not null default 0,
  unique (affiliate_id, stat_date)
);

create table if not exists public.platform_daily_stats (
  id uuid primary key default gen_random_uuid(),
  stat_date date not null unique,
  leads integer not null default 0,
  revenue_idr bigint not null default 0,
  new_affiliates integer not null default 0
);

alter table public.affiliate_daily_stats enable row level security;
alter table public.platform_daily_stats enable row level security;

create policy "affiliate_daily_stats_own"
  on public.affiliate_daily_stats for select
  using (
    public.jwt_is_admin()
    or exists (select 1 from public.affiliates a where a.id = affiliate_id and a.user_id = auth.uid())
  );

create policy "affiliate_daily_stats_admin"
  on public.affiliate_daily_stats for all
  using (public.jwt_is_admin())
  with check (public.jwt_is_admin());

create policy "platform_daily_stats_admin"
  on public.platform_daily_stats for all
  using (public.jwt_is_admin())
  with check (public.jwt_is_admin());

-- Backfill tier_id for existing affiliates (none yet)
update public.affiliates a
set tier_id = t.id
from public.affiliate_tiers t
where a.tier_id is null and t.code = 'bronze';

comment on table public.platform_settings is 'Feature toggles and numeric config; read by Edge Functions and UIs.';
comment on table public.affiliates is 'Affiliate program enrollment; slug used in referral URLs.';
comment on table public.commissions is 'One row per order_id; idempotent commission accrual.';

-- Member-safe update: slug, bank, ewallet, bio only (metrics/status via admin atau service role)
create or replace function public.update_my_affiliate_profile(
  p_slug text default null,
  p_bank jsonb default null,
  p_ewallet jsonb default null,
  p_bio text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  aid uuid;
begin
  select id into aid from public.affiliates where user_id = auth.uid();
  if aid is null then
    raise exception 'affiliate_not_found';
  end if;
  update public.affiliates
  set
    slug = case when p_slug is not null and length(trim(p_slug)) > 0 then trim(lower(p_slug)) else slug end,
    bank = coalesce(p_bank, bank),
    ewallet = coalesce(p_ewallet, ewallet),
    bio = coalesce(p_bio, bio),
    updated_at = now()
  where id = aid;
end;
$$;

grant execute on function public.update_my_affiliate_profile(text, jsonb, jsonb, text) to authenticated;
