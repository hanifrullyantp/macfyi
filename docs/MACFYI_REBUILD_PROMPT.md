# Macfyi — A-to-Z Rebuild Prompt (Product, Landing, Payments, Backend)

Dokumen ini sengaja ditulis sebagai **“single prompt”** untuk membangun ulang Macfyi dari nol: arsitektur, fitur, alur user, data model, pembayaran, demo funnel, dan operasional.

> Target pembaca: engineer/AI agent yang akan membangun ulang.  
> Target hasil: bisa menghasilkan ulang repo yang fungsional (desktop app + landing funnel + Supabase backend + admin/member web).

---

## 1) One-liner & positioning

**Macfyi** adalah utility macOS (desktop, Tauri) untuk **membuat storage jadi jelas dan aman**: memetakan penyebab storage penuh, memberi rekomendasi cleanup dengan label risiko, uninstall rapi (termasuk residu Library), mengelola Trash, dan menyediakan asisten AI **privacy-first** (local/offline bila memungkinkan).

**Core promise:** “Storage lega tanpa takut salah hapus.”

---

## 2) Repo structure (monorepo)

Root: `macfyi/`

- **Desktop app (Tauri 2 + React/Vite/Tailwind)**: `src/`, `src-tauri/`
- **Landing page funnel (Vite SPA)**: `macfyi-landing-page/`
- **Admin web (browser)**: `admin-web/`
- **Member web (browser)**: `member-web/`
- **Supabase backend** (migrations + Edge Functions): `supabase/`
- **Docs**: `docs/`
- **Scripts ops/setup**: `scripts/`

Docs utama yang sudah ada:
- Setup stack: [`SETUP-GUIDE.md`](../SETUP-GUIDE.md)
- Integrasi step-by-step: [`docs/TUTORIAL_INTEGRASI_STACK.md`](TUTORIAL_INTEGRASI_STACK.md)
- Ecosystem marketing: [`docs/MARKETING_ECOSYSTEM.md`](MARKETING_ECOSYSTEM.md)
- Rilis macOS: [`docs/RELEASE_MACOS.md`](RELEASE_MACOS.md)

---

## 3) Produk desktop (macOS app)

### 3.1 Tech stack

- UI: React + Vite + Tailwind
- Shell: Tauri 2 (Rust)
- Animations: Framer Motion (UI)
- Backend bridge: `@tauri-apps/api` + commands di Rust

Entrypoints utama:
- UI root: [`src/App.tsx`](../src/App.tsx)
- Shell/layout: [`src/components/AppShell.tsx`](../src/components/AppShell.tsx)
- Backend adapter (invoke wrappers): [`src/lib/backend.ts`](../src/lib/backend.ts)
- Rust commands: folder `src-tauri/src/commands/` (whitelist roots, heuristics, move-to-Trash, disk stats)
- **Disk Explorer** (folder-level browser + volume + export): Rust [`src-tauri/src/commands/disk_explorer.rs`](../src-tauri/src/commands/disk_explorer.rs); UI [`src/components/DiskExplorer/`](../src/components/DiskExplorer/); state [`src/store/diskExplorerStore.tsx`](../src/store/diskExplorerStore.tsx); AI helper [`src/lib/aiDiskAnalyzer.ts`](../src/lib/aiDiskAnalyzer.ts); types [`src/lib/types/diskExplorer.ts`](../src/lib/types/diskExplorer.ts). Dari Smart Care dashboard, kartu modul membuka fitur `disk-explorer`. **Wawasan folder (AI)** dibuka lewat modal agar tabel memakai lebar penuh; strip status global menjelaskan pekerjaan latar saat memuat.
- **Cold start UX**: layar splash dengan progres + teks fase sampai disk stats dan `public-config` selesai (lihat §15).

### 3.2 Prinsip safety (wajib dipertahankan)

- **Scan dibatasi** pada safe roots (di bawah home user) dan area yang aman (mis. cache, downloads).
- Tidak melakukan destructive delete langsung; workflow standar: **review → move to Trash**.
- Privasi: AI tidak boleh menampilkan atau mengirim full path; gunakan redaction.

### 3.3 Modul/fitur utama (ringkas tapi lengkap)

