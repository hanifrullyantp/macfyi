create table if not exists public.app_versions (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  version text not null,
  build_number integer,
  release_notes text,
  download_url text not null,
  is_mandatory boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists app_versions_platform_version_idx
  on public.app_versions (platform, version);
