/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_EMAIL?: string;
  readonly VITE_ADMIN_PASSWORD?: string;
  /** Optional URL (Edge Function, Zapier, etc.) to POST lead JSON on form submit. */
  readonly VITE_LEAD_WEBHOOK_URL?: string;
  /** Supabase project URL (no trailing slash). Enables Midtrans Snap via Edge Function. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon (public) key — used only to invoke `create-midtrans-snap`. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Set to "false" to skip Midtrans Snap even if Supabase env is set (fallback to Checkout URL). */
  readonly VITE_USE_MIDTRANS_SNAP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
