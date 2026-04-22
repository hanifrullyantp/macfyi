# Operasi Supabase untuk Macfyi — panduan langkah demi langkah

Dokumen ini menjawab: *“Apa yang harus saya lakukan di Supabase, nilainya dari mana, dan apa yang tidak otomatis dari aplikasi?”* Fokus pada **CLI + Dashboard**, bukan kode di Mac.

---

## 0. Prinsip penting

| Topik | Penjelasan singkat |
|--------|---------------------|
| **Secret Edge** | Function Deno membaca `Deno.env.get(...)`. Nilai diisi lewat **`supabase secrets set`** atau Dashboard **Edge Functions → Secrets**. Ini **terpisah** dari menu **Authentication → SMTP** (yang hanya untuk email login Supabase). Untuk email lisensi/komisi dari Macfyi, salin SMTP yang sama ke secret Edge bila ingin konsisten. |
| **Konten landing** | Teks, warna, URL hosted Lynk (opsional) disimpan di **`landing_site_content`** lewat tombol **Publikasikan** di admin landing — bukan lewat secret. |
| **Gateway checkout** | Nilai `midtrans` / `lynk` / `external` ada di **`platform_settings`** key `checkout.gateway`; diubah dari tab **Checkout** admin landing (**Simpan gateway ke server**). |

---

## 1. Satu kali: pasang CLI dan hubungkan proyek

