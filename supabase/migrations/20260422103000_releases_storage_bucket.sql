-- Public bucket for desktop installers (DMG). CI uploads here; landing reads URL from app_settings.download_base_url.
-- Service role uploads bypass RLS; anon/authenticated users need SELECT for direct HTTPS download.

insert into storage.buckets (id, name, public, file_size_limit)
values ('releases', 'releases', true, 629145600) -- 600 MiB
on conflict (id) do update set
  public = true,
  file_size_limit = 629145600;

drop policy if exists "releases_select_public" on storage.objects;
create policy "releases_select_public"
on storage.objects
for select
to public
using (bucket_id = 'releases');
