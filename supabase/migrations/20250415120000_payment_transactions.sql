-- Pending / completed payment attempts (Midtrans order_id correlation)
create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,
  email text not null,
  customer_name text,
  phone text,
  gross_amount_idr integer not null,
  status text not null default 'pending',
  provider text not null default 'midtrans',
  midtrans_transaction_id text,
  raw_last_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_transactions_email_idx on public.payment_transactions (email);
create index if not exists payment_transactions_created_idx on public.payment_transactions (created_at desc);

comment on table public.payment_transactions is 'Checkout rows created before Snap; webhook updates status and ties to license issuance.';

alter table public.payment_transactions enable row level security;
