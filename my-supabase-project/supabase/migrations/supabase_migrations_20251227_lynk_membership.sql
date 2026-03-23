-- Migration for Monefyi Lynk webhook membership system

-- 1) User plans table
create table if not exists public.user_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_type text not null default 'none', -- 'monthly' | 'lifetime' | 'none'
  expires_at timestamptz,
  updated_at timestamptz default now()
);

-- Ensure valid values (optional)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_plans_plan_type_check'
  ) then
    alter table public.user_plans
      add constraint user_plans_plan_type_check
      check (plan_type in ('none','monthly','lifetime'));
  end if;
end$$;

-- RLS (recommended)
alter table public.user_plans enable row level security;

-- Users can read their own plan
DO $$
begin
  if not exists (select 1 from pg_policies where policyname = 'user_plans_select_own') then
    create policy user_plans_select_own
    on public.user_plans
    for select
    to authenticated
    using (auth.uid() = user_id);
  end if;
end$$;

-- No direct insert/update/delete by users (webhook/admin only)
-- (Do not create insert/update policies for authenticated)

-- 2) Webhook idempotency log
create table if not exists public.lynk_webhook_events (
  id uuid primary key default gen_random_uuid(),
  message_id text,
  ref_id text,
  email text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- Unique constraints for idempotency
create unique index if not exists lynk_webhook_events_message_id_uniq
  on public.lynk_webhook_events (message_id)
  where message_id is not null;

create unique index if not exists lynk_webhook_events_ref_id_uniq
  on public.lynk_webhook_events (ref_id)
  where ref_id is not null;

-- 3) Optional fallback orders table if your existing `orders` schema differs
-- You can keep this table and have the webhook insert into it.
create table if not exists public.lynk_orders (
  id uuid primary key default gen_random_uuid(),
  ref_id text,
  email text,
  name text,
  phone text,
  item_title text,
  qty int,
  amount bigint,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lynk_orders_ref_id_idx on public.lynk_orders(ref_id);

-- RLS for lynk_orders (admin-only); keep disabled for public app access
alter table public.lynk_orders enable row level security;

-- Note: do NOT add authenticated policies here unless you want users to see their orders.
