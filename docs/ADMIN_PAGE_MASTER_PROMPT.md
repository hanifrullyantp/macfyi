# Master prompt: **GENERATE UI + rebuild `admin.macfyi.com`** (Admin Web MacFYI)

Dokumen ini adalah **PROMPT PRODUKSI** untuk agent AI agar **benar-benar membuat halaman admin dengan UI** (bukan jawaban konseptual/blank). Prompt ini memaksa agent:

- Menulis **kode nyata** di repo `admin-web/` (React + Vite + TS + Tailwind)
- Menghasilkan **UI modern, nyaman, informatif, interaktif**
- Mengikat halaman ke **Supabase** sesuai kontrak yang sudah ada (tanpa skema paralel)
- Menjamin deploy `https://admin.macfyi.com` **tidak 404 saat refresh route**

Jika sebelumnya hasil “blank putih”, biasanya karena: agent tidak menulis file, routing tidak benar, atau hosting tidak rewrite SPA. Prompt ini mengunci deliverable agar itu tidak terjadi.

---

## 0) Keluaran wajib (anti “blank putih”)

Agent HARUS memenuhi semua poin ini. Jika salah satu gagal, tugas dianggap belum selesai.

1. **Menulis file nyata** (bukan pseudo-code). Minimal:
   - `admin-web/src/main.tsx`
   - `admin-web/src/App.tsx`
   - layout shell (sidebar + topbar)
   - minimal 6 halaman: **Dashboard**, **Analytics**, **Licenses**, **Transactions**, **Landing Editor**, **Platform Settings**
2. **Tidak boleh ada halaman kosong**:
   - setiap route wajib render `h1` + minimal 1 `Card`/tabel
   - wajib ada state: loading, empty, error (best-effort kalau tabel/RLS tidak tersedia)
3. **Build hijau**: jalankan `npm run build` di `admin-web/` dan pastikan sukses.
4. **Deep link & refresh tidak 404**:
   - `admin-web/vercel.json` rewrites semua path → `/index.html`
   - `admin-web/public/_redirects` fallback `/* /index.html 200`
5. **Auth admin wajib**:
   - jika belum login → tampilkan login screen
   - jika bukan admin → block + tombol sign out
6. **Tidak menyimpan secret** di client. Hanya pakai:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

---

## 1) Brief khusus domain: **`admin.macfyi.com`** (wajib dipenuhi agent)

| Item | Requirement |
|------|-------------|
| **Origin** | App di-serve dari `https://admin.macfyi.com` (atau staging eksplisit); jangan hardcode origin lain di logika auth. |
| **Stack target** | React + Vite + TypeScript + React Router + TanStack Query + Supabase JS v2 + Tailwind. |
| **Auth** | Supabase Auth; user wajib `app_metadata.role === "admin"`; gate sebelum shell admin. |
| **Routing** | Path Inggris: `/dashboard`, `/analytics`, `/licenses`, `/transactions`, `/promo-pricing`, `/affiliates`, `/withdrawals`, `/crm`, `/landing`, `/app-settings`, `/marketing`, `/platform`, `/edge-functions`, `/logs`, `/admin-users`, `/events`, `/announcements`, `/wa-templates`, `/live`. |
| **Deep link & refresh** | Hosting wajib rewrite SPA ke `index.html` untuk semua non-asset. |
| **Env build** | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; opsional `VITE_LANDING_PREVIEW_URL`. |
| **Bundle / navigasi** | Prioritas reliabilitas: hindari blank akibat chunk 404. Jika ragu, gunakan import statis untuk halaman admin. |

---

## 2) Aturan integrasi data (kontrak Supabase)

**Satu sumber kebenaran per domain data** (wajib):

1. **Landing content** → `landing_site_content` (row `id = "default"`, JSON `content`)
2. **Promo/kupon/harga global** → `app_settings` (row `id = "default"`) termasuk:
   - `promo_plan` (JSON)
   - `promo_slots_remaining` (number/null)
   - `checkout_coupons` (JSON)
   - `lifetime_price_idr`
   - `config_version`
3. **Platform settings** → `platform_settings` (key/value JSON):
   - prefix `demo.*`, `ai.*`, `marketing.*`, `seo.*`, `desktop.*`, `checkout.*`
