# Panduan setup Macfyi — Affiliate, CRM, Admin, Member

Dokumen ini merangkai alur **Supabase (Postgres + Auth + Edge Functions + RLS)** dengan **landing** (`macfyi-landing-page`), **admin** (`admin-web`), dan **area member** (`member-web`).

## 1. Prasyarat

- Proyek Supabase dengan migrasi di `supabase/migrations/` sudah diterapkan (`supabase db push` atau SQL Editor).
- Secret Edge (Dashboard → Edge Functions → Secrets):
  - `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION` (checkout)
  - `SMTP_HOST`, `SMTP_PORT` (default 587), `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` — email transaksional Edge (boleh sama dengan **Authentication → SMTP** di Dashboard, disalin manual ke secrets; Edge tidak membaca pengaturan Auth otomatis)
  - `OPS_ALERT_EMAIL` — alamat email admin untuk alert penarikan (pisahkan koma jika banyak)
  - `CRON_SECRET` — string acak untuk memanggil `scheduled-ops`
- Variabel bawaan Supabase pada fungsi: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## 2. Deploy Edge Functions

Contoh:

```bash
supabase functions deploy create-midtrans-snap --no-verify-jwt
supabase functions deploy payment-webhook --no-verify-jwt
supabase functions deploy track-event --no-verify-jwt
supabase functions deploy submit-withdrawal --no-verify-jwt
supabase functions deploy admin-withdrawal --no-verify-jwt
supabase functions deploy scheduled-ops --no-verify-jwt
```

Atur URL notifikasi Midtrans ke `https://<ref>.supabase.co/functions/v1/payment-webhook`.

## 3. Admin Auth

Buat user admin (hanya di mesin tepercaya, pakai **service role**):

```bash
export SUPABASE_URL="https://xxxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
node scripts/create-admin.mjs admin@domain.com passwordKuat
```

Login di `admin-web` dengan akun tersebut (`app_metadata.role = admin`).

## 4. Frontend — env

Salin `.env.example` → `.env` di masing-masing app:

| App | Variabel |
|-----|----------|
| `macfyi-landing-page` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, opsional `VITE_SITE_TRACKING=false`, `VITE_REFERRAL_COOKIE_DAYS` |
| `admin-web` | sama |
| `member-web` | sama |

Landing: tautan referral `https://<domain>/ref/<slug>` atau `?ref=<slug>`; cookie `macfyi_ref`; batch analytics ke `track-event`.

## 5. Alur uji end-to-end (ringkas)

1. **Admin** — setujui affiliate baru: `admin-web` → Affiliate → Aktifkan.
2. **Member** — daftar di `member-web`, daftar affiliate (slug), isi JSON rekening di halaman Affiliate.
3. **Referral** — buka landing `/ref/<slug>` (atau `?ref=`), lalu checkout; body `create-midtrans-snap` membawa `referral_slug`.
4. **Bayar (sandbox Midtrans)** — webhook `payment-webhook` menerbitkan lisensi + komisi idempotent.
5. **Komisi** — setelah `available_at`, panggil cron: `POST /functions/v1/scheduled-ops` dengan header `Authorization: Bearer <CRON_SECRET>` (atau `x-cron-secret`) untuk mengonfirmasi komisi dan menaikkan tier (sesuai `platform_settings`).
6. **Penarikan** — member ajukan di `member-web` → Edge `submit-withdrawal`; admin proses di `admin-web` → Penarikan (memanggil `admin-withdrawal`).
7. **CRM** — event landing ke `track-event` mengisi `crm_contacts` / `crm_events`; admin mengubah tahap di menu CRM.

## 6. Seed demo (dev)

```bash
export SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
NODE_ENV=development node scripts/seed-demo.mjs
NODE_ENV=development node scripts/reset-demo.mjs
```

Tanpa `NODE_ENV=development`, gunakan `ALLOW_DEMO_SEED=true` secara eksplisit.

## 7. Cron terjadwal (GitHub Actions)

Sudah ada workflow [`.github/workflows/macfyi-scheduled-ops.yml`](.github/workflows/macfyi-scheduled-ops.yml). Setelah **push ke GitHub**, buka repo → **Settings → Secrets and variables → Actions**:

1. **New repository secret** → nama `MACFYI_CRON_SECRET`, nilai = baris `CRON_SECRET` di `macfyi-local.env` (file lokal Anda, jangan di-commit).
2. **Variables** tab → **New repository variable** → nama `MACFYI_SCHEDULED_OPS_URL`, nilai =  
   `https://<PROJECT_REF>.supabase.co/functions/v1/scheduled-ops`  
   (ganti `<PROJECT_REF>` dengan ref proyek Anda, sama seperti di URL Supabase.)

Tanpa kedua nilai itu, workflow akan gagal sampai Anda mengisinya. Alternatif: Vercel Cron atau cron server lain yang `POST` ke URL yang sama dengan header `Authorization: Bearer <CRON_SECRET>`.

### Email alert penarikan (`OPS_ALERT_EMAIL`)

Setelah punya alamat email admin yang dipakai:

1. Isi `export OPS_ALERT_EMAIL="admin@domain.com"` di `macfyi-local.env`.
2. Jalankan: `source macfyi-local.env && supabase secrets set OPS_ALERT_EMAIL="$OPS_ALERT_EMAIL"`  
   atau ulangi `./scripts/integrasi-stack.sh ./macfyi-local.env`.

## 8. Catatan produksi

- Jangan commit service role key atau `CRON_SECRET`.
- SMTP: verifikasi domain pengirim (SPF/DKIM) di penyedia Anda; `EMAIL_FROM` harus alamat yang sah.
- `OPS_ALERT_EMAIL` opsional jika Anda hanya mengandalkan notifikasi in-app admin.