1. **Storage map / breakdown**  
   - Menunjukkan kategori yang memakan ruang (cache, large files, backups, dsb).
2. **Safe cleanup**  
   - Rekomendasi pembersihan; label risiko (safe/caution/risky).
3. **Uninstaller**  
   - Uninstall app + bereskan residu terkait (Library paths).
4. **Trash management**  
   - Lihat isi Trash, purge/restore via OS.
5. **Monitor & performance**  
   - Disk stats, RAM/perf ringkas, “maintenance” ringan (tanpa overclaim).
6. **Disk Explorer**  
   - Telusuri isi folder **satu level** per navigasi; ukuran agregat per entri, label jenis & risiko, daftar file terbesar di folder, ekspor laporan (JSON/txt) ke Downloads.  
   - **Tidak ada hapus permanen** dari UI modul ini: pemindahan ke **Trash** saja (mis. via `move_paths_to_trash` / perintah setara), dengan konfirmasi ekstra untuk item **Caution/Risky**.  
   - **Full Disk Access** (FDA): banner + buka System Settings bila perlu; beberapa path sistem tidak terbaca tanpa FDA.  
   - **AI insight folder**: ringkasan **hanya dengan path yang disamarkan**; alur `ai_generate` + stream token, fallback template KB (`kbAnswer`) bila model off / error / timeout (lihat [`src/lib/aiDiskAnalyzer.ts`](../src/lib/aiDiskAnalyzer.ts)).
7. **AI assistant (privacy-first, optional offline)**  
   - Menjelaskan temuan scan, memberi saran aman, tidak mengeksekusi delete.

### 3.4 Local AI assistant (offline)

Tujuan: memberi jawaban cepat di device, tanpa cloud.

- Runtime: `llama.cpp` sidecar `llama-server` dibundle di `src-tauri/resources/llama/`.
- Katalog model: `src-tauri/resources/models.json` (default Lite 3B Q4; opsional Better 7B Q4).
- Lokasi model user: `~/Library/Application Support/macfyi/models/`.
- On-demand load: load saat panel AI dibuka/ada prompt; auto-unload saat idle.
- Fallback: bila model tidak ada/AI dimatikan/memory pressure: gunakan KB “Quick Answer”.

Lihat detail di README root: [`README.md`](../README.md) bagian “Local AI Assistant”.

---

## 4) Backend: Supabase (DB + Auth + Edge Functions)

### 4.1 Data model (Postgres)

Tabel-tabel inti (nama mengikuti migrasi di `supabase/migrations/`):

- `app_settings` — **single row** `id='default'`
  - pricing: `lifetime_price_idr`, `config_version`, `download_base_url`, `checkout_success_base_url`, dll
  - promo: `promo_plan` (jsonb), `promo_slots_remaining` (int), `promo_updated_at`
- `licenses`
  - menyimpan `license_key_hash` (hashed), `email`, `price_paid_idr`, `status`
- `activations`
  - 1 device per license (`unique(license_id)`), `device_fingerprint`
- `payment_transactions` (checkout order rows)
- `payment_events` (idempotency per event notifikasi)
- `promo_slot_decrement_log` (idempotency decrement slot per `order_id`)
- `landing_site_content` (JSON konten landing, `id='default'`)
- CRM/affiliate/member (ringkas):
  - `profiles`, `crm_contacts`, `crm_events`, `affiliates`, withdrawal tables, dsb (lihat `SETUP-GUIDE.md`)
- `platform_settings` (key-value toggles, jsonb)

### 4.2 Auth & RLS

Admin ditentukan oleh Supabase Auth `app_metadata.role = "admin"`.  
RLS policies dibuat via migrasi (mis. `20250412130100_admin_rls_policies.sql`).

### 4.3 Edge Functions (ringkas per fungsi)

Folder: `supabase/functions/`

- `public-config` (GET, no secrets)  
  - sumber “konfigurasi publik” untuk landing+app: `pricing.lifetime_price_idr`, demo rules, SEO ids, dsb  
  - juga memuat `promo` (ends_at, compare_at_idr, slots_display, dsb)
