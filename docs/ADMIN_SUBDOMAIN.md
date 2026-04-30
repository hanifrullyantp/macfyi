# Konsol admin: `/admin` di marketing + opsional `adm.macfyi.com`

## 1) Path `https://macfyi.com/admin` (default yang sama dengan marketing)

- Build landing (`macfyi-landing-page`) menjalankan **`npm run build`** = `vite build` lalu **`build:admin`** dan **`build:admin3`**, sehingga artefak admin (`VITE_USE_ADMIN_SUBPATH=1`) tersalin ke **`dist/admin/`** dan **`dist/admin3/`** (segment `admin3` lewat [`macfyi-admin2`](../macfyi-admin2)).
- Vercel [`macfyi-landing-page/vercel.json`](../macfyi-landing-page/vercel.json) mem-**rewrite** `/admin` dan `/admin3` (masing-masing SPA) ke **`/admin/index.html`** dan **`/admin3/index.html`**.
- Di UI landing, **Konsol admin** (tanpa `VITE_ADMIN_CONSOLE_EXTERNAL_URL`) membuka tab ke **`{origin}/admin/`** (situs yang sama).

Jika hanya butuh perubahan landing tanpa build admin: `npm run build:landing-only`.

## 2) Subdomain terpisah `https://adm.macfyi.com` (opsional)

Deploy proyek terpisah dengan **Root Directory** = [`macfyi-admin`](../macfyi-admin) (bukan root repo, bukan [`admin-web`](../admin-web) kecuali Anda memang masih memelihara proyek lama itu). `npm run build` bawaan memakai **`base: /`** → output `macfyi-admin/dist/`. Vercel: domain **`adm.macfyi.com`**, env `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.

**Build Vercel gagal (`react/jsx-runtime` atau `@supabase/supabase-js`):** **Root Directory** harus `macfyi-admin`. Konsol juga mengimpor sumber dari [`admin-web`](../admin-web) lewat bridge; [`macfyi-admin/vercel.json`](../macfyi-admin/vercel.json) menjalankan **`npm ci --prefix ../admin-web`** agar `admin-web/node_modules` ada saat Rollup memproses file itu.

- Untuk membuat tombol “Konsol admin” di landing membuka tab ke subdomain (bukan `/admin/`), set di build landing:  
  **`VITE_ADMIN_CONSOLE_EXTERNAL_URL=https://adm.macfyi.com`**  
  (Variabel lama `VITE_ADMIN_APP_URL` tidak lagi dipakai untuk tombol konsol — hapus dari Vercel agar tidak memaksa tab ke subdomain.)

## Checklist

1. **Supabase Auth** — pastikan *Redirect URLs* memuat:
   - `https://macfyi.com/admin` dan `https://macfyi.com/admin/**` (path terpasang);
   - `https://macfyi.com/admin3` dan `https://macfyi.com/admin3/**` jika Anda memakai konsol kedua ([`macfyi-admin2`](../macfyi-admin2));
   - jika memakai subdomain: `https://adm.macfyi.com` dan `https://adm.macfyi.com/**`  
   (lihat [`supabase/config.toml`](../supabase/config.toml) dan `scripts/patch-supabase-auth-urls.sh`.)
2. **DNS** — rekam CNAME `adm` → Vercel hanya jika memakai host terpisah.

Lihat [`macfyi-admin/README.md`](../macfyi-admin/README.md) untuk rincian build.
