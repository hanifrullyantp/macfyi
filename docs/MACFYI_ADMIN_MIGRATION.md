# Macfyi Admin di `/admin` + Supabase

Ringkasan implementasi: **`macfyi-admin`** menjadi shell admin produksi di **`https://macfyi.com/admin`**, dengan autentikasi Supabase (JWT + `app_metadata.role === "admin"`), dan halaman data yang **mengimpor modul dari `admin-web`** (satu sumber logika query/mutasi seperti sebelumnya).

## Build & deploy

- **Vite**: `base: "/admin/"`, output build ke **`macfyi-landing-page/dist/admin/`** (artefak SPA untuk subpath `/admin`).
- **Landing `npm run build`**: menjalankan `vite build` lalu **`build:admin`** (`npm ci` + `npm run build` di `../macfyi-admin`). Pastikan **`macfyi-admin/package-lock.json`** selaras dengan `package.json` (setelah mengubah dependensi, jalankan `npm install` di folder `macfyi-admin`).
- **Vercel** (`macfyi-landing-page/vercel.json`): rewrite `/admin`, `/admin/`, `/admin/:path*` → `/admin/index.html` agar SPA berjalan.

## Supabase Auth (redirect)

Tambahkan ke **Redirect URLs** proyek (Dashboard → Authentication → URL Configuration) dan/atau `supabase/config.toml` + `supabase config push`:

- `https://macfyi.com/admin`
- `https://macfyi.com/admin/**`

Skrip **`scripts/patch-supabase-auth-urls.sh`** memuat entri yang sama pada `uri_allow_list` bila Anda memakai Management API.

## CRM pipeline (satu sumber kebenaran)

Stage di Postgres, Edge Function **`track-event`**, **`demo-request`**, dan UI **`admin-web` CrmBoard** diselaraskan ke nilai: **`lead`**, **`contacted`**, **`demo`**, **`trial`**, **`customer`**, **`churned`** (sesuai migrasi pipeline).

## Batasan & perilaku

1. **Log Edge / metrik detail**: dari browser tidak tersetel penuh; halaman Edge mengikuti pola admin-web (health/list). Log dan metrik mendalam ada di **Supabase Dashboard**.
2. **Manajemen user Auth lanjutan** (invite massal, reset password pengguna lain, dll.): sering membutuhkan **Dashboard** atau **service role** server-side. Halaman **Admin Users** tetap terbatas oleh API yang tersedia untuk kunci anon + JWT admin — dokumentasikan di UI bila perlu.
3. **Editor landing di `macfyi-admin` (mock lama)**: setelah wiring, sumber kebenaran bentuk konten adalah **JSON `landing_site_content.content`** seperti di **`admin-web` LandingEditorPage**. UI section fiktif di `macfyi-admin/src/views/*` tidak dipakai untuk produksi; tampilan aktif lewat bridge ke **`admin-web`**.
4. **`admin-web` / subdomain admin lama**: setelah parity, boleh dinyatakan deprecated; hindari duplikasi fitur.
5. **Keamanan**: jangan menyimpan **service role** di frontend; hanya **anon key** + sesi pengguna admin.

## Lingkungan lokal

Variabel yang sama seperti admin-web:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Lihat **`macfyi-admin/.env.example`** (jika ada) atau salin dari `admin-web`.

## Catatan disk / CI

Jika `npm ci` di pipeline landing gagal karena lockfile belum di-commit setelah mengubah `macfyi-admin/package.json`, jalankan **`npm install`** di `macfyi-admin` pada mesin dengan ruang disk cukup, lalu commit **`package-lock.json`**.

## Deploy function setelah perubahan CRM

Setelah mengubah Edge CRM terkait, deploy ulang misalnya:

`supabase functions deploy track-event --no-verify-jwt`

(sesuaikan dengan kebijakan JWT function Anda).
