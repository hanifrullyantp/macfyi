-- Phase 4: CRM tasks, lead categories, WhatsApp templates

create table if not exists public.crm_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.crm_categories (name, sort_order) values
  ('Tanya fitur', 1),
  ('Storage penuh', 2),
  ('Kendala uninstall', 3),
  ('Kendala bayar', 4),
  ('Lainnya', 99)
on conflict (name) do nothing;

alter table public.crm_contacts add column if not exists category_id uuid references public.crm_categories (id);
alter table public.crm_contacts add column if not exists owner_admin_id uuid;
alter table public.crm_contacts add column if not exists next_follow_up_at timestamptz;
alter table public.crm_contacts add column if not exists last_contacted_at timestamptz;

create table if not exists public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.crm_contacts (id) on delete cascade,
  title text not null,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  assignee_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_tasks_contact_idx on public.crm_tasks (contact_id, due_at);
create index if not exists crm_tasks_due_idx on public.crm_tasks (due_at) where status = 'open';

create table if not exists public.wa_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  body text not null,
  variables text[] not null default array['name','email','device','issue','lastScanGB','plan','checkoutLink']::text[],
  updated_at timestamptz not null default now()
);

insert into public.wa_templates (name, body) values
  (
    'Follow-up demo',
    'Halo {name}, terima kasih sudah coba Macfyi. Kalau ada kendala uninstall atau storage, kabari ya. Cek Pro: {checkoutLink}'
  )
on conflict (name) do nothing;

alter table public.crm_categories enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.wa_templates enable row level security;

create policy "crm_categories_admin"
  on public.crm_categories for all
  using (public.jwt_is_admin())
  with check (public.jwt_is_admin());

create policy "crm_categories_public_read"
  on public.crm_categories for select
  using (true);

create policy "crm_tasks_admin"
  on public.crm_tasks for all
  using (public.jwt_is_admin())
  with check (public.jwt_is_admin());

create policy "wa_templates_admin"
  on public.wa_templates for all
  using (public.jwt_is_admin())
  with check (public.jwt_is_admin());
