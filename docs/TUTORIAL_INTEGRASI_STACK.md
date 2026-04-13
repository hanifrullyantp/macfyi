# Integrasi stack (Supabase · Vercel · Midtrans · Resend)

## Aturan satu kalimat

- **~1% — hanya Anda:** hal yang **tidak bisa** dilakukan asisten/Cursor tanpa identitas & klik Anda (daftar akun, verifikasi email/SMS, **sekali** login OAuth di browser, salin kunci dari dashboard ke chat atau file `.env` lokal, rekaman DNS di registrar). Tanpa itu, tidak ada yang bisa “otomatis penuh”.
- **~99% — bukan pekerjaan manual Anda:** semua langkah teknis dilakukan **di sini** dengan **Terminal Cursor** (atau minta asisten Cursor menjalankan blok perintah). Anda cukup **menempelkan nilai rahasia** yang Anda ambil dari web ke tempat yang ditunjuk, lalu **Enter**.

Jangan mengerjakan 99% itu dengan klik manual di dashboard kecuali dokumen ini menyebut “wajib web” (biasanya cuma pengaturan pertama + OAuth).

---

## Bagian 1% — Checklist yang **wajib** Anda lakukan (tidak bisa digantikan AI)

Centang ketika selesai:

| # | Tindakan | Kenapa AI tidak bisa |
|---|----------|------------------------|
| 1 | Buat akun **GitHub** (atau Git host lain) dengan email Anda | Butuh verifikasi email |
| 2 | Buat akun **Supabase** → buat **proyek** baru → tunggu Active | Butuh akun + password DB Anda |
| 3 | Buat akun **Vercel** (login dengan GitHub) | OAuth ke akun Anda |
| 4 | Buat akun **Midtrans** (merchant) | Identitas / syarat merchant |
| 5 | Buat akun **Resend** | Email Anda |
| 6 | Di **Supabase Dashboard** → **Settings → API**: salin **Project URL** dan **anon key** ke Notepad / file lokal | Rahasia proyek Anda |
| 7 | Di **Supabase** → **Settings → General**: salin **Reference ID** (project ref) | — |
| 8 | Di **Midtrans Sandbox**: salin **Server Key** dan **Client Key** | Rahasia merchant |
| 9 | Di **Resend**: buat **API Key**, salin | Rahasia |
| 10 | **Sekali** jalankan `supabase login` dan `vercel login` di Terminal Cursor — **browser Anda** yang approve | OAuth harus dari sesi Anda |
| 11 | (Produksi) **DNS** untuk domain email di Resend: tambah rekaman di registrar **Anda** | Akses DNS Anda |

**Semua angka di atas = ~1%.** Sisanya = perintah di bawah.

---

## Yang Anda siapkan untuk ditempel (satu file, jangan commit)

Buat file **`macfyi-local.env`** di luar repo atau di `.gitignore`:

```bash
# JANGAN commit file ini ke Git
export SUPABASE_URL="https://xxxx.supabase.co"
export SUPABASE_ANON_KEY="eyJhbGciOi..."
export PROJECT_REF="xxxx"
export MIDTRANS_SERVER_KEY="SB-Mid-server-..."
export MIDTRANS_CLIENT_KEY="SB-Mid-client-..."
export RESEND_API_KEY="re_..."
# Contoh; sesuaikan domain Resend Anda:
export EMAIL_FROM='Macfyi <no-replay@macfyi.com>'
```

Lalu di Terminal Cursor (folder repo `macfyi`):

```bash
source /path/ke/macfyi-local.env
```

Semua perintah di bawah menganggap variabel ini sudah ter-export (atau Anda ganti manual).

---

## 99% — Jalankan di Terminal Cursor (urutan tetap)

**Root kerja:** folder monorepo yang berisi `supabase/` (bukan hanya `macfyi-landing-page`).

### Skrip otomatis (disarankan)

Dari root repo, setelah `macfyi-local.env` terisi (lihat daftar variabel di `scripts/example-macfyi-local.env.template`):

```bash
chmod +x scripts/integrasi-stack.sh
./scripts/integrasi-stack.sh ./macfyi-local.env
```

Opsional:

- **`--vercel`** — set env production di Vercel untuk `macfyi-landing-page` (butuh `vercel link` sekali di folder itu) lalu `vercel --prod`.
- **`--prod-midtrans`** — memaksa `MIDTRANS_IS_PRODUCTION=true` (biasanya tidak perlu: skrip mendeteksi dari **Server Key** — `SB-Mid-server-*` = sandbox, `Mid-server-*` = production).

**Jika uji Snap gagal dengan 401 / “unauthorized … check client or server key”:** kunci **sandbox** (`SB-Mid-*`) harus dipakai dengan API sandbox, dan kunci **production** (`Mid-server-*`) dengan API production. Jangan mencampur (misalnya kunci production di env tapi `MIDTRANS_IS_PRODUCTION=false`). Jalankan ulang `./scripts/integrasi-stack.sh` setelah memperbaiki env; skrip menyetel flag otomatis dari prefix kunci.

