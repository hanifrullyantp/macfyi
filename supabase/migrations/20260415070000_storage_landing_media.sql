-- Bucket publik untuk gambar landing (URL publik untuk <img src>).
-- Upload hanya user Auth dengan app_metadata.role = 'admin'.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'landing-media',
  'landing-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "landing_media_public_read" on storage.objects;
drop policy if exists "landing_media_admin_insert" on storage.objects;
drop policy if exists "landing_media_admin_update" on storage.objects;
drop policy if exists "landing_media_admin_delete" on storage.objects;

create policy "landing_media_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'landing-media');

create policy "landing_media_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'landing-media'
    and coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin'
  );

create policy "landing_media_admin_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'landing-media'
    and coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin'
  )
  with check (
    bucket_id = 'landing-media'
    and coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin'
  );

create policy "landing_media_admin_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'landing-media'
    and coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin'
  );
