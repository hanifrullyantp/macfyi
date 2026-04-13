-- Admin panel: baca riwayat checkout / Midtrans
create policy "payment_transactions_admin_select"
  on public.payment_transactions for select
  using (public.jwt_is_admin());