Jika `vercel env add` via CLI bermasalah di mesin Anda, set `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di dashboard Vercel, lalu jalankan `vercel --prod` dari `macfyi-landing-page`.

---

### Langkah manual (jika Anda ingin menjalankan per blok)

#### 1) Hubungkan CLI ke proyek Supabase

```bash
cd /path/ke/macfyi
supabase link --project-ref "$PROJECT_REF"
```

#### 2) Terapkan skema database

```bash
supabase db push
```

#### 3) Masukkan secret ke Supabase (backend)

```bash
supabase secrets set RESEND_API_KEY="$RESEND_API_KEY"
supabase secrets set EMAIL_FROM="$EMAIL_FROM"
supabase secrets set MIDTRANS_SERVER_KEY="$MIDTRANS_SERVER_KEY"
supabase secrets set MIDTRANS_CLIENT_KEY="$MIDTRANS_CLIENT_KEY"
supabase secrets set MIDTRANS_IS_PRODUCTION=false
```

#### 4) Deploy Edge Functions

```bash
supabase functions deploy create-midtrans-snap --no-verify-jwt
supabase functions deploy payment-webhook --no-verify-jwt
supabase functions deploy activate-license --no-verify-jwt
```

#### 5) Uji Snap (harus HTTP 200 + ada `snap_token`)

```bash
curl -sS -X POST \
  "${SUPABASE_URL}/functions/v1/create-midtrans-snap" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test","phone":"081234567890"}' | head -c 500
echo
```

#### 6) Push kode ke Git (jika belum)

```bash
git add -A
git status
git commit -m "chore: deploy landing integration" || true
git push origin main
```

#### 7) Deploy landing ke Vercel dari CLI

```bash
cd macfyi-landing-page
vercel login
vercel link
vercel env add VITE_SUPABASE_URL production
# tempel nilai SUPABASE_URL saat diminta
vercel env add VITE_SUPABASE_ANON_KEY production
# tempel anon key saat diminta
vercel --prod
```

Alternatif: **impor repo di website Vercel** (itu satu-satunya bagian yang sering lebih cepat di klik) — set **Root Directory** = `macfyi-landing-page`, **Build** = `npm run build`, **Output** = `dist`, lalu pasang env yang sama. Itu tetap “bukan” 99% coding; itu satu form. Dokumen ini mengutamakan CLI agar **Anda tidak mengklik 50 layar**.

---

## Satu hal wajib di **browser** setelah deploy (bukan AI)

**Midtrans Dashboard → Sandbox → Payment Notification URL** isi:

```text
https://<PROJECT_REF>.supabase.co/functions/v1/payment-webhook
```

Ganti `<PROJECT_REF>` dengan `PROJECT_REF` Anda. **Midtrans tidak punya CLI publik untuk ini** — ini termasuk 1%.

---

## Setelah itu: uji di browser (Anda klik — bukan “kerja integrasi”)

1. Buka URL production Vercel.
2. Checkout → Snap terbuka → bayar dengan kartu **sandbox** Midtrans (lihat dokumentasi Midtrans).
3. Cek email / Resend / tabel `licenses` di Supabase.

---

## Produksi Midtrans (nanti)

Anda ambil **kunci Production** di Midtrans → tempel ke `macfyi-local.env` → lalu **hanya**:

```bash
source /path/ke/macfyi-local.env
supabase secrets set MIDTRANS_SERVER_KEY="$MIDTRANS_SERVER_KEY"
supabase secrets set MIDTRANS_CLIENT_KEY="$MIDTRANS_CLIENT_KEY"
supabase secrets set MIDTRANS_IS_PRODUCTION=true
supabase functions deploy create-midtrans-snap --no-verify-jwt
supabase functions deploy payment-webhook --no-verify-jwt
```

Lalu di **Midtrans Production** set URL notifikasi **sama** seperti sandbox. Itu lagi-lagi **1% browser**.

---

## Ringkasan peran

| Pihak | Peran |
|--------|--------|
| **Anda** | Akun, OAuth sekali, salin kunci ke file env, DNS, satu field URL di Midtrans |
| **Terminal Cursor / perintah di repo** | Migrasi, secret, deploy function, uji curl, git push, vercel env + deploy |

Detail kode: `supabase/README.md`, `supabase/functions/`, `macfyi-landing-page/.env.example`.

---

*Jika Anda memakai Cursor Agent: tempel isi `macfyi-local.env` (tanpa commit) ke chat dan minta “jalankan blok Bagian 99% secara berurutan” — agent hanya bisa jalan jika `supabase`/`vercel` sudah terpasang dan Anda sudah `login`.*
