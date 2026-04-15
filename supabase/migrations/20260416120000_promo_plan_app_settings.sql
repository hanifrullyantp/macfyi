-- Promo scheduling: phases JSON + live slot counter + idempotent decrement log

alter table public.app_settings
  add column if not exists promo_plan jsonb,
  add column if not exists promo_slots_remaining integer,
  add column if not exists promo_updated_at timestamptz;

comment on column public.app_settings.promo_plan is 'JSON: { phases: [{ starts_at, ends_at, lifetime_price_idr, compare_at_idr?, slots_initial? }], block_checkout_when_slots_zero? }';
comment on column public.app_settings.promo_slots_remaining is 'Live slots; when set, payment-webhook decrements. When null, UI may show slots_initial from active phase only.';

-- One row per order_id that already decremented promo_slots_remaining (idempotency)
create table if not exists public.promo_slot_decrement_log (
  order_id text primary key,
  created_at timestamptz not null default now()
);

alter table public.promo_slot_decrement_log enable row level security;

-- No policies: only service role (Edge Functions) writes; authenticated users do not access
