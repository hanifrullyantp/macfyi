# Macfyi Admin (konsol)

SPA React + Vite; halaman sumber sebagian besar dari [`../admin-web`](../admin-web).

## Env: Vercel vs mesin lokal

Variabel `VITE_SUPABASE_*` yang Anda set **hanya di Vercel** dipakai saat **build/deploy di Vercel**. Untuk **`npm run dev`** di repo ini, Vite membaca **`macfyi-admin/.env.local`** (atau `.env`), **bukan** dashboard Vercel.

1. Salin [`.env.example`](./.env.example) → `.env.local` di folder **`macfyi-admin`**.
2. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` (nilai bisa sama seperti di Vercel).
3. Restart `npm run dev`.

Di Vercel, jangan lupa scope **Production + Preview**; untuk **Development** hanya berguna kalau Anda memakai alur tertentu (mis. CLI `vercel dev`) — tidak otomatis ke `vite` biasa di laptop.

## Deploy subdomain (opsional): `adm.macfyi.com`

1. **Build lokal / CI:** `npm ci && npm run build` — output `dist/` dengan `base: /` (bukan di bawah `/admin`). Jangan set `VITE_USE_ADMIN_SUBPATH` di deploy ini.
2. **Vercel (penting):** **Root Directory** harus **`macfyi-admin`** (folder yang memuat `package.json` ini), **bukan** root monorepo dan **bukan** folder `admin-web` lama. Tanpa itu, `npm install` tidak memasang `react` di tempat yang benar dan build bisa gagal dengan error **`react/jsx-runtime`**.
3. **Build** = `npm run build`, **Output** = `dist`, **Environment** = `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. [`vercel.json`](./vercel.json) menjalankan **`npm ci` di sini dan `npm ci --prefix ../admin-web`**, karena [`src/bridges/adminWebPages.ts`](./src/bridges/adminWebPages.ts) mengimpor dari **`admin-web`** — tanpa `node_modules` di `admin-web`, Rollup gagal memuat `@supabase/supabase-js` dan paket lain dari sumber itu.
4. **Domain** → **`adm.macfyi.com`** (CNAME / A sesuai Vercel).
5. **Supabase Auth** → *Redirect URLs*: `https://adm.macfyi.com` dan `https://adm.macfyi.com/**`

Lihat juga [`../docs/ADMIN_SUBDOMAIN.md`](../docs/ADMIN_SUBDOMAIN.md).

## Bersama landing: path `macfyi.com/admin`

Dari `macfyi-landing-page`, **`npm run build`** (default) sudah memanggil `build:admin` → output ke `macfyi-landing-page/dist/admin` dengan `VITE_USE_ADMIN_SUBPATH=1` (`base: /admin/`). Tanpa proyek subdomain, konsol tampil di path itu.

### Dev: landing + admin di `/admin`

1. Terminal A — `cd macfyi-landing-page && npm run dev` (biasanya `http://localhost:5173`).
2. **Pilih salah satu:**
   - **Live HMR:** Terminal B — `cd macfyi-admin && VITE_USE_ADMIN_SUBPATH=1 npm run dev` (port **5174**); landing mem-**proxy** `/admin` ke sini.
   - **Satu terminal:** dari `macfyi-landing-page` jalankan `npm run build:admin` sekali, lalu `npm run dev` — `/admin` dilayani dari `dist/admin` jika port 5174 tidak aktif.
