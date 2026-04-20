# Checkout gateway (Midtrans / Lynk.id / eksternal)

Sumber kebenaran: `platform_settings` key **`checkout.gateway`** (`midtrans` | `lynk` | `external`), diekspos ke landing lewat Edge Function **`public-config`** (`checkout.gateway`).

## Secrets (Supabase)

**Midtrans (tetap):** `MIDTRANS_SERVER_KEY`, kunci Snap di Edge `create-midtrans-snap`.

**Lynk.id — create checkout**

- `LYNK_CREATE_URL` — URL POST penuh ke API Lynk (sesuaikan koleksi Postman).
- `LYNK_BEARER_TOKEN` atau `LYNK_API_KEY` — otentikasi (default header `Authorization: Bearer …`; set `LYNK_AUTH_MODE=x-api-key` untuk header `X-Api-Key`).

**Lynk.id — webhook**

- `LYNK_WEBHOOK_SECRET` — secret untuk HMAC-SHA256 hex atas **body mentah** JSON (disarankan di produksi).
- `LYNK_WEBHOOK_SIGNATURE_HEADER` — opsional, default `x-lynk-signature` (sesuaikan jika Lynk memakai nama header lain).

Tanpa `LYNK_WEBHOOK_SECRET`, webhook tetap menerima payload “generik” seperti sebelumnya (kurang aman).

## Deploy Edge Functions

```bash
supabase secrets set MIDTRANS_SERVER_KEY=...   # jika memakai Midtrans
supabase secrets set LYNK_CREATE_URL=... LYNK_BEARER_TOKEN=...
supabase secrets set LYNK_WEBHOOK_SECRET=...   # disarankan untuk Lynk di produksi

supabase functions deploy public-config --no-verify-jwt
supabase functions deploy create-midtrans-snap --no-verify-jwt
supabase functions deploy create-lynk-checkout --no-verify-jwt
supabase functions deploy payment-webhook --no-verify-jwt
```

**Webhook URL (Midtrans & Lynk):** `https://<project-ref>.supabase.co/functions/v1/payment-webhook`

Migrasi default gateway: `supabase/migrations/20260419180000_checkout_gateway.sql`.

## Mode “hosted link” (tanpa `create-lynk-checkout`)

Jika Lynk memberi **satu URL pembayaran** (payment link) dan Anda tidak perlu menghitung harga lewat Edge:

1. Admin landing → tab **Checkout** → gateway **Lynk.id** → isi **URL tautan checkout Lynk (hosted link)**.
2. **Publikasikan** konten landing (bukan hanya simpan gateway).

Saat pengunjung menekan bayar, browser diarahkan ke URL tersebut dengan query `email`, `name`, `phone` (Lynk mungkin mengabaikan query yang tidak dikenal — sesuaikan dengan format URL resmi Lynk).

Untuk **order id server**, kupon, harga dari `app_settings`, dan webhook terstruktur, gunakan secret **`LYNK_CREATE_URL` + token** dan biarkan field hosted link **kosong**.

## Admin UI

Tab **Checkout** di modal admin:

- Pilih **Midtrans** / **Lynk.id** / **Hanya URL eksternal** lalu **Simpan gateway ke server** (`platform_settings`; perlu sesi Supabase `app_metadata.role = admin`).
- Jika **Lynk**: form **URL hosted** + petunjuk **CLI secret** (merchant/API key hanya lewat `supabase secrets set`, bukan di admin).
