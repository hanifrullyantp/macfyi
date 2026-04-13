# Macfyi landing page

Static Vite + React single-page funnel with inline admin (gear), CRM in `localStorage`, and optional lead webhook.

**Flow:** Tombol beli/checkout membuka **modal checkout** di halaman (bukan tab kosong). Isi nama/email, setujui syarat, lalu lanjut ke URL gateway jika `checkoutUrl` diatur di pengaturan. **Login** di header membuka **popup** — kredensial admin (`hanif.rullyant@gmail.com` / `123` secara default) masuk **mode admin** untuk sunting inline.

- **Develop:** `npm install` then `npm run dev`
- **Build:** `npm run build` (single-file output via `vite-plugin-singlefile`)

Environment variables are documented in [`.env.example`](.env.example).

**Marketing stack** (Supabase, checkout, admin UI, activation) is described in the main repo: [`docs/MARKETING_ECOSYSTEM.md`](../docs/MARKETING_ECOSYSTEM.md).

**QA / security audit** (scope: static landing vs full payment backend): [`docs/QA_AUDIT_LANDING_PAGE.md`](../docs/QA_AUDIT_LANDING_PAGE.md).

**Pembayaran Midtrans + Supabase:** set `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`, deploy Edge Functions di [`supabase/README.md`](../supabase/README.md) (`create-midtrans-snap`, `payment-webhook`). Tanpa env itu, checkout memakai **Checkout URL** dari pengaturan admin atau pesan kontak.

**Tutorial langkah demi langkah** (Supabase, Vercel, Midtrans, Resend): [`docs/TUTORIAL_INTEGRASI_STACK.md`](../docs/TUTORIAL_INTEGRASI_STACK.md).
