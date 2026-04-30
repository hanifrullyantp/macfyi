# `macfyi admin2` (path `/admin3`)

Ini **bukan** duplikasi kode: folder ini hanya memanggil build/dev [`../macfyi-admin`](../macfyi-admin) dengan **`VITE_ADMIN_PATH_SEGMENT=admin3`**, sehingga artefak masuk ke **`macfyi-landing-page/dist/admin3/`** dan base URL Vite menjadi **`/admin3/`**.

Nama folder memakai **spasi** (`macfyi admin2`). Di terminal gunakan tanda kutip atau escape:

```bash
cd "macfyi admin2"
# atau: cd macfyi\ admin2
```

Ini **beda** dari `macfyi-admin2` (strip); yang dipakai untuk workflow ini hanya folder **`macfyi admin2`**.

## Dev lokal

1. Terminal A: `cd macfyi-landing-page && npm run dev` (port 5173).
2. Terminal B: `cd "macfyi admin2" && npm run dev` → Vite admin di **5175**, proxy dari landing ke **`/admin3`**.

## Build untuk macfyi.com

Dari `macfyi-landing-page`: `npm run build` sudah menjalankan **`build:admin`** dan **`build:admin3`**. [`macfyi-landing-page/vercel.json`](../macfyi-landing-page/vercel.json) memuat rewrite `/admin3`.

## Supabase Auth

Tambahkan redirect: `https://macfyi.com/admin3` dan `https://macfyi.com/admin3/**`.