1. Buat proyek di [supabase.com](https://supabase.com).
2. Instal CLI: `npm i -g supabase`
3. Login: `supabase login`
4. Di folder repo Macfyi (ada folder `supabase/`):  
   `supabase link --project-ref <PROJECT_REF>`  
   `<PROJECT_REF>` ada di **Project Settings → General → Reference ID**.

---

## 2. Database (migrasi + RLS)

Migrasi SQL ada di `supabase/migrations/`. RLS dan kebijakan admin didefinisikan di sana (mis. `20250412130100_admin_rls_policies.sql`).

```bash
cd /path/ke/macfyi
supabase db push
```

- **Dari nol:** `db push` menerapkan seluruh migrasi ke proyek yang terhubung.
- **RLS:** Anda tidak “mengaktifkan RLS” manual per tabel kecuali migrasi meminta perubahan; cukup pastikan migrasi terbaru sudah di-push.
- **User admin landing:** di Dashboard **Authentication → Users** → pilih user → **App metadata** (raw JSON): `{ "role": "admin" }` agar bisa **Publikasikan** konten dan mengubah `platform_settings`.

---

## 3. Secret — dari mana nilainya?

1. Salin contoh file:  
   `cp scripts/env.supabase.secrets.example scripts/env.supabase.secrets`
2. Isi `scripts/env.supabase.secrets` dengan nilai dari **penyedia SMTP**, **Midtrans**, **Lynk**, dll. (bukan dari repo Macfyi).
3. Unggah ke Supabase:

```bash
supabase secrets set --env-file scripts/env.supabase.secrets
```

File `scripts/env.supabase.secrets` **jangan** di-commit (sudah di `.gitignore`).

---

## 3A. Auth — template email verifikasi (branding Macfyi)

Supabase Auth mengirim email verifikasi / reset menggunakan template yang bisa Anda ubah di Dashboard.

- **Lokasi di Dashboard**: Authentication → Email Templates → **Confirm signup**
- **Template siap pakai**: `supabase/email-templates/confirm-signup.html`
- **Catatan penting**: tautan verifikasi cukup `{{ .ConfirmationURL }}` (sudah termasuk redirect dari `emailRedirectTo` di kode). Jangan menambah `&redirect_to=` manual di template — bisa menggandakan parameter.

Alur demo yang diharapkan:
- User daftar demo di landing → Supabase kirim email verifikasi
- User klik tombol di email → redirect ke `/download`
- Halaman `/download` otomatis membuat token demo + menampilkan tombol unduh DMG

#### Setelah klik email verifikasi: `404 NOT_FOUND` (Vercel)

Pesan seperti `404: NOT_FOUND` dengan **ID** `sin1:…` berasal dari **Vercel**, bukan dari Supabase. Build landing (`vite build`) menghasilkan satu **`index.html`**; rute seperti `/download` hanya ada di **React Router**. Tanpa konfigurasi tambahan, Vercel mencari file bernama `download` dan mengembalikan **404**.

**Perbaikan:** gunakan **SPA fallback** — di repo sudah ada `macfyi-landing-page/vercel.json` yang mengarahkan semua path ke `/index.html` (file statis tetap dilayani lebih dulu oleh Vercel). **Redeploy** proyek Vercel. Pastikan **Root Directory** di Vercel = `macfyi-landing-page` (jika deploy dari monorepo); jika root repo berbeda, salin isi `rewrites` ke `vercel.json` di folder yang menjadi root deploy. Samakan domain di **Site URL** Supabase dengan domain Vercel (mis. hanya `https://macfyi.com` atau hanya `www`, plus entri redirect yang konsisten).

### SMTP & email

| Secret | Keterangan |
|--------|------------|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Dari panel SMTP penyedia (SES, SendGrid, Mailgun, Zoho, …). |
| `EMAIL_FROM` | Untuk **email lisensi** setelah webhook: isi **alamat email saja** (contoh `orders@domain.com`). Nama tampilan diambil dari `app_settings.email_from_name`. |
| `OPS_ALERT_EMAIL` | Opsional; alamat internal untuk email terkait **penarikan** (bisa beberapa, pisah koma). |

Port **465** + TLS implisit: set `SMTP_TLS=true` (atau `SMTP_SECURE=true`) dan `SMTP_PORT=465` sesuai `supabase/functions/_shared/smtpSend.ts`.

#### Auth email lewat Resend (langkah lengkap)

Resend cocok untuk **email konfirmasi / reset password Supabase Auth** karena SMTP-nya dihosting untuk klien cloud (hindari timeout seperti SMTP shared hosting).

**A. Di Resend ([resend.com](https://resend.com))**

1. Buat akun / login → **API Keys** → **Create API Key** (permission kirim email; simpan nilai yang dimulai `re_…`, hanya ditampilkan sekali).
2. **Domains** → **Add domain** → ikuti DNS (SPF, DKIM, biasanya satu rekaman `TXT`/`MX` sesuai wizard). Tunggu status **Verified**.
3. Alamat pengirim Auth harus memakai domain yang sudah terverifikasi, mis. `no-reply@macfyi.com` (bukan domain orang lain).

**B. Nilai SMTP untuk Supabase** (sama seperti [dokumentasi Resend + Supabase](https://resend.com/docs/send-with-supabase-smtp)):

| Field | Nilai |
|--------|--------|
| Host | `smtp.resend.com` |
| Port | `465` (SSL/TLS implisit) — alternatif `587` jika UI Anda meminta STARTTLS |
| Username | `resend` (teks literal, **bukan** alamat email) |
| Password | **API key** Resend Anda (`re_…`) |

**C. Di Supabase Dashboard**

1. **Authentication** → bagian **Email** / **Notifications** → **SMTP Settings** (nama menu bisa sedikit berbeda antar versi UI).
2. Aktifkan **Enable Custom SMTP** (atau setara).
3. Isi **Sender email** = alamat di domain terverifikasi Resend (mis. `no-reply@macfyi.com`).
4. Isi **Sender name** = mis. `Macfyi`.
5. Tempel **Host**, **Port**, **Username** `resend`, **Password** = API key.
6. Simpan. Uji **Daftar** dari landing: user harus muncul di **Authentication → Users** dan inbox menerima email verifikasi.

**D. Edge Functions Macfyi (email lisensi / internal)**

Menu **Authentication → SMTP** hanya mempengaruhi **Auth**. Email dari Edge (lisensi, ops, dll.) memakai secret `SMTP_*` di `scripts/env.supabase.secrets` — bila ingin satu penyedia, isi host/user/pass yang sama (Resend: `smtp.resend.com`, user `resend`, pass = API key) lalu `supabase secrets set --env-file scripts/env.supabase.secrets`.

#### SMTP Auth (Dashboard): 504 / 500 / «Error sending confirmation email»

Jika browser menunjukkan **`/auth/v1/signup` status 504 atau 500** saat daftar, itu hampir selalu **Supabase tidak sempat menghubungi SMTP custom** (timeout), bukan bug di landing page.

Checklist singkat:

1. **Username SMTP**: di banyak panel (cPanel, Plesk, VPS), username harus **alamat email lengkap** pengirim (mis. `no-reply@macfyi.com`), bukan hanya nama mailbox (`Macfyi`).
2. **Port dan enkripsi**: `465` = biasanya SSL/TLS implisit; `587` = biasanya STARTTLS. Salah kombinasi sering menyebabkan hang atau ditolak.
3. **Firewall / jaringan**: server `mail.macfyi.com` harus menerima koneksi SMTP **dari internet**, bukan hanya dari IP server web Anda. Cloud Supabase mengirim dari IP mereka; jika firewall hanya mengizinkan IP tertentu, koneksi bisa **timeout (504)**.
4. **Uji dari mesin lokal**: `openssl s_client -connect mail.macfyi.com:465` (atau `:587`) untuk memastikan sertifikat dan port hidup.
5. **Alternatif andal**: transactional email (Amazon SES, Resend, SendGrid, Mailgun) dengan kredensial SMTP/API resmi sering lebih stabil daripada SMTP shared hosting untuk Auth.

#### User tidak muncul di Authentication → Users (perilaku “sebelumnya” hilang)

Jika **Custom SMTP di Dashboard aktif** tetapi server mail **tidak bisa dihubungi** dari cloud Supabase, Auth akan gagal mengirim email konfirmasi. Pada banyak proyek, hasilnya: **signup gagal**, baris user **tidak dibuat** (tabel **Authentication → Users** tetap kosong untuk email itu), dan Anda melihat **«Error sending confirmation email»** — ini **bukan** bug di kode Macfyi.

**Supaya daftar dan email konfirmasi kembali jalan seperti saat Anda belum pakai SMTP custom (email lewat infrastruktur bawaan Supabase, dengan batas kuota):**

1. Buka **Supabase Dashboard** → **Project Settings** → **Authentication** (atau **Authentication** → pengaturan **SMTP**, tergantung versi UI).
2. Cari bagian **Custom SMTP** / **SMTP Settings**.
3. **Nonaktifkan** opsi seperti **Enable Custom SMTP** (kembalikan ke pengiriman default Supabase). Hapus/simpan agar tidak lagi memakai `mail.macfyi.com` untuk Auth.
4. Tunggu ±1 menit, lalu coba **Daftar** lagi dari landing — user harus muncul di **Users** dan email verifikasi dikirim (dari layanan Supabase).

Setelah SMTP transaksional (Resend, SES, SendGrid, dll.) sudah **teruji** dengan kredensial benar, Anda bisa **aktifkan lagi** Custom SMTP; sampai saat itu, biarkan default Supabase agar funnel demo tidak terblokir.

**HTTP 400** pada signup bisa berarti `redirect_to` tidak ada di **Redirect URLs** (Dashboard → Authentication → URL Configuration) — samakan dengan `scripts/patch-supabase-auth-urls.sh` / `supabase/config.toml` (`https://macfyi.com/**`, dll.).

### Midtrans

| Secret | Keterangan |
|--------|------------|
| `MIDTRANS_SERVER_KEY` | Server key dari dashboard Midtrans (Snap + verifikasi notifikasi). |
| `MIDTRANS_CLIENT_KEY` | Untuk Snap di browser (juga dipakai function create snap). |
| `MIDTRANS_IS_PRODUCTION` | Opsional; `true`/`false` untuk lingkungan produksi vs sandbox. |

**Notification URL** di Midtrans:  
`https://<PROJECT_REF>.supabase.co/functions/v1/payment-webhook`

### Lynk.id

| Secret | Keterangan |
|--------|------------|
| `LYNK_CREATE_URL` | URL **POST** lengkap ke API pembuatan checkout (dari dokumentasi / Postman Lynk). |
| `LYNK_BEARER_TOKEN` atau `LYNK_API_KEY` | Token atau **merchant / API key** dari panel Lynk — tempel sebagai secret, **bukan** di form admin landing. |
| `LYNK_AUTH_MODE` | Opsional: `x-api-key` atau `apikey` agar nilai dikirim di header `X-Api-Key` (bukan `Authorization: Bearer`). |
| `LYNK_WEBHOOK_SECRET` | Secret untuk memverifikasi tanda tangan webhook (disarankan produksi). |
| `LYNK_WEBHOOK_SIGNATURE_HEADER` | Opsional; default `x-lynk-signature` jika berbeda di Lynk. |

**Webhook URL** Lynk: sama seperti Midtrans — `.../payment-webhook`.

**Alternatif tanpa API:** di admin landing tab **Checkout**, isi **URL tautan checkout Lynk (hosted link)**. Pengunjung diarahkan ke URL itu dengan query `email`, `name`, `phone` (tanpa memanggil Edge `create-lynk-checkout`). Cocok jika Lynk memberi satu tautan produk; harga/order server tidak lewat Macfyi.

### Cron (`scheduled-ops`)

| Secret | Keterangan |
|--------|------------|
| `CRON_SECRET` | String acak panjang. Panggil function dengan header `Authorization: Bearer <CRON_SECRET>` atau `x-cron-secret: <CRON_SECRET>`. |

Jadwalkan dengan **GitHub Actions**, **cron server**, atau **Supabase Scheduled Functions** (sesuai yang Anda pakai) — URL:  
`https://<PROJECT_REF>.supabase.co/functions/v1/scheduled-ops`  
Method: **POST**.

---

## 4. Satu perintah: skrip bootstrap repo

Dari root repo:

```bash
./scripts/supabase-bootstrap.sh
```

Skrip ini (urutan ringkas):

1. `supabase db push`
2. Jika ada `scripts/env.supabase.secrets`: `supabase secrets set --env-file ...`
3. `supabase functions deploy` untuk semua function Macfyi yang ada di folder `supabase/functions/` (termasuk `public-config`, `payment-webhook`, `create-midtrans-snap`, `create-lynk-checkout`, dll.)

Variabel opsional: `SUPABASE_SECRETS_FILE=/path/custom.env` jika file secret bukan lokasi default.

---

## 5. Landing (Vite) — env browser

Di `macfyi-landing-page/.env` (atau `.env.local`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Tanpa keduanya, checkout server (Midtrans/Lynk API) tidak bisa dipanggil dari browser; mode **URL eksternal** / **hosted Lynk** tetap bisa dipakai jika URL diisi di konten.

---

## 6. Checkout: Midtrans vs Lynk vs eksternal

1. **Admin landing → tab Checkout** → pilih gateway → **Simpan gateway ke server** (menulis `platform_settings`).
2. **Midtrans:** secret Midtrans + deploy `create-midtrans-snap` + `payment-webhook`.
3. **Lynk API:** secret `LYNK_*` + deploy `create-lynk-checkout` + `payment-webhook`.
4. **Lynk hosted link saja:** isi **URL tautan checkout Lynk** di tab yang sama; **Publikasikan** konten. Gateway tetap **Lynk**; secret `LYNK_*` tidak wajib untuk redirect saja (webhook lisensi tetap butuh alur pembayaran yang mengarah ke `payment-webhook` sesuai integrasi Lynk Anda).

Detail tambahan: [`CHECKOUT_GATEWAY_LYNK.md`](./CHECKOUT_GATEWAY_LYNK.md).

---

## 7. Checklist cepat sebelum produksi

- [ ] `supabase link` ke proyek benar  
- [ ] `supabase db push` sukses  
- [ ] Secret SMTP + pembayaran ter-set; `EMAIL_FROM` email polos untuk lisensi  
- [ ] `supabase functions deploy` (atau `./scripts/supabase-bootstrap.sh`)  
- [ ] Webhook Midtrans & Lynk mengarah ke `payment-webhook`  
- [ ] `CRON_SECRET` + jadwal POST `scheduled-ops`  
- [ ] User admin dengan `app_metadata.role = "admin"`  
- [ ] Landing: **Publikasikan** konten setelah mengubah URL/checkout  

---

## 8. Rujukan lain di repo

- `supabase/README.md` — daftar function dan perintah deploy per baris  
- `docs/CHECKOUT_GATEWAY_LYNK.md` — Lynk + webhook  
- `docs/MACFYI_MANUAL_INTEGRATION_AND_QA.md` — uji integrasi & QA  

Jika CLI mengeluh **not linked**, jalankan lagi `supabase link --project-ref …` dari root repo.