- `create-midtrans-snap` (POST)  
  - membuat Snap token Midtrans untuk checkout; gross_amount harus memakai harga efektif (promo resolver)
  - bisa memblok checkout jika slot 0 dan flag aktif
- `payment-webhook` (POST)  
  - Midtrans HTTP notification; verifikasi signature SHA512; update transaksi; issue license; email via SMTP
  - decrement `promo_slots_remaining` idempotent via `promo_slot_decrement_log`
- `activate-license` (POST)  
  - desktop app aktivasi lisensi untuk device fingerprint; hasilkan token/sesi
- `demo-request`, `demo-verify`, `demo-download-verify`  
  - demo funnel: token, rules snapshot, halaman download
- `track-event`  
  - analytics batch + CRM events + referral attribution
- `client-telemetry`  
  - error reports / telemetry whitelist (butuh consent)
- `scheduled-ops`  
  - cron job: konfirmasi komisi, tier upgrades, lifecycle ops
- `submit-withdrawal`, `admin-withdrawal`  
  - member withdrawal request + admin approval
- `_shared/`  
  - util bersama, termasuk resolver promo: `promoPlan.ts`

Referensi detail: [`supabase/README.md`](../supabase/README.md)

---

## 5) Payments (Midtrans Snap) — flow end-to-end

**Tujuan:** user checkout lifetime license (1 device), bayar via Midtrans, dapat license key via email, lalu aktivasi di app.

### 5.1 Checkout di landing

- Di landing (`macfyi-landing-page`), tombol checkout membuka modal form.
- Jika env Supabase tersedia (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), checkout menggunakan Midtrans Snap via Edge `create-midtrans-snap`.
- Jika tidak, fallback ke `settings.checkoutUrl` atau CTA kontak.

### 5.2 Midtrans → Webhook → License issuance

1. `create-midtrans-snap` membuat `payment_transactions` row + Snap token.
2. Midtrans memanggil `payment-webhook` (Notification URL).
3. `payment-webhook` memverifikasi signature, menandai transaksi paid, insert ke `licenses`.
4. Email transaksional dikirim (SMTP) berisi license key plain (sekali) + link download DMG.

### 5.3 Promo plan (harga + slot + countdown)

Harga efektif dan slot/coundown berasal dari `app_settings.promo_plan` + `promo_slots_remaining`, di-resolve server lewat util `_shared/promoPlan.ts`, lalu diekspos lewat `public-config`:

- landing: menampilkan compare-at, slot, countdown (server time)
- checkout Snap: gross_amount mengikuti harga promo aktif
- webhook: decrement slot jika counter diisi

Dokumen deploy promo: [`docs/PROMO_PLAN_DEPLOY.md`](PROMO_PLAN_DEPLOY.md)

---

## 6) Landing page (marketing funnel)

Project: `macfyi-landing-page/` (Vite SPA)

### 6.1 Fitur landing

- Hero + sections (problem, solution, features, pricing, scarcity, FAQ, footer)
- Inline editing (admin only) untuk konten landing:
  - login admin via Supabase Auth role admin (atau legacy local)
  - publish menyimpan JSON ke `landing_site_content`
- Checkout modal (form)
- Demo request modal
- Social proof toast + notification banner
- Scarcity section + promo plan dari server (slot & countdown)

### 6.2 Entry files

- mount router: `macfyi-landing-page/src/main.tsx`
- app: `macfyi-landing-page/src/App.tsx` (komponen `LandingApp`)

### 6.3 Animations & UX

Framer Motion dipakai untuk animasi ringan (hero, scarcity, etc.).  
Contoh animasi impact hero: `StorageImpactAnimation` di `macfyi-landing-page/src/components/StorageImpactAnimation.tsx`.

### 6.4 Config & env (landing)

`macfyi-landing-page/.env.example` menjelaskan:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- opsional tracking flags

---

## 7) Admin web (browser)

Project: `admin-web/`

Tujuan:
- manage `app_settings`, view `licenses`, `activations`, AI provider secrets
- admin login via Supabase Auth user yang punya `app_metadata.role = "admin"`

Referensi: [`admin-web/README.md`](../admin-web/README.md)

---

## 8) Member web (browser)

Project: `member-web/`

