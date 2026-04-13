# QA & Security Audit — `macfyi-landing-page`

**Scope:** Static Vite + React SPA (`macfyi-landing-page/`). This is **not** a Node `server.js`, SQLite, Midtrans Snap-in-page, JWT customer dashboard, or `/download/:token` app. Many checklist items from a **full payment backend** are **not applicable (N/A)** here; they belong to a separate service (Supabase Edge, `admin-web`, funnel host, etc.—see [`MARKETING_ECOSYSTEM.md`](MARKETING_ECOSYSTEM.md)).

**Trace baseline (Flow A, steps A1–A5 only — actual code):**

| Step | What happens | Files / code |
|------|----------------|--------------|
| **A1** | User opens dev server URL | Vite serves [`index.html`](../macfyi-landing-page/index.html) → [`main.tsx`](../macfyi-landing-page/src/main.tsx) mounts [`App.tsx`](../macfyi-landing-page/src/App.tsx). **Default Vite port is `5173`**, not `3000`, unless you set `server.port` in `vite.config`. |
| | CSS/JS | Tailwind via **Vite plugin** ([`vite.config.ts`](../macfyi-landing-page/vite.config.ts) `@tailwindcss/vite`), **not** Tailwind CDN. |
| | Routing | **No** React Router — single page, hash-less; no `/login` or `/download/:token` routes. |
| **A2** | Scroll / sections | [`App.tsx`](../macfyi-landing-page/src/App.tsx) renders sections (hero, problem, pricing, FAQ, …). Framer Motion on some blocks. **No** dedicated testimonial section in default content. **No** countdown timer. Price from `data.settings.price` / `pricing`. |
| **A3** | “Beli” / CTA | Buttons call `openCheckout` (`useCallback` in `LandingApp`) → `setCheckoutOpen(true)`. **Not** `window.open(checkoutUrl)` directly anymore. |
| **A4** | Checkout UI | [`CheckoutModal.tsx`](../macfyi-landing-page/src/components/CheckoutModal.tsx): nama, email, **no. HP (wajib)**, checkbox syarat, ringkasan harga. |
| **A5** | Submit | `submit` in `CheckoutModal` — `preventDefault`, validation via [`formValidation.ts`](../macfyi-landing-page/src/lib/formValidation.ts), `addLead` → [`leads.ts`](../macfyi-landing-page/src/lib/leads.ts) (`localStorage`). If `checkoutUrl` is valid HTTP(S), `window.open` with query params. **No** `fetch` to a first-party checkout API; optional lead webhook is on **Lead** form (`VITE_LEAD_WEBHOOK_URL`), not checkout. |

**Flow B (customer login / dashboard):** **MISSING** — only **admin** modal exists ([`AdminLoginModal.tsx`](../macfyi-landing-page/src/components/AdminLoginModal.tsx) + [`adminAuth.ts`](../macfyi-landing-page/src/config/adminAuth.ts), session in `sessionStorage`). No bcrypt/JWT for end users.

**Flow C (repeat purchase / duplicate email):** **Not enforced** — leads are appended in `localStorage` with no deduplication.

**A6–A11, Midtrans Snap, webhooks, email download tokens:** **Not implemented in this SPA.** Partial related code exists elsewhere in monorepo: [`supabase/functions/payment-webhook/index.ts`](../supabase/functions/payment-webhook/index.ts) (generic paid payload, idempotency on `payment_events`, Resend email) — **not wired** from landing checkout modal.

---

## BAGIAN 5 — Ringkasan temuan

### PASSED (sesuai scope statis)

- Halaman tunggal dimuat; dependensi bundel Vite; Tailwind diproses di build.
- CTA checkout membuka modal berisi form (bukan tab kosong bila `checkoutUrl` kosong).
- `addLead` menyimpan JSON di `localStorage` dengan batas 500 baris ([`leads.ts`](../macfyi-landing-page/src/lib/leads.ts)).
- Admin login: `tryLogin` membandingkan email/password ke env/default; pesan gagal generik.
- `EditableText` merender teks sebagai teks React (bukan `dangerouslySetInnerHTML`) — mitigasi XSS untuk konten yang ditampilkan sebagai teks.
- Webhook lead: POST JSON opsional; CORS tergantung endpoint.

### WARNING (perbaikan diterapkan / disarankan)

- **Validasi input** — sebelumnya minimal; **diperketat**: email regex, nama min 2 karakter, HP checkout wajib 10–15 digit, HP lead opsional 8–15 digit jika diisi; trim email; pesan field + `aria-invalid` di checkout.
- **Double submit** — tombol submit + flag `submitting` + disable saat proses.
- **Tidak ada server-side validation** — wajar untuk static site; backend wajib memvalidasi ulang jika nanti ada API.
- **Admin password** — hanya di sisi klien; **tidak aman untuk rahasia nyata** — gunakan env di build CI dan batasi akses hosting.
- **`.gitignore`** — ditambahkan agar `.env` tidak ter-commit.

### CRITICAL (dalam scope audit asli “full stack”)

- **Seluruh pipeline Midtrans Snap + webhook signature SHA512 + transaksi DB + halaman download bertoken + dashboard JWT** — **tidak ada** di project landing ini; harus proyek/backend terpisah atau integrasi ke Supabase sesuai dokumen.

### MISSING (fitur checklist yang tidak ada di repo ini)

- `server.js`, `routes/*`, SQLite `store.db`, `/api/checkout`, Midtrans `snap.pay`, halaman `payment-success`, `/download/:token`, rate limiting API, CSRF pada API (tidak ada API same-origin).

### FLOW INTEGRITY SCORE (terhadap **checklist backend penuh**)

| Dimensi | Skor | Catatan |
|---------|------|---------|
| Flow A (pembelian baru) | **3/10** | Hanya UI + local lead + redirect URL; tanpa server order |
| Flow B (login & dashboard) | **1/10** | Hanya admin inline |
| Flow C (beli lagi) | **1/10** | Tanpa deteksi duplikat |
| Error handling | **4/10** | Klien diperbaiki; tanpa error server |
| Security | **3/10** | Static; admin client-only; webhook perlu verifikasi di server |
| UX | **6/10** | Loading, validasi, a11y dasar |
| **TOTAL** | **18/60** | Naik sedikit setelah perbaikan validasi/UX |

**Score terhadap “landing statis + admin + CRM lokal” saja:** jauh lebih tinggi (~8/10 fungsional untuk tujuan itu).

---

## Perbaikan otomatis (implementasi)

1. [`src/lib/formValidation.ts`](../macfyi-landing-page/src/lib/formValidation.ts) — util validasi bersama.
2. [`src/components/CheckoutModal.tsx`](../macfyi-landing-page/src/components/CheckoutModal.tsx) — field HP wajib, error per field, `submitting`, `phone` di query gateway, `noValidate` + `role="alert"`.
3. [`src/components/LeadCaptureForm.tsx`](../macfyi-landing-page/src/components/LeadCaptureForm.tsx) — validasi sama, label `htmlFor`, loading, trim email on blur.
4. [`.gitignore`](../macfyi-landing-page/.gitignore) — `.env`, `dist`, `node_modules`.

---

*Dokumen ini memenuhi permintaan trace A1–A5 secara literal; A6+ dicatat N/A atau dirujuk ke monorepo lain.*
