/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MARKETING_SITE_URL?: string;
  /** Full URL to pricing/checkout; if unset, `{VITE_MARKETING_SITE_URL or macfyi.com}/#pricing` is used. */
  readonly VITE_MARKETING_PRICING_URL?: string;
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