Tujuan:
- member dashboard: affiliate signup, referral stats, withdrawal requests, dsb
- menggunakan Supabase Auth standard user

Detail implementasi tergantung modul affiliate/CRM yang sudah ada di repo (lihat `SETUP-GUIDE.md`).

---

## 9) Marketing funnel: demo → pro

High-level funnel:

1. Landing CTA “Coba Gratis” → Edge `demo-request` → redirect ke `/download?token=...`
2. Download page memvalidasi token (`demo-download-verify`) dan menampilkan DMG link + deep link demo `macfyi://...`
3. Desktop app memverifikasi token (`demo-verify`) dan menerapkan demo rules snapshot
4. Upgrade/checkout → Midtrans Snap → license issuance → activation

Referensi: [`docs/MARKETING_ECOSYSTEM.md`](MARKETING_ECOSYSTEM.md)

---

## 10) Configuration (env/secrets) — satu tempat

### 10.1 Local dev env (contoh)

Gunakan `macfyi-local.env` (jangan commit). Contoh ada di [`docs/TUTORIAL_INTEGRASI_STACK.md`](TUTORIAL_INTEGRASI_STACK.md).

### 10.2 Supabase secrets (Edge)

Wajib untuk payments/email:
- `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

Opsional:
- `OPS_ALERT_EMAIL` (alert penarikan)
- `CRON_SECRET` (scheduled-ops)

### 10.3 Midtrans dashboard

Set Notification URL:

`https://<project-ref>.supabase.co/functions/v1/payment-webhook`

---

## 11) Build, release, deploy

### 11.1 Desktop (Tauri)

- Dev: `npm run tauri:dev` (native window)
- Preview browser-only (UI only): `npm run dev`
- Build: `npm run tauri:build` (bundles `.app`)
- DMG optional: `npm run tauri:build:dmg`

Signing & notarization: [`docs/RELEASE_MACOS.md`](RELEASE_MACOS.md)

### 11.2 Landing (Vercel)

Build output: `macfyi-landing-page/dist` (single-file via vite-plugin-singlefile).  
Set env `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` at build time.

### 11.3 Supabase

- `supabase db push`
- deploy functions (`supabase functions deploy ... --no-verify-jwt`)

---

## 12) Non-goals (agar tidak overclaim saat rebuild)

- Macfyi bukan antivirus dan tidak mengklaim “100% aman/sempurna”.
- AI assistant tidak mengeksekusi tindakan delete; hanya memberi saran/penjelasan (termasuk insight Disk Explorer: tidak memicu hapus permanen).
- Landing SPA bukan full backend checkout; backend payments ada di Supabase Edge.

---

## 13) Rebuild checklist (acceptance)

### Core flows

- Landing:
  - buka halaman → sections render
  - admin login → inline edit → publish ke `landing_site_content`
  - pricing mengambil harga dari `public-config`
  - promo slot/countdown tampil dan sinkron (server time)
- Payments:
  - create snap token (sandbox) → Midtrans bayar → webhook issue license → email terkirim
  - slot decrement idempotent per order
- Desktop:
  - scan safe roots → review → move to Trash
  - Disk Explorer: scan satu level, breadcrumbs, volume bar, FDA hint, export laporan, Trash dengan konfirmasi; AI folder redacted + fallback KB
  - activation license via `activate-license`
  - local AI: download model → load/unload → fallback KB + redaction paths

### Security basics

- RLS admin: hanya admin dapat update `app_settings` dan publish landing
- payment-webhook memverifikasi signature Midtrans
- license key disimpan hashed; plain hanya via email sekali

---

## 15) Kelemahan produk (audit singkat) & rekomendasi perbaikan

Bagian ini merangkum titik lemah yang masih sering dirasakan pengguna pada implementasi saat ini, dan arah perbaikan yang realistis.

### Kelemahan / risiko

