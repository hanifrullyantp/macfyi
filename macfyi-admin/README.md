# Macfyi Admin (konsol)

SPA React + Vite; halaman sumber sebagian besar dari [`../admin-web`](../admin-web).

## Deploy (disarankan): `admin.macfyi.com`

1. **Build lokal / CI:** `npm ci && npm run build` — output `dist/` dengan `base: /` (bukan di bawah `/admin`).
2. **Vercel:** buat proyek dengan **Root Directory** = `macfyi-admin`, **Build** = `npm run build`, **Output** = `dist`, **Environment** = `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
3. **Domain** → tambah `admin.macfyi.com` (DNS: CNAME ke `cname.vercel-dns.com` atau A sesuai Vercel).
4. **Supabase Auth** → *Authentication* → *URL configuration*: tambah `https://admin.macfyi.com` ke *Site URL* (atau *Redirect URLs* jika pakai flow redirect).

Lihat juga [`../docs/ADMIN_SUBDOMAIN.md`](../docs/ADMIN_SUBDOMAIN.md).

## Legacy: admin di bawah `macfyi.com/admin`

`VITE_USE_ADMIN_SUBPATH=1 npm run build` — menulis ke `macfyi-landing-page/dist/admin` dan memakai `base: /admin/`. Untuk alur lama `npm run build:all` di folder `macfyi-landing-page`.
