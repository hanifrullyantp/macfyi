create table if not exists public.release_state (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('staging', 'live')),
  version text not null,
  platform text not null,
  storage_path text not null,
  file_size bigint,
  checksum text,
  release_notes text,
  is_mandatory boolean not null default false,
  scheduled_publish_at timestamptz,
  download_count bigint not null default 0,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists release_state_environment_version_idx
  on public.release_state(environment, version);

create index if not exists release_state_environment_platform_created_at_idx
  on public.release_state(environment, platform, created_at desc);

create unique index if not exists release_state_staging_single_platform_idx
  on public.release_state(environment, platform)
  where environment = 'staging';

create or replace function public.increment_release_download_count(
  p_environment text,
  p_platform text,
  p_version text
) returns void
language plpgsql
security definer
as $$
begin
  update public.release_state
  set download_count = coalesce(download_count, 0) + 1
  where id = (
    select id
    from public.release_state
    where environment = p_environment
      and platform = p_platform
      and version = p_version
    order by published_at desc nulls last, created_at desc
    limit 1
  );
end;
$$;
