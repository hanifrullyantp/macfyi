-- Public bucket for landing-admin–uploaded brand logos (PNG/JPEG/WebP/SVG).
-- Icons in the built Tauri bundle (src-tauri/icons) remain separate; the app loads this URL at runtime for in-app UI + web favicon.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'macfyi_brand',
  'macfyi_brand',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "macfyi_brand_public_read" on storage.objects;
create policy "macfyi_brand_public_read"
on storage.objects for select
to public
using (bucket_id = 'macfyi_brand');

drop policy if exists "macfyi_brand_admin_insert" on storage.objects;
create policy "macfyi_brand_admin_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'macfyi_brand'
  and coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
);

drop policy if exists "macfyi_brand_admin_update" on storage.objects;
create policy "macfyi_brand_admin_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'macfyi_brand'
  and coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
)
with check (
  bucket_id = 'macfyi_brand'
  and coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
);

drop policy if exists "macfyi_brand_admin_delete" on storage.objects;
create policy "macfyi_brand_admin_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'macfyi_brand'
  and coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin'
);