4. **Setiap perubahan yang mempengaruhi klien** (desktop/landing) wajib bump:
   - `app_settings.config_version = config_version + 1`
5. **Commerce & ops** (admin-only):
   - `licenses`, `activations`
   - `payment_transactions`, `payment_events`
   - `affiliates`, `commissions`, `withdrawal_requests`
   - `crm_contacts`, `crm_events`
   - `client_telemetry` (best-effort; UI harus graceful bila tabel tidak ada)

**Konflik LP vs admin panel** (wajib):

- Writer konten LP hanya ke `landing_site_content`.
- `content._admin` hanya metadata layout/visibility:
  - `content._admin.sectionOrder`
  - `content._admin.hiddenSections`
- Admin inline/popup di LP (jika ada) **tidak boleh** menulis ke skema paralel yang menimpa konfigurasi.

---

## 3) Target UI/UX (wajib: nyaman + informatif + interaktif)

Agent wajib menerapkan:

### Shell
- Sidebar grouped + icons + active state
- Topbar: breadcrumb + search (debounced) + user menu
- Status bar: indikator koneksi/query activity (ringan)
- Route error boundary + empty/error states yang jelas

### Dashboard (WAJIB)
- KPI cards:
  - Paid sum (30d; status `paid`/`settlement`)
  - Licenses count (14d)
  - Withdrawals pending (count + sum)
  - CRM contacts count
- Charts (Recharts):
  - Revenue line chart 30d
  - Licenses bar chart 14d
  - Provider donut (bucket `payment_transactions.provider`), hide jika tidak ada data
- Tombol Refresh (invalidate query)
- Skeleton loading untuk KPI saat isLoading

### Pages list (WAJIB)
- Licenses: list + filter email + pagination + drawer detail (activation + tx + events best-effort)
- Transactions: list + filter status/date + export CSV + export JSON + drawer snapshot + events best-effort
- Affiliates: KPI row + list program + withdrawals (approve via Edge bila perlu)
- CRM: contacts + tab “Recent events”
- Analytics: series 14d telemetry + crm_events (best-effort)

### Landing Editor (WAJIB)
- Drag & drop order: `content._admin.sectionOrder`
- Toggle hidden per section: `content._admin.hiddenSections`
- Draft lokal: `localStorage` (save/clear/merge)
- Preview: iframe + tombol open in new tab jika `VITE_LANDING_PREVIEW_URL` ada

### Platform Settings (WAJIB)
- Grouping by prefix + per-key hints
- Edit value sebagai JSON string, validasi parse sebelum save
- Save key bump `config_version`

---

## 4) Pola implementasi (wajib dipakai)

- **TanStack Query** untuk semua read/write
  - queryKey stabil: `["licenses", ...]`, `["transactions", ...]`, `["landing_site_content", "default"]`, dst.
  - mutasi sukses → invalidate queryKey yang relevan
- **Best-effort**:
  - jika tabel tidak ada / RLS block, tampilkan card “unavailable” (tanpa blank)
- **UX**:
  - skeleton, toast, confirm dialog untuk publish/destructive
- **Perf**:
  - limit + pagination server-side, jangan `select *` tanpa limit

---

## 5) Deploy readiness (wajib)

