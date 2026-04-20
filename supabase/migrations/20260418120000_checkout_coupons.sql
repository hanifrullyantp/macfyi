-- Kupon checkout (admin) + jejak di payment_transactions

alter table public.app_settings
  add column if not exists checkout_coupons jsonb not null default '{"coupons":[]}'::jsonb;

comment on column public.app_settings.checkout_coupons is 'Definisi kupon Midtrans (mode fixed_price | percent_off | amount_off_idr, auto_apply, jendela waktu).';

alter table public.payment_transactions add column if not exists coupon_id text;
alter table public.payment_transactions add column if not exists coupon_code text;
alter table public.payment_transactions add column if not exists base_amount_idr integer;
alter table public.payment_transactions add column if not exists discount_idr integer not null default 0;

comment on column public.payment_transactions.base_amount_idr is 'Harga setelah promo, sebelum kupon.';
comment on column public.payment_transactions.discount_idr is 'Potongan dari kupon (0 jika tidak ada).';
