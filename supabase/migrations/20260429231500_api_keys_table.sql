create table if not exists platform_api_keys (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  key_value text not null,
  is_active boolean not null default true,
  label text,
  last_tested_at timestamptz,
  last_test_ok boolean,
  daily_limit integer default 1500,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table platform_api_keys enable row level security;

drop policy if exists admin_only_api_keys on platform_api_keys;
create policy admin_only_api_keys
  on platform_api_keys
  for all
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists platform_api_keys_updated_at on platform_api_keys;
create trigger platform_api_keys_updated_at
before update on platform_api_keys
for each row
execute function update_updated_at();

insert into platform_api_keys
  (provider, key_value, label, daily_limit, notes, is_active)
values
  ('gemini', 'BELUM_DIISI', 'Google Gemini 2.0 Flash', 1500, 'Gratis 1500 req/hari. Dapatkan di: aistudio.google.com/apikey', false),
  ('groq', 'BELUM_DIISI', 'Groq Llama 3.1 8B (Fallback)', 14400, 'Gratis 14400 req/hari. Dapatkan di: console.groq.com', false)
on conflict (provider) do nothing;
