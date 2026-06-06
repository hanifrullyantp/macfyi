alter table public.release_state enable row level security;

drop policy if exists "admin_select_release_state" on public.release_state;
create policy "admin_select_release_state" on public.release_state
  for select using (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin');

drop policy if exists "admin_insert_release_state" on public.release_state;
create policy "admin_insert_release_state" on public.release_state
  for insert with check (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin');

drop policy if exists "admin_update_release_state" on public.release_state;
create policy "admin_update_release_state" on public.release_state
  for update using (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin')
  with check (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin');

drop policy if exists "admin_delete_release_state" on public.release_state;
create policy "admin_delete_release_state" on public.release_state
  for delete using (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin');
