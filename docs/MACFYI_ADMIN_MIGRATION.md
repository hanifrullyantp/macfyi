# Macfyi Admin + Supabase

**Produksi (disarankan):** shell **`macfyi-admin`** di-host di **`https://admin.macfyi.com`** (build `base: /`, output `macfyi-admin/dist/`). Situs marketing mengarahkan `macfyi.com/admin` → subdomain tersebut. Rincian: [`ADMIN_SUBDOMAIN.md`](ADMIN_SUBDOMAIN.md).

**Legacy:** subpath `https://macfyi.com/admin` (Vite `VITE_USE_ADMIN_SUBPATH=1`, output `macfyi-landing-page/dist/admin/`).

`macfyi-admin` memakai autentikasi Supabase (JWT + `app_metadata.role === "admin"`) dan **mengimpor modul dari `admin-web`**.

## Build & deploy

- **Vite (default / subdomain):** `base: "/"`, `outDir`: **`macfyi-admin/dist`**. Dari `macfyi-admin`: `npm run build`.
- **Legacy nested di landing:** `VITE_USE_ADMIN_SUBPATH=1 npm run build` → `base: "/admin/"`, out ke `macfyi-landing-page/dist/admin/`. Atau dari `macfyi-landing-page`: `npm run build:admin` (lalu `build:all` = landing + admin nested).
- **Vercel marketing** (`macfyi-landing-page/vercel.json`): **redirect 308** `/admin` → `https://admin.macfyi.com` (bukan lagi SPA di path itu).
- **Vercel admin:** proyek terpisah, root `macfyi-admin`, output `dist`, domain `admin.macfyi.com` — lihat [`macfyi-admin/README.md`](../macfyi-admin/README.md).

## Supabase Auth (redirect)

Tambahkan ke **Redirect URLs** proyek (Dashboard → Authentication → URL Configuration) dan/atau `supabase/config.toml` + `supabase config push`:

- `https://admin.macfyi.com`
- `https://admin.macfyi.com/**`
- (opsional, transisi) `https://macfyi.com/admin`, `https://macfyi.com/admin/**`

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
