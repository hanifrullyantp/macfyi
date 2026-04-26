# Macfyi Admin + Supabase

**Produksi default:** path **`https://macfyi.com/admin`** — bundle dari `macfyi-landing-page` (`npm run build` termasuk `build:admin` → `dist/admin/`) + rewrite Vercel. **Opsional** host terpisah **`https://adm.macfyi.com`** (build `macfyi-admin` dengan `base: /`). Rincian: [`ADMIN_SUBDOMAIN.md`](ADMIN_SUBDOMAIN.md).

`macfyi-admin` memakai autentikasi Supabase (JWT + `app_metadata.role === "admin"`) dan **mengimpor modul dari `admin-web`**.

## Build & deploy

- **Bersama landing (path /admin):** dari `macfyi-landing-page`, **`npm run build`** = landing + `build:admin` (`VITE_USE_ADMIN_SUBPATH=1` → `macfyi-landing-page/dist/admin/`).
- **Hanya landing:** `npm run build:landing-only`.
- **Subdomain `adm.macfyi.com`:** dari `macfyi-admin`, **`npm run build`** (`base: /`, out `macfyi-admin/dist/`) + proyek Vercel terpisah.
- **Vercel marketing** (`vercel.json`): **rewrite** `/admin` → `admin/index.html` (bukan redirect keluar).

## Supabase Auth (redirect)

Tambahkan ke **Redirect URLs** (dan `supabase/config.toml` + `config push`):

- `https://macfyi.com/admin`, `https://macfyi.com/admin/**` (konsol di domain marketing)
- jika memakai subdomain: `https://adm.macfyi.com`, `https://adm.macfyi.com/**`

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
