# Macfyi landing page

Static Vite + React single-page funnel with inline admin (gear), CRM in `localStorage`, and optional lead webhook.

**Flow:** Tombol beli/checkout membuka **modal checkout** di halaman (bukan tab kosong). Isi nama/email, setujui syarat, lalu lanjut ke URL gateway jika `checkoutUrl` diatur di pengaturan. **Login** di header membuka **popup** — kredensial admin (`hanif.rullyant@gmail.com` / `123` secara default) masuk **mode admin** untuk sunting inline.

- **Develop:** `npm install` then `npm run dev`
- **Build:** `npm run build` (single-file output via `vite-plugin-singlefile`)

Environment variables are documented in [`.env.example`](.env.example).

**Marketing stack** (Supabase, checkout, admin UI, activation) is described in the main repo: [`docs/MARKETING_ECOSYSTEM.md`](../docs/MARKETING_ECOSYSTEM.md).

**QA / security audit** (scope: static landing vs full payment backend): [`docs/QA_AUDIT_LANDING_PAGE.md`](../docs/QA_AUDIT_LANDING_PAGE.md).

**Pembayaran Midtrans / Lynk.id / URL eksternal:** set `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`, pilih gateway (`platform_settings.checkout.gateway` atau tab Checkout di admin). Deploy & secret: [`docs/CHECKOUT_GATEWAY_LYNK.md`](../docs/CHECKOUT_GATEWAY_LYNK.md) dan [`supabase/README.md`](../supabase/README.md).

**Tutorial langkah demi langkah** (Supabase, Vercel, Midtrans, SMTP): [`docs/TUTORIAL_INTEGRASI_STACK.md`](../docs/TUTORIAL_INTEGRASI_STACK.md).

**Penjelasan detail produk** (empat blok teks + screenshot) diset di `src/App.tsx` (`details`). Gambar sumber ada di **`public/landing/`** (build → `dist/landing/`, URL `/landing/detail-0*.png`). Sinkron ke Postgres: migrasi [`supabase/migrations/20260414175000_landing_product_details_refresh.sql`](../supabase/migrations/20260414175000_landing_product_details_refresh.sql) (`supabase db push`), atau setelah sunting di mode admin tekan **Publikasikan**. Untuk URL dari **Supabase Storage** (bucket `landing-media`), unggah lewat overlay gambar di mode admin (klik pada screenshot) lalu publikasikan.
