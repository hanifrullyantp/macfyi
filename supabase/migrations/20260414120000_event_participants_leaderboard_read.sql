-- Anggota terautentikasi dapat melihat peserta event aktif/berakhir (leaderboard agregat di UI).
create policy "event_participants_leaderboard_peers"
  on public.event_participants for select
  to authenticated
  using (
    exists (
      select 1 from public.promo_events pe
      where pe.id = event_participants.event_id
        and pe.status in ('active', 'ended')
    )
  );
