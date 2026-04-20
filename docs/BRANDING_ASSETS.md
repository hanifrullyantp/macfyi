# Daftar file & titik branding yang bisa diubah

Dokumen ini merangkum **aset statis** (gambar, ikon) dan **konfigurasi teks/warna** yang memengaruhi tampilan merek Macfyi — aplikasi desktop (Tauri), onboarding, aktivasi, dan landing funnel.

---

## 1) Aplikasi desktop (`/` repo utama)

### 1.1 Ikon aplikasi (Dock, Finder, `.app`)

| Lokasi | Fungsi |
|--------|--------|
| [`src-tauri/icons/32x32.png`](../src-tauri/icons/32x32.png) | Ikon kecil (bundle) |
| [`src-tauri/icons/128x128.png`](../src-tauri/icons/128x128.png) | Ikon standar |
| [`src-tauri/icons/128x128@2x.png`](../src-tauri/icons/128x128@2x.png) | Retina |
| [`src-tauri/icons/icon.icns`](../src-tauri/icons/icon.icns) | **macOS** — ikon utama untuk app bundle |
| [`src-tauri/icons/icon.ico`](../src-tauri/icons/icon.ico) | Windows (jika dibuild) |
| [`src-tauri/icons/icon.png`](../src-tauri/icons/icon.png) | Sumber turunan CLI |

Daftar file yang dipakai Tauri ada di [`src-tauri/tauri.conf.json`](../src-tauri/tauri.conf.json) (`bundle.icon`).

**Cara mengganti (disarankan):** siapkan **satu PNG persegi** (mis. 1024×1024), lalu dari root repo:

```bash
npx tauri icon path/ke/logo-persegi.png
```

Ini menimpa banyak file di `src-tauri/icons/`. Setelah itu jalankan build ulang (`npm run tauri:build`).

### 1.2 Logo & gambar di dalam WebView (sidebar, splash, fallback aktivasi)

| Lokasi | Dipakai untuk |
|--------|----------------|
| [`public/macfyi-mark-square.png`](../public/macfyi-mark-square.png) | **Mark default** — sidebar, layar splash startup, aktivasi jika tidak ada URL dari server. Direferensikan lewat [`src/lib/defaultBrandLogo.ts`](../src/lib/defaultBrandLogo.ts). |
| [`public/macfyi-mark.png`](../public/macfyi-mark.png) | Salinan/varian (opsional; tidak wajib dipakai kode jika sudah memakai `macfyi-mark-square.png`). |
| [`public/brand-logo-default.png`](../public/brand-logo-default.png) | **Favicon & apple-touch-icon default** di [`index.html`](../index.html) sebelum `public-config` mengganti ikon tab. |

**Mengganti mark dalam app tanpa menyentuh kode:** timpa file di `public/` dengan nama **sama**, atau ubah path di `src/lib/defaultBrandLogo.ts` lalu rebuild frontend.

### 1.3 Onboarding (tur pertama kali / “user baru”)

| Lokasi | Fungsi |
|--------|--------|
| [`public/onboarding/slide-0.png`](../public/onboarding/slide-0.png) … **`slide-5.png`** | **Opsional.** Jika file ada, ditampilkan sebagai ilustrasi per slide; jika tidak ada atau gagal load, UI memakai ikon Lucide + gradien. Lihat [`src/components/OnboardingTour.tsx`](../src/components/OnboardingTour.tsx) (`slideImageSrc`). |

Urutan slide: 0 = sambutan, 1 = clean, 2 = performa, 3 = uninstall, 4 = AI, 5 = izin folder (sesuai urutan konten di komponen).

**Teks onboarding** bukan file gambar — ada di [`src/i18n/locales/en.ts`](../src/i18n/locales/en.ts) dan [`src/i18n/locales/id.ts`](../src/i18n/locales/id.ts) di bawah kunci `onboard.*`.

