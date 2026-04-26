# Macfyi Admin (konsol)

SPA React + Vite; halaman sumber sebagian besar dari [`../admin-web`](../admin-web).

## Deploy subdomain (opsional): `adm.macfyi.com`

1. **Build lokal / CI:** `npm ci && npm run build` — output `dist/` dengan `base: /` (bukan di bawah `/admin`).
2. **Vercel:** proyek dengan **Root Directory** = `macfyi-admin`, **Build** = `npm run build`, **Output** = `dist`, **Environment** = `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
3. **Domain** → **`adm.macfyi.com`** (CNAME / A sesuai Vercel).
4. **Supabase Auth** → *Redirect URLs*: `https://adm.macfyi.com` dan `https://adm.macfyi.com/**`

Lihat juga [`../docs/ADMIN_SUBDOMAIN.md`](../docs/ADMIN_SUBDOMAIN.md).

## Bersama landing: path `macfyi.com/admin`

Dari `macfyi-landing-page`, **`npm run build`** (default) sudah memanggil `build:admin` → output ke `macfyi-landing-page/dist/admin` dengan `VITE_USE_ADMIN_SUBPATH=1` (`base: /admin/`). Tanpa proyek subdomain, konsol tampil di path itu.
