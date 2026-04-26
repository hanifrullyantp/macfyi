# Konsol admin di `admin.macfyi.com`

Konsol admin tidak lagi disajikan di path `/admin` pada domain marketing. Deployment default:

- **Aplikasi admin:** repositori [`macfyi-admin`](../macfyi-admin) → build Vite `base: /` → host di **`https://admin.macfyi.com`**.
- **Situs marketing (landing):** permintaan ke `https://macfyi.com/admin` dan `https://macfyi.com/admin/*` di-**redirect 308** ke `https://admin.macfyi.com` (lihat [`macfyi-landing-page/vercel.json`](../macfyi-landing-page/vercel.json)).
- **Tombol “Konsol admin”** di landing memakai `VITE_ADMIN_APP_URL` jika diset, selain itu **`https://admin.macfyi.com`**.

## Checklist setelah pindah subdomain

1. Vercel (atau host lain) untuk proyek `macfyi-admin`: set env `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
2. **Supabase Dashboard** → Authentication → URL: pastikan `https://admin.macfyi.com` diizinkan (Site URL / Redirect URLs sesuai kebutuhan OAuth/magic link).
3. Jika memakai **CORS** di Edge Function custom, tambahkan origin `https://admin.macfyi.com` bila perlu.
4. DNS: rekam `admin` → CNAME Vercel (atau A record yang diberikan panel).

## Legacy build (`/admin` di dalam satu bundle landing)

Hanya jika Anda masih butuh path nested:

```bash
cd macfyi-landing-page && npm run build:admin
# atau: VITE_USE_ADMIN_SUBPATH=1 npm run build
```

dari folder `macfyi-admin` — output ke `macfyi-landing-page/dist/admin`.
