/** Salinan paywall Pro dari platform_settings (public-config). */
export type UpgradePaywallPublic = {
  /** Jika true, setelah bersih berhasil pakai angka sesi; jika false, selalu teks generik/marketing. Default true. */
  use_session_clean_amount: boolean;
  /** Template dengan placeholder `{amount}` (opsional). */
  subtitle_with_amount_id: string | null;
  subtitle_with_amount_en: string | null;
  /** Subjudul tanpa angka — tombol upgrade manual atau saat admin menonaktifkan angka sesi. */
  subtitle_generic_id: string | null;
  subtitle_generic_en: string | null;
};

export type PublicConfig = {
  version: number;
  brand?: { logo_url: string | null };
  pricing: { lifetime_price_idr: number; currency: string };
  download_url: string | null;
  checkout_success_base_url: string | null;
  demo: Record<string, unknown>;
  ai: Record<string, unknown>;
  desktop?: {
    upgrade_paywall?: UpgradePaywallPublic;
  };
};

let cache: PublicConfig | null = null;
let cacheAt = 0;
const TTL_MS = 120_000;

export type PublicConfigFetchResult = {
  config: PublicConfig | null;
  /** True if `VITE_PUBLIC_CONFIG_URL` or Supabase env pointed at a remote endpoint (we intended to call the network). */
  attemptedRemote: boolean;
  /** True if this request got HTTP 2xx and parsed JSON (fresh from server for this call). */
  okFromNetwork: boolean;
};

function publicConfigUrl(): string | null {
  const base = import.meta.env.VITE_PUBLIC_CONFIG_URL?.trim();
  if (base) return base.replace(/\/$/, "");
  const supabase = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, "");
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (supabase && anon) return `${supabase}/functions/v1/public-config`;
  return null;
}

/**
 * Fetches public marketing config. When remote is configured but unreachable, `attemptedRemote && !okFromNetwork`
 * and `config` may still be a stale cache from a previous session.
 */
export async function fetchPublicConfigWithResult(force = false): Promise<PublicConfigFetchResult> {
  const now = Date.now();
  const url = publicConfigUrl();
  if (!url) {
    return { config: null, attemptedRemote: false, okFromNetwork: false };
  }
  if (!force && cache && now - cacheAt < TTL_MS) {
    return { config: cache, attemptedRemote: false, okFromNetwork: false };
  }
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
  try {
    const res = await fetch(url, {
      headers: anon ? { apikey: anon, Authorization: `Bearer ${anon}` } : {},
    });
    if (!res.ok) {
      return { config: cache, attemptedRemote: true, okFromNetwork: false };
    }
    const j = (await res.json()) as PublicConfig;
    cache = j;
    cacheAt = now;
    return { config: j, attemptedRemote: true, okFromNetwork: true };
  } catch {
    return { config: cache, attemptedRemote: true, okFromNetwork: false };
  }
}

export async function fetchPublicConfig(force = false): Promise<PublicConfig | null> {
  const r = await fetchPublicConfigWithResult(force);
  return r.config;
}

export function getCheckoutOrigin(): string | null {
  const c = cache;
  const u = c?.checkout_success_base_url?.trim();
  if (u) return u.replace(/\/$/, "");
  return null;
}
