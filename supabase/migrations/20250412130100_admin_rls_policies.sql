-- RLS policies for Supabase Auth users with app_metadata.role = 'admin'
-- Set role in Dashboard: Authentication → Users → user → Raw App Meta Data: { "role": "admin" }

create policy "admin_select_licenses" on public.licenses
  for select using (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin');

create policy "admin_insert_licenses" on public.licenses
  for insert with check (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin');

create policy "admin_update_licenses" on public.licenses
  for update using (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin');

create policy "admin_select_activations" on public.activations
  for select using (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin');

create policy "admin_all_app_settings" on public.app_settings
  for all using (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin')
  with check (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin');

create policy "admin_ai_provider_secrets" on public.ai_provider_secrets
  for all using (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin')
  with check (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin');

create policy "admin_select_payment_events" on public.payment_events
  for select using (coalesce((auth.jwt()->'app_metadata'->>'role'), '') = 'admin');
