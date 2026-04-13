# Macfyi — Supabase backend (licenses & Edge Functions)

## Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Install CLI: `npm i -g supabase`
3. Link: `supabase link --project-ref <ref>`
4. Apply migrations: `supabase db push` (or run SQL from `migrations/` in SQL Editor).

## Secrets (hosted)

```bash
# Email setelah bayar (Resend)
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set EMAIL_FROM=notifications@yourdomain.com

# Midtrans (Snap + notification verification)
supabase secrets set MIDTRANS_SERVER_KEY=SB-Mid-server-...
supabase secrets set MIDTRANS_CLIENT_KEY=SB-Mid-client-...
# Optional: default is sandbox Snap URL
supabase secrets set MIDTRANS_IS_PRODUCTION=false

# Alert email penarikan (opsional, dipisah koma)
supabase secrets set OPS_ALERT_EMAIL=ops@yourdomain.com

# Secret untuk memanggil scheduled-ops dari cron eksternal
supabase secrets set CRON_SECRET=random-long-string
```

## Edge Functions

```bash
supabase functions deploy activate-license --no-verify-jwt
supabase functions deploy payment-webhook --no-verify-jwt
supabase functions deploy create-midtrans-snap --no-verify-jwt
supabase functions deploy track-event --no-verify-jwt
supabase functions deploy submit-withdrawal --no-verify-jwt
supabase functions deploy admin-withdrawal --no-verify-jwt
supabase functions deploy scheduled-ops --no-verify-jwt
supabase functions deploy ai-proxy
```

| Function | Role |
|----------|------|
| **activate-license** | Mac app: `email`, `license_key`, `device_fingerprint`. |
| **create-midtrans-snap** | Landing/checkout: body `{ email, name, phone, referral_slug? }` + user JWT opsional (anti self-referral). |
| **payment-webhook** | Midtrans HTTP notification URL: verify `signature_key` (SHA512), update `payment_transactions`, issue license + Resend email; komisi affiliate idempotent. |
| **track-event** | Landing analytics batch → CRM (`crm_contacts` / `crm_events`) + klik referral. |
| **submit-withdrawal** | Member: header `Authorization: Bearer <user JWT>`, body `{ amount_idr, method, account_details }`. |
| **admin-withdrawal** | Admin JWT: `{ id, status, admin_note?, proof_url? }`. |
| **scheduled-ops** | Cron: header `Authorization: Bearer <CRON_SECRET>` atau `x-cron-secret` — konfirmasi komisi, tier, lifecycle event. |
| **ai-proxy** | Admin-only stub; callers send user JWT. |

### Midtrans dashboard

1. **Payment Notification URL:** `https://<project-ref>.supabase.co/functions/v1/payment-webhook`
2. **Snap API:** server key / client key match the secrets above.
3. Set **Settings → URL Configuration** allowed callback/finish URLs for your landing domain if Midtrans requires it.

### Konten landing (database)

Tabel `landing_site_content` menyimpan JSON konten yang disunting di admin landing (tombol **Publikasikan**). **Baca:** anon key (publik). **Tulis:** pengguna Supabase Auth dengan `app_metadata.role = "admin"`.

1. Jalankan migrasi (`supabase db push`) agar tabel + RLS ada.
2. Di **Authentication → Users**, buat atau pilih user admin → **App metadata** (raw JSON): `{ "role": "admin" }`.
3. Di landing, masuk dengan email/password user itu; **Publikasikan** menyimpan ke baris `id = default`.

### Landing page (Vite)

In `macfyi-landing-page/.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

When both are set, checkout opens **Midtrans Snap** via `create-midtrans-snap`. Otherwise it falls back to **Checkout URL** from inline admin settings.

## Admin browser UI

See `../admin-web/README.md`. Requires migration `20250412130100_admin_rls_policies.sql` and Supabase users with `app_metadata.role = "admin"`.

## Security notes

- Store **hashed** license keys only (`license_key_hash`). Issue the plain key once in the confirmation email.
- `payment-webhook` verifies Midtrans `signature_key` when `MIDTRANS_SERVER_KEY` is set.
- Idempotency: `payment_events.id` = `transaction_id` + `_` + `transaction_status` so pending then settlement both process.
- Lock down generic webhook parsing in production once Midtrans is live.
