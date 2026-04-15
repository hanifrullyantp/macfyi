# Jadwal promo (harga, countdown, slot)

## Database

Jalankan migrasi Supabase (termasuk `20260416120000_promo_plan_app_settings.sql`) agar kolom `app_settings.promo_plan`, `app_settings.promo_slots_remaining`, dan tabel `promo_slot_decrement_log` tersedia.

## Edge Functions

Setelah mengubah kode bersama (`_shared/promoPlan.ts`) atau fungsi berikut, deploy:

```bash
supabase functions deploy public-config --no-verify-jwt
supabase functions deploy create-midtrans-snap --no-verify-jwt
supabase functions deploy payment-webhook --no-verify-jwt
```

Respons `public-config` sekarang menyertakan `server_time`, `promo` (fase aktif, `ends_at`, `compare_at_idr`, slot), dan `pricing.lifetime_price_idr` sudah **harga efektif** dari jadwal. Cache HTTP response diperketat ke `max-age=30` detik.

## Admin landing

Tab **Pengaturan → Promo & scarcity**: simpan jadwal ke `app_settings`. Setelah simpan, halaman landing memuat ulang harga/compare dari `public-config` (callback `onAfterPromoSave`).

## Slot & webhook

Penurunan `promo_slots_remaining` hanya terjadi jika kolom diisi (counter aktif) dan pembayaran sukses lewat `payment-webhook`, dengan idempotensi per `order_id` lewat `promo_slot_decrement_log`.

Opsi **Blok checkout** saat slot 0 memakai flag `block_checkout_when_slots_zero` di JSON plan; Snap mengembalikan HTTP 409 `promo_slots_exhausted`.