**Memaksa tur muncul lagi setelah mengganti konten:** naikkan `ONBOARDING_CONTENT_VERSION` di `OnboardingTour.tsx`, atau pengguna bisa memakai opsi di Settings (replay tour) yang memanggil `resetOnboardingCompletion()`.

### 1.4 Layar splash startup

Bukan file terpisah: memakai **`DEFAULT_BRAND_LOGO_URL`** (lihat §1.2). Teks fase ada di `boot.*` pada file i18n (`en.ts` / `id.ts`).

### 1.5 Judul jendela & metadata bundle

| File | Field |
|------|--------|
| [`src-tauri/tauri.conf.json`](../src-tauri/tauri.conf.json) | `productName`, `app.windows[].title`, `bundle.shortDescription`, `bundle.longDescription`, `bundle.copyright` |

### 1.6 Warna merek (bukan file gambar)

| File | Catatan |
|------|---------|
| [`src/index.css`](../src/index.css) | Variabel `:root` — `--color-brand`, `--color-brand-glow`, `--color-accent*`, latar (`--color-bg*`), dll. Mengubah ini mengganti “suasana” merah/aksen di seluruh UI. |

### 1.7 Logo dari server (override tanpa rebuild)

Setelah app hidup, **`public-config`** (Supabase) dapat mengirim `brand.logo_url` (HTTPS). Logo itu dipakai di sidebar dan bisa mengganti favicon di tab lewat [`src/lib/brandingHead.ts`](../src/lib/brandingHead.ts). Ini **tidak** mengganti ikon `.icns` di Dock — ikon Dock tetap dari build (§1.1).

---

## 2) Landing page (`macfyi-landing-page/`)

| Lokasi | Fungsi |
|--------|--------|
| [`macfyi-landing-page/public/brand-logo-default.png`](../macfyi-landing-page/public/brand-logo-default.png) | Default logo di konten / favicon lokal jika dipakai. |
| [`macfyi-landing-page/public/landing/`](../macfyi-landing-page/public/landing/) | Aset screenshot/detail marketing (path umum untuk gambar landing). |

**Logo yang tampil di situs** sering diatur lewat **konten JSON** (`settings.brandLogoUrl`) setelah admin mempublikasikan — bisa URL Storage atau path relatif. Default string ada di [`macfyi-landing-page/src/types/content.ts`](../macfyi-landing-page/src/types/content.ts) (`DEFAULT_SITE_SETTINGS.brandLogoUrl`).

---

## 3) Ringkasan “satu halaman” — apa yang diganti untuk apa

| Tujuan | Tindakan singkat |
|--------|-------------------|
| Ikon Dock / app macOS | `npx tauri icon <png-persegi>` lalu rebuild |
| Logo sidebar & splash & aktivasi default | Timpa `public/macfyi-mark-square.png` (atau ubah `defaultBrandLogo.ts`) |
| Favicon tab WebView sebelum server | `public/brand-logo-default.png` + [`index.html`](../index.html) |
| Banner/ilustrasi onboarding | Tambah `public/onboarding/slide-0.png` … `slide-5.png` |
| Judul & deskripsi app di Finder / installer | `tauri.conf.json` → `productName`, `bundle.*` |
| Palet warna UI | `src/index.css` → `--color-brand*` dll. |
| Logo dari marketing tanpa rilis app baru | Set `brand.logo_url` via landing + `public-config` (HTTPS) |

---

## 4) Rujukan tambahan

- Rilis & notarisasi macOS: [`docs/RELEASE_MACOS.md`](RELEASE_MACOS.md)
- Konteks produk & arsitektur: [`docs/MACFYI_REBUILD_PROMPT.md`](MACFYI_REBUILD_PROMPT.md)

Jika menambah file gambar baru dengan nama berbeda, pastikan path-nya direferensikan di kode atau di konten JSON yang dipublikasikan agar build Vite memuatnya dari `public/`.