1. **Waktu mulai (cold start)** — UI besar + beberapa fetch paralel (disk, `public-config`, modul lazy) membuat kesan “lama” sebelum layar utama siap; tanpa umpan balik, pengguna mengira aplikasi macet.
2. **Kurangnya konteks saat memuat** — Operasi berat (pindaian, memuat Trash, Uninstaller, Disk Explorer) sering hanya ditandai dengan spinner generik; sulit membedakan “normal lambat” vs “error diam-diam”.
3. **Fragmentasi AI di Disk Explorer** — Panel wawasan AI di samping tabel memotong lebar konten; pengguna tidak selalu memahami bahwa itu bagian dari asisten yang sama di header.
4. **Dependensi jaringan opsional** — `public-config` gagal tidak fatal, tetapi harga/logo bisa kosong dan tidak selalu jelas bagi pengguna offline.
5. **Model AI lokal** — Unduhan model besar + `llama-server` menambah ukuran bundle dan kompleksitas; pada RAM terbatas, pengalaman bisa menurun drastis bila tidak ada fallback yang konsisten.
6. **macOS privacy (TCC / FDA)** — Beberapa path tidak terbaca tanpa Full Disk Access; tanpa penjelasan kontekstual yang berulang, pengguna menganggap bug.
7. **StrictMode & efek ganda** — Pengembangan dengan React StrictMode dapat memicu efek dua kali; alur async harus selalu idempotent dan dibatalkan dengan benar di cleanup.

### Rekomendasi

1. **Layar awal (splash) terstruktur** — Satu layar penuh dengan logo, **bar kemajuan**, dan **teks fase** (mis. disk → konfigurasi server → UI) hingga data minimal siap; durasi minimum singkat agar tidak berkedip.
2. **Strip status global** — Satu area di bagian bawah yang menampilkan **satu kalimat bahasa alami** untuk pekerjaan latar (memindai, memuat folder, ringkasan AI, dll.), dengan `aria-live` untuk aksesibilitas.
3. **Disk Explorer + AI** — Satu kolom penuh untuk tabel; **wawasan AI** dibuka lewat tombol/modal dengan tips sekali lihat agar pengguna tahu di mana mendapatkan ringkasan lengkap dan bahwa privasi path tetap dijaga.
4. **Ikon & merek** — Satu sumber gambar persegi untuk `npx tauri icon` (ikon Dock `.icns`) dan aset `public/` untuk logo di dalam aplikasi; dokumentasikan perintah generate ikon di `docs/RELEASE_MACOS.md` atau README.
5. **Profil performa** — Ukur cold start nyata (Instruments / log timestamp); pertimbangkan menunda prefetch Smart Care sampai setelah interaksi pertama jika perlu.
6. **Offline-first copy** — Jika `public-config` gagal, tampilkan salinan singkat “menggunakan pengaturan lokal” alih-alih diam.
7. **Uji otomatis** — Vitest untuk util murni; setidaknya satu tes integrasi ringan untuk resolver aktivitas / redaksi path.

---

## 14) Minimal prompt template (copy/paste untuk rebuild)

Gunakan blok berikut sebagai prompt untuk AI agent yang akan membangun ulang:

1. Bangun monorepo dengan subprojects: desktop (Tauri 2 + React/Vite/Tailwind), landing (Vite SPA), admin-web, member-web, supabase (migrations + edge functions).
2. Implement desktop feature modules: scan safe roots, cleanup to Trash (review-first), uninstaller, trash manager, performance monitor, **Disk Explorer** (one-level folder scan, risk labels, Trash-only moves, redacted AI folder insight + KB fallback, FDA banner), local AI assistant with privacy-first redaction and fallback.
3. Implement Supabase DB tables and RLS: app_settings, licenses, activations, payment_transactions, payment_events, landing_site_content, platform_settings + affiliate/CRM if included.
4. Implement Edge Functions: public-config, create-midtrans-snap, payment-webhook, activate-license, demo-request/verify/download-verify, track-event, scheduled-ops, withdrawals.
5. Implement landing funnel: hero, problem/solution/features, pricing (free vs lifetime), scarcity section, checkout modal (midtrans), admin inline edit/publish, promo plan scheduling with slot decrement.
6. Provide env/secrets documentation and deploy steps.

**Constraints:**

- Respect macOS safety; no scanning system paths beyond safe whitelist.
- Payment webhook signature verification and idempotency.
- Prefer GPU-friendly animations; respect prefers-reduced-motion.
- No overclaims; privacy-first AI.

