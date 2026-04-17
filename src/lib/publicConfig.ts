export type PublicConfig = {
  version: number;
  brand?: { logo_url: string | null };
  pricing: { lifetime_price_idr: number; currency: string };
  download_url: string | null;
  checkout_success_base_url: string | null;
  demo: Record<string, unknown>;
  ai: Record<string, unknown>;
};

let cache: PublicConfig | null = null;
let cacheAt = 0;
const TTL_MS = 120_000;

function publicConfigUrl(): string | null {
  const base = import.meta.env.VITE_PUBLIC_CONFIG_URL?.trim();
  if (base) return base.replace(/\/$/, "");
  const supabase = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, "");
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (supabase && anon) return `${supabase}/functions/v1/public-config`;
  return null;
}

export async function fetchPublicConfig(force = false): Promise<PublicConfig | null> {
  const now = Date.now();
  if (!force && cache && now - cacheAt < TTL_MS) return cache;
  const url = publicConfigUrl();
  if (!url) return null;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
  try {
    const res = await fetch(url, {
      headers: anon ? { apikey: anon, Authorization: `Bearer ${anon}` } : {},
    });
    if (!res.ok) return cache;
    const j = (await res.json()) as PublicConfig;
    cache = j;
    cacheAt = now;
    return j;
  } catch {
    return cache;
  }
}

export function getCheckoutOrigin(): string | null {
  const c = cache;
  const u = c?.checkout_success_base_url?.trim();
  if (u) return u.replace(/\/$/, "");
  return null;
}
