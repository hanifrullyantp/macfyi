# Monefyi

Aplikasi keuangan pribadi (PWA) — HTML + CSS + JavaScript, backend Supabase.

## Struktur

| File / folder | Isi |
|---------------|-----|
| `index.html` | Shell halaman, CDN library + referensi aset |
| `js/config.js` | **Sesuaikan di sini:** URL Supabase, anon key, checkout, admin, `basePath` |
| `js/app.js` | Logika aplikasi |
| `css/app.css` | Gaya antarmuka |
| `scripts/` | Utilitas one-off (`refactor.cjs`, template print) — tidak wajib di production |

## Menjalankan lokal

Buka lewat **HTTP** (bukan `file://`), agar service worker / fetch normal:

```bash
npm install
npm run dev
```

Lalu buka `http://localhost:5173`.

Alternatif tanpa Vite:

```bash
npx --yes serve . -p 5173
```

## Deploy & `basePath`

- `link rel="manifest"` dan ikon kini memakai path relatif (`./manifest.webmanifest`, `./icons/...`) agar lebih aman saat deploy di subfolder.
- Jika deploy di **subfolder** (mis. `https://domain.com/monefyi/`):
  1. Set `basePath: "/monefyi"` di `js/config.js` (tanpa slash di akhir).
  2. Service worker akan terdaftar di `/monefyi/sw.js`.
  3. Jika ada aset lain yang masih absolut (`/...`), ubah ke relatif atau prefiks dengan subfolder.

## Keamanan Supabase

- **Anon key** di klien adalah pola normal; yang melindungi data adalah **Row Level Security (RLS)** di setiap tabel.
- Jangan pernah memasukkan **service_role** ke file yang di-serve ke browser.

## Subresource Integrity (SRI)

Script CDN di `index.html` memakai `integrity="sha384-..."`. Jika jsDelivr memperbarui file di tag versi mengambang (`@2`, `@5`), browser bisa menolak load — **pin versi** di URL atau perbarui hash:

```bash
curl -fsSL 'URL_CDN' | openssl dgst -sha384 -binary | openssl base64 -A
```

## Checkout

URL default checkout memakai **HTTPS** (`https://lynk.id/...`), bisa diubah di `js/config.js`.

## Opsional: bundler (Vite)

Saat ini tidak wajib. Untuk modularisasi lebih lanjut (banyak file + tree-shaking), Anda bisa memindahkan `js/app.js` ke proyek Vite/Rollup; `scripts/refactor.cjs` hanya dipakai sekali saat migrasi awal.

## Mengulangi ekstraksi (jarang perlu)

Jika Anda menyalin `index.html` monolit lama lagi dan ingin menjalankan pipeline yang sama:

```bash
node scripts/refactor.cjs
```

Pastikan isi `index.html` masih memuat pola lama yang skrip ini harapkan (lihat sumber `scripts/refactor.cjs`).
