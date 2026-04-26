/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_MARKETING_SITE_URL?: string;
  /** Full URL to pricing section; if unset, `{VITE_MARKETING_SITE_URL or macfyi.com}/#pricing` is used. */
  readonly VITE_MARKETING_PRICING_URL?: string;
  /** Direct checkout (Lynk/Midtrans) — if unset, `{marketing base}/checkout`. */
  readonly VITE_MARKETING_CHECKOUT_URL?: string;
  /** Open in browser for web login; default adds `?redirect=/desktop-connect`. */
  readonly VITE_WEB_LOGIN_URL?: string;
  /** Member/affiliate base; falls back to marketing site. */
  readonly VITE_MEMBER_BASE_URL?: string;
  /** Override affiliate URL; default `{member or marketing}/member/affiliate`. */
  readonly VITE_MEMBER_AFFILIATE_URL?: string;
  /** Post `exchange-desktop-pairing`; default `{VITE_SUPABASE_URL}/functions/v1/exchange-desktop-pairing`. */
  readonly VITE_EXCHANGE_DESKTOP_PAIRING_URL?: string;
  /** Local UI testing: treat user as Pro (never ship `true` in production builds). */
  readonly VITE_DEV_PRO_ENTITLED?: string;
  readonly VITE_SKIP_LICENSE?: string;
  readonly VITE_LICENSE_ACTIVATE_URL?: string;
  /** Set to "true" with matching email/key to skip DB activation (local testing only). */
  readonly VITE_DEV_LICENSE_BYPASS?: string;
  readonly VITE_DEV_LICENSE_EMAIL?: string;
  readonly VITE_DEV_LICENSE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
