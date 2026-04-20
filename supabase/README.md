# Macfyi — Supabase backend (licenses & Edge Functions)

## Setup

1. Create a project at [supabase.com](https://supabase.com).
2. Install CLI: `npm i -g supabase`
3. Link: `supabase link --project-ref <ref>`
4. Apply migrations: `supabase db push` (or run SQL from `migrations/` in SQL Editor).

**Satu skrip (push DB + secret dari file + deploy functions):** dari root repo jalankan `./scripts/supabase-bootstrap.sh`  
(setelah menyalin `scripts/env.supabase.secrets.example` → `scripts/env.supabase.secrets` dan mengisi nilai).  
Panduan bahasa Indonesia yang lebih lengkap: [`../docs/SUPABASE_OPERASI_LENGKAP_ID.md`](../docs/SUPABASE_OPERASI_LENGKAP_ID.md).

### Auth — email konfirmasi / demo

**Produksi (customer):** di `config.toml`, `site_url = "https://macfyi.com"` dan redirect mengizinkan `https://macfyi.com/**` serta `https://www.macfyi.com/**` (sudah di-push ke proyek terhubung bila Anda menjalankan `supabase config push`). Pelanggan membuka link dari email di domain itu.

**Lokal:** `additional_redirect_urls` memuat `http://localhost:5173/**` (dan port 3000) agar tim bisa uji dari laptop; pastikan **dev server hidup** di origin tersebut. Jika URL email vs port tidak cocok, browser bisa *connection refused* dan OTP kedaluwarsa.

- **Kode:** `signUp` mengirim `emailRedirectTo` ke origin tab saat ini (landing + member-web).
- **CLI:** setel `[auth]` di `supabase/config.toml`, lalu `supabase config push --yes` — selalu cek **diff** (bisa menyentuh MFA/email rate jika nilai lokal beda dari remote).
- **Alternatif:** `./scripts/patch-supabase-auth-urls.sh` + `SUPABASE_ACCESS_TOKEN` (hanya `site_url` + `uri_allow_list`).

Setelah OTP habis, daftar lagi untuk email baru.

## Secrets (hosted)

**Email:** Edge Functions **tidak** memakai API pihak ketiga (mis. Resend HTTP); pengiriman transaksional hanya lewat **SMTP** (`SMTP_*` + `EMAIL_FROM`). Supabase **bukan** penyedia SMTP—hanya menyimpan secret. Isi **Authentication → SMTP** di Dashboard bila Anda pakai custom SMTP untuk Auth; untuk Edge, **salin host/user/password yang sama** ke `supabase secrets set` (atau SMTP transaksional terpisah). Tanpa `SMTP_*` yang valid, email tidak terkirim.

```bash
# Email transaksional (SMTP — salin dari Authentication → SMTP di Dashboard, atau SMTP host Anda)
supabase secrets set SMTP_HOST=smtp.yourprovider.com
supabase secrets set SMTP_PORT=587
# Port 465 + TLS implisit: set SMTP_TLS=true dan SMTP_PORT=465
# supabase secrets set SMTP_TLS=true
supabase secrets set SMTP_USER=apikey_or_user
supabase secrets set SMTP_PASS=secret
# Email lisensi (payment-webhook): gunakan alamat polos, contoh:
supabase secrets set EMAIL_FROM=orders@yourdomain.com

# Midtrans (Snap + notification verification)
supabase secrets set MIDTRANS_SERVER_KEY=SB-Mid-server-...
supabase secrets set MIDTRANS_CLIENT_KEY=SB-Mid-client-...
# Optional: default is sandbox Snap URL
supabase secrets set MIDTRANS_IS_PRODUCTION=false

# Lynk.id (opsional — jika checkout.gateway = lynk). Detail: ../docs/CHECKOUT_GATEWAY_LYNK.md
# supabase secrets set LYNK_CREATE_URL=https://...
# supabase secrets set LYNK_BEARER_TOKEN=...
# supabase secrets set LYNK_WEBHOOK_SECRET=...
# supabase secrets set LYNK_WEBHOOK_SIGNATURE_HEADER=x-lynk-signature

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
supabase functions deploy create-lynk-checkout --no-verify-jwt
supabase functions deploy demo-request --no-verify-jwt
supabase functions deploy demo-download-verify --no-verify-jwt
supabase functions deploy demo-verify --no-verify-jwt
supabase functions deploy public-config --no-verify-jwt
supabase functions deploy client-telemetry --no-verify-jwt
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
| **create-lynk-checkout** | Landing jika `checkout.gateway = lynk`: body sama seperti Snap; insert `payment_transactions` (provider `lynk`), POST ke `LYNK_CREATE_URL`, return `checkout_url`. |
| **payment-webhook** | Midtrans (SHA512) + Lynk (HMAC-SHA256 opsional) + generik: update `payment_transactions`, issue license + email SMTP; komisi affiliate idempotent. |
| **demo-request** | Landing/desktop: header `Authorization: Bearer <user JWT>` (wajib jika `demo.allow_anonymous_demo_request=false`). Body opsional `{ name, phone?, … }`. Upsert `crm_contacts` by `user_id`, buat `demo_tokens`, return `download_url`. |
| **demo-download-verify** | Landing `/download`: JWT + body `{ token }` — token harus milik kontak dengan `user_id` yang sama (atau klaim email cocok untuk token lama). |
| **demo-verify** | Desktop: body `{ token }` → valid + `rules_snapshot` untuk gating demo. |
| **public-config** | GET — harga, URL unduhan, rules demo/AI/marketing/SEO (tanpa rahasia). |
| **client-telemetry** | Desktop/web: event whitelist + `ErrorReport` (wajib `consent: true`). |
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

Migrasi `20260414175000_landing_product_details_refresh.sql` mengisi ulang array `content.details` (empat fitur + path gambar `/landing/...`). Pastikan file di `macfyi-landing-page/public/landing/` ikut di-deploy bersama situs, atau ganti URL di admin dengan asset dari bucket Storage `landing-media`.

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
