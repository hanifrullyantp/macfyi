# Konsol admin: `/admin` di marketing + opsional `adm.macfyi.com`

## 1) Path `https://macfyi.com/admin` (default yang sama dengan marketing)

- Build landing (`macfyi-landing-page`) menjalankan **`npm run build`** = `vite build` lalu **`build:admin`**, sehingga artefak admin (`VITE_USE_ADMIN_SUBPATH=1`) tersalin ke **`dist/admin/`**.
- Vercel [`macfyi-landing-page/vercel.json`](../macfyi-landing-page/vercel.json) mem-**rewrite** `/admin`, `/admin/`, `/admin/*` ke **`/admin/index.html`** (SPA). Tanpa redirect keluar ke subdomain — Anda bisa **membuka dan melihat** `/admin` di domain marketing.
- Di UI landing, **Konsol admin** (tanpa `VITE_ADMIN_APP_URL`) membuka tab ke **`{origin}/admin/`** (situs yang sama).

Jika hanya butuh perubahan landing tanpa build admin: `npm run build:landing-only`.

## 2) Subdomain terpisah `https://adm.macfyi.com` (opsional)

Deploy proyek terpisah dengan **Root Directory** = [`macfyi-admin`](../macfyi-admin): `npm run build` bawaan memakai **`base: /`** → output `macfyi-admin/dist/`. Vercel: domain **`adm.macfyi.com`**, env `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.

- Untuk membuat tombol “Konsol admin” di landing membuka tab ke subdomain (bukan `/admin/`), set di build landing:  
  **`VITE_ADMIN_APP_URL=https://adm.macfyi.com`**

## Checklist

1. **Supabase Auth** — pastikan *Redirect URLs* memuat:
   - `https://macfyi.com/admin` dan `https://macfyi.com/admin/**` (path terpasang);
   - jika memakai subdomain: `https://adm.macfyi.com` dan `https://adm.macfyi.com/**`  
   (lihat [`supabase/config.toml`](../supabase/config.toml) dan `scripts/patch-supabase-auth-urls.sh`.)
2. **DNS** — rekam CNAME `adm` → Vercel hanya jika memakai host terpisah.

Lihat [`macfyi-admin/README.md`](../macfyi-admin/README.md) untuk rincian build.
