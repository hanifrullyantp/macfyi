-- Konten landing page (JSON) untuk publik + penyuntingan admin (Supabase Auth, app_metadata.role = 'admin')

create table if not exists public.landing_site_content (
  id text primary key default 'default',
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.landing_site_content (id, content) values ('default', '{}'::jsonb)
on conflict (id) do nothing;

alter table public.landing_site_content enable row level security;

-- Siapa pun yang punya anon key boleh membaca konten terpublikasi (hanya baris default).
create policy "public_read_landing_site_content"
  on public.landing_site_content
  for select
  to anon, authenticated
  using (id = 'default');

-- Hanya pengguna dengan role admin (JWT) yang boleh menulis.
create policy "admin_insert_landing_site_content"
  on public.landing_site_content
  for insert
  to authenticated
  with check (
    id = 'default'
    and coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin'
  );

create policy "admin_update_landing_site_content"
  on public.landing_site_content
  for update
  to authenticated
  using (
    id = 'default'
    and coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin'
  )
  with check (
    id = 'default'
    and coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin'
  );

comment on table public.landing_site_content is 'Konten landing (merge dengan default di app); dibaca publik, ditulis admin Auth.';