### Vercel (wajib)
- Pastikan ada `admin-web/vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Fallback non-Vercel
- `admin-web/public/_redirects`:

```text
/*    /index.html   200
```

### Verifikasi
- `npm run build` sukses
- Buka langsung + refresh:
  - `https://admin.macfyi.com/licenses`
  - `https://admin.macfyi.com/transactions`
  - `https://admin.macfyi.com/landing`
  - tidak boleh 404

---

## Template prompt (SALIN-PASTE) — **buat ulang admin dengan UI lengkap**

```text
Tugas: buat ulang (atau refactor menyeluruh) admin web untuk https://admin.macfyi.com di folder admin-web/. HASIL AKHIR HARUS ADA UI (bukan jawaban abstrak/blank).

Wajib patuhi docs/ADMIN_PAGE_MASTER_PROMPT.md, dan implementasikan:

1) Shell & routing
- Sidebar grouped + Topbar breadcrumb + search + status bar.
- Routes Inggris lengkap (lihat brief).
- Auth gate: login screen, block non-admin.

2) Dashboard (WAJIB)
- KPI cards + minimal 2 chart Recharts + provider donut + refresh.
- Loading skeleton, empty/error state jelas.

3) Pages utama (WAJIB)
- Analytics 14d (best-effort).
- Licenses list + filter + pagination + drawer detail.
- Transactions list + filter + export CSV/JSON + drawer snapshot.
- Landing editor: order + hidden + local draft + preview.
- Platform settings: grouped keys + hints + bump config_version saat save.

4) Deploy ready (WAJIB)
- Pastikan refresh route tidak 404: vercel.json rewrite ke /index.html + public/_redirects.
- Jalankan npm run build dan pastikan sukses.

Deliverable:
- Tulis perubahan file nyata di repo.
- Sertakan smoke checklist (klik semua route + refresh route + publish/save setting) dan ringkasan queryKey.
```

---

*Dokumen ini diselaraskan dengan struktur admin MacFYI di repo (`admin-web/`, deploy `admin.macfyi.com`, Supabase).*
# Master prompt: **rebuild `admin.macfyi.com`** (admin web MacFYI)

Dokumen ini adalah **satu prompt utuh** untuk **membuat ulang** situs admin di **`https://admin.macfyi.com`** — baik sebagai **brief awal** bagi agent AI yang akan generate UI/kode dari nol, maupun sebagai **instruksi integrasi** ketika Anda menempelkan **file hasil generate** ke repo `admin-web/`.

**Tujuan akhir:** admin baru **setara fungsi** dengan kontrak data yang sudah dipakai MacFYI hari ini, **tanpa bentrok** dengan landing / admin ringan di LP, dan **siap deploy** (routing SPA, env, Supabase admin JWT).

---

## Brief khusus domain: **`admin.macfyi.com`** (wajib dipenuhi agent)

| Item | Requirement |
|------|----------------|
| **Origin** | App hanya di-serve dari `https://admin.macfyi.com` (atau staging eksplisit); jangan hardcode origin lain di logika auth. |
| **Stack target** | React + Vite + TypeScript + React Router + TanStack Query + Supabase JS v2 + Tailwind (atau setara); struktur folder rapi (`pages/`, `components/`, `hooks/`, `lib/`). |
| **Auth** | Supabase Auth; user wajib `app_metadata.role === "admin"`; gate sebelum shell admin. |
| **Routing** | Path Inggris: `/dashboard`, `/analytics`, `/licenses`, `/transactions`, `/promo-pricing`, `/affiliates`, `/withdrawals`, `/crm`, `/landing`, `/app-settings`, `/marketing`, `/platform`, `/edge-functions`, `/logs`, `/admin-users`, `/events`, `/announcements`, `/wa-templates`, `/live` (+ redirect legacy ID jika masih dipakai). |
| **Deep link & refresh** | Hosting (Vercel) wajib **rewrite** semua non-asset ke `index.html` (lihat `admin-web/vercel.json` + `public/_redirects` di repo). Tanpa ini, refresh `/licenses` → `404 NOT_FOUND`. |
| **Env build** | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; opsional `VITE_LANDING_PREVIEW_URL` untuk iframe preview LP. |
| **Parity fitur** | Semua area di bagian 1–4 dokumen ini harus ada **route + data path**; jika UI baru menyederhanakan, tulis **explicit “removed vs deferred”** di PR, bukan diam-diam hilangkan. |
| **Bundle / navigasi** | Hindari pola di mana navigasi memutus chunk lalu 404 di CDN; setelah rebuild, verifikasi **Network → JS 200** untuk semua route pertama kali dibuka. |

---

## Peran Anda (agent / developer)

Anda adalah **senior full-stack engineer** yang mengintegrasikan **admin web SPA** (React + Vite + React Router + TanStack Query + Supabase client) ke **Supabase** (Postgres + RLS + Edge Functions). Anda menerima **file/folder hasil generate** (komponen halaman, layout, form). Tugas Anda:

1. **Memetakan** setiap UI ke **sumber data** yang benar (tabel / RPC / Edge / `public-config`).
2. **Menjaga kontrak** field JSON, versioning, dan hak akses **admin-only**.
3. **Mencegah konflik UX** antara **admin panel** vs **kontrol di landing page** (inline/popup).
4. Menyediakan **settingan siap pakai**: env vars, query keys, pola save (optimistic vs confirm), dan **checklist deploy** (SPA rewrite).

---

## Konteks produk (ringkas)

- **Admin web**: shell terpisah dari landing; route bahasa Inggris (mis. `/dashboard`, `/licenses`, `/landing`, `/platform`).
- **Landing page (LP)**: konsumen; bisa punya **kontrol marketing/admin ringan** (inline/modal) — **bukan** pengganti admin penuh.
- **Desktop app**: membaca **`public-config`** / `app_settings` / `platform_settings` lewat Edge; **bump `config_version`** saat konfigurasi berubah agar klien refetch.

---

## Input yang wajib Anda minta / terima dari pemilik proyek

Sebelum mengubah kode, minta atau terima:

| Input | Kenapa |
|--------|--------|
| Repo path / stack (`admin-web/`, Vite, RR7) | Menyesuaikan import & routing |
| Daftar file hasil generate (path + tanggung jawab) | Menghindari duplikasi route/layout |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Client Supabase |
| Aturan auth admin (`app_metadata.role === "admin"`) | RLS policy mengandalkan JWT admin |
| URL deploy admin (mis. `admin.macfyi.com`) + **SPA fallback** (Vercel `vercel.json` / `_redirects`) | Hindari 404 refresh pada `/rute` |
| Bila LP punya **mode admin inline**: flag URL (`?admin=`), cookie, atau subdomain | Menjaga **satu sumber kebenaran** konten LP |

---

## Aturan arsitektur (wajib)

1. **Satu sumber kebenaran per domain data**
   - Konten LP yang diedit di admin → **`landing_site_content`** (row `id = 'default'`, JSON `content`).
   - Harga/promo/kupon global → **`app_settings`** (row `id = 'default'`), termasuk `promo_plan`, `checkout_coupons`, `promo_slots_remaining`, `lifetime_price_idr`, **`config_version`**.
   - Toggle fitur desktop/demo/AI/marketing/SEO/checkout → **`platform_settings`** (key-value JSON per `key`), grup menurut prefix `demo.`, `ai.`, `marketing.`, `seo.`, `desktop.`, `checkout.`.
2. **Setelah mengubah `app_settings` atau `platform_settings` yang mempengaruhi klien publik**: bump **`app_settings.config_version`** (pola yang sudah dipakai admin saat ini).
3. **Jangan** menyimpan rahasia provider di kolom yang diekspos ke anon tanpa RLS; ikuti pola existing (Edge + service role untuk webhook, dll.).
4. **React Router**: navigasi client; **hosting** harus rewrite semua non-asset ke `index.html`.
5. **Konflik LP vs admin panel** (wajib dirancang di UI + data):
   - **Konten marketing LP** (hero, FAQ, urutan section, section tersembunyi) → hanya lewat **`content` + `content._admin`** di `landing_site_content`, diedit dari **admin route `/landing`** (atau modul yang Anda generate **asalkan** menulis ke tabel yang sama).
   - **Admin inline/popup di LP** (jika ada): hanya untuk **draft lokal / preview / toggle ringan**; **tidak boleh** menulis ke DB dengan skema berbeda atau key paralel (`brand`, `siteConfig` duplikat) yang membuat LP dan admin saling timpa.
   - Konvensi yang disarankan di JSON LP:
     - `content._admin.sectionOrder` — urutan section.
     - `content._admin.hiddenSections` — array id section yang disembunyikan di LP.
     - **Jangan** gunakan key `_admin` untuk data bisnis sensitif; hanya metadata tata letak/visibility.
   - Jika LP butuh “quick edit”: arahkan ke **URL admin `/landing`** atau embed **preview read-only** + tombol “Edit di admin”.

---

## 1) Landing page, branding, database — tanpa tabrakan dengan admin LP

**Tujuan:** branding, copy, struktur section LP konsisten; admin panel menjadi **control plane**; LP tidak punya “dua database konfigurasi”.

**Sumber data**

- Tabel: **`landing_site_content`** (`id`, `content` JSONB, `updated_at`).
- Branding visual (logo, warna) bisa:
  - bagian dari `content` (mis. path URL asset di CDN), **atau**
  - dokumen terpisah `docs/BRANDING_ASSETS.md` + pipeline upload — tetap **referensi di `content`** agar LP satu sumber.

**Wiring UI hasil generate**

- Load: `select content, updated_at where id = 'default'`.
- Save: `upsert` row yang sama; **validasi JSON** (FAQ array, struktur hero/footer) sebelum kirim.
- **Versioning**: jika belum ada tabel history, tampilkan `updated_at` + opsi export JSON backup di UI.

**Anti-tabrakan (checklist)**

- [ ] Tidak ada second store (localStorage / file) yang menjadi sumber LP di production kecuali **draft eksplisit** dengan merge manual ke editor admin.
- [ ] LP preview (`VITE_LANDING_PREVIEW_URL`) hanya baca; publish hanya dari admin.
- [ ] Semua path “edit landing” di hasil generate **route ke satu modul** yang menulis `landing_site_content`.

---

## 2) Halaman member, affiliate, commerce, operasional

**Prinsip:** tabel yang sudah dipakai admin harus dipetakan 1:1; jangan buat tabel paralel.

**Area & sumber data (indikatif)**

| Area admin | Tabel / sumber utama | Catatan integrasi |
|------------|----------------------|-------------------|
| Lisensi / “member” pembeli | `licenses`, `activations` | Hash key; jangan expose plaintext key di DB |
| Transaksi checkout | `payment_transactions`, opsional `payment_events` | Filter status, export CSV/JSON |
| Promo & harga | `app_settings` (`promo_plan`, slots, kupon) | Selaraskan dengan Edge `public-config` / `promoPlan` server |
| Affiliate | `affiliates`, `commissions`, `withdrawal_requests` | Status + aksi approval via policy admin + Edge jika perlu |
| CRM | `crm_contacts`, `crm_events`, notes/tags jika dipakai | Timeline events; export |
| Analytics / telemetry | `client_telemetry`, agregat lain | Best-effort jika tabel ada |

**Wiring UI hasil generate**

- Gunakan **TanStack Query** dengan `queryKey` stabil per domain (`["licenses", …]`, dll.).
- Mutasi: invalidasi query yang sama; toast sukses/gagal.
- **Edge Functions** untuk aksi sensitif (withdrawal approve, dll.) — panggil dengan `Authorization: Bearer <session.access_token>` + `apikey` anon seperti pola existing.

---

## 3) Pengaturan aplikasi: demo, updater, AI, marketing, checkout, desktop

**Dua lapisan konfigurasi**

1. **`app_settings`** — “konfig global aplikasi” (harga lifetime, promo, kupon, `config_version`).
2. **`platform_settings`** — **banyak key** string JSON untuk fitur granular (demo cap, AI switch, copy paywall desktop, pixel IDs, dll.).

**Prefix standar `platform_settings` (wajib dipahami agent)**

- `demo.*` — limit demo, token TTL, cap clean, cap AI demo, dll.
- `ai.*` — master enable, model default, max tokens.
- `marketing.*` — banner, toast sosial, dll.
- `seo.*` — GA4, Meta pixel, dll.
- `desktop.*` — copy & flag **upgrade paywall** desktop (termasuk placeholder `{amount}`).
- `checkout.*` — flag/kunci publik checkout (hati-hati: hanya yang memang boleh ke client).

**Wiring UI hasil generate**

- Tampilkan **deskripsi per key** (map hint) + grup; value sebagai JSON string yang bisa diedit + validasi parse sebelum save.
- Setelah save key: bump **`app_settings.config_version`** (satu transaksi user-facing: “Saved + clients will refetch”).

**Updater / release**

- Jika UI generate menyentuh “channel update”, “download URL”, atau “minimum version”: pastikan **sumber** sama dengan yang dibaca desktop (biasanya `public-config` / `app_settings` — selaraskan dengan Edge, jangan hardcode di UI saja).

---

## 4) “Lain-lain” yang sudah ada / sebaiknya ada di admin

Gunakan daftar ini sebagai **minimum coverage** saat menilai hasil generate:

- **Overview:** dashboard agregat, analytics time-series (best-effort), live activity.
- **Commerce:** licenses, transactions, promo/pricing, affiliates.
- **Content:** landing editor, app settings (global app row), public-config/marketing view, events, announcements, WA templates (jika dipakai).
- **Operations:** withdrawals, CRM, platform settings.
- **System:** edge functions health/info, logs, admin users (role).
- **Polish produksi:** error boundary route, loading skeleton, tabel besar (virtualisasi), export data, breadcrumbs, SPA rewrite deploy.

---

## Instruksi khusus untuk agent saat menerima “file hasil generate”

1. **Jangan** mengganti nama tabel/kolom tanpa migrasi.
2. **Map setiap form** ke key/tabel yang sudah disebut; jika UI minta field baru, tuliskan **RFC migrasi** terpisah, jangan asumsi kolom ada.
3. **Routing:** gunakan path Inggris konsisten dengan admin existing; sediakan redirect legacy jika perlu.
4. **RLS:** semua query dari admin browser memakai user JWT admin; jangan longgar-kan policy di client.
5. **Performansi:** pagination/filter server-side untuk tabel besar; hindari `select *` tanpa limit di list.
6. **A11y & UX:** label form, error state, konfirmasi destructive (revoke license, publish promo).
7. **Deliverable merge:** PR harus menyertakan **screenshot/checklist manual** singkat + catatan env/deploy.

---

## Template perintah singkat — **rebuild penuh `admin.macfyi.com`**

```text
Tugas: buat ulang (atau refactor menyeluruh) admin web untuk https://admin.macfyi.com di folder admin-web/.

Wajib patuhi docs/ADMIN_PAGE_MASTER_PROMPT.md secara penuh, termasuk:
- Brief domain admin.macfyi.com (routing Inggris, auth admin Supabase, SPA rewrite Vercel).
- Satu sumber data: landing_site_content, app_settings, platform_settings; bump app_settings.config_version saat mempengaruhi klien publik/desktop.
- LP: satu writer ke landing_site_content; content._admin hanya sectionOrder/hiddenSections/metadata layout; cegah bentrok dengan admin inline/popup di LP.
- Commerce & ops: licenses, activations, payment_transactions, affiliates, withdrawal_requests, CRM, analytics best-effort.
- TanStack Query + invalidasi konsisten; Edge untuk aksi sensitif dengan Bearer session + apikey anon.
- Tanpa migrasi DB baru kecuali RFC terpisah disetujui.

Deliverable:
- Shell (sidebar, topbar, error boundary, loading states), semua route di atas, dan checklist uji manual + deploy (env + vercel.json).
```

## Template perintah singkat — **integrasi file hasil generate** (setelah UI jadi)

```text
Lampirkan file hasil generate. Integrasikan ke admin-web MacFYI (target deploy admin.macfyi.com) dengan aturan berikut:
- Patuhi docs/ADMIN_PAGE_MASTER_PROMPT.md (termasuk brief domain dan SPA rewrite).
- Satu sumber data: landing_site_content, app_settings, platform_settings; bump config_version.
- Cegah bentrok admin LP vs admin panel (satu writer ke landing_site_content; _admin hanya metadata layout).
- Wire ke Supabase dengan TanStack Query; admin JWT only.
- Tanpa migrasi baru kecuali Anda tulis RFC terpisah.
Output: diff file terarah + ringkasan queryKey + checklist uji + catatan deploy admin.macfyi.com.
```

---

## Checklist akhir sebelum merge

- [ ] Tidak ada duplikasi sumber untuk LP / promo / platform keys  
- [ ] Save path memicu **`config_version`** bila mempengaruhi klien  
- [ ] Tidak ada secret yang tidak sengaja masuk bundle  
- [ ] Navigasi + refresh route di production **tidak 404**  
- [ ] Halaman berat punya loading / error state yang jelas  

---

*Dokumen ini diselaraskan dengan struktur admin MacFYI di repo (`admin-web/`, deploy `admin.macfyi.com`, Supabase). Sesuaikan nama tabel jika migrasi internal Anda berbeda.*
