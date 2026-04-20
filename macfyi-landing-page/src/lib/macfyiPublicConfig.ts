export type MacfyiPublicPromo = {
  active: boolean;
  ends_at: string | null;
  compare_at_idr: number | null;
  slots_remaining: number | null;
  slots_display: number | null;
};

export type CheckoutGateway = "midtrans" | "lynk" | "external";

export type MacfyiPublicCheckout = {
  compare_at_idr: number | null;
  base_lifetime_idr: number;
  auto_coupon: { id: string; code: string; label: string | null } | null;
  final_with_auto_idr: number | null;
  /** From `platform_settings.checkout.gateway` via public-config. */
  gateway?: CheckoutGateway;
};

export type MacfyiPublicConfigPayload = {
  server_time?: string;
  pricing?: { lifetime_price_idr?: number; currency?: string };
  promo?: MacfyiPublicPromo;
  brand?: { logo_url?: string | null };
  checkout?: MacfyiPublicCheckout;
};

export async function fetchMacfyiPublicConfigRaw(): Promise<MacfyiPublicConfigPayload | null> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, "");
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anon) return null;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/public-config`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as MacfyiPublicConfigPayload;
  } catch {
    return null;
  }
}

/** Ringkas untuk landing (harga + promo + waktu server). */
export async function fetchMacfyiPublicConfig(): Promise<{
  idr: number | null;
  promo: MacfyiPublicPromo | null;
  serverTimeIso: string | null;
} | null> {
  const j = await fetchMacfyiPublicConfigRaw();
  if (!j) return null;
  const idr = j.pricing?.lifetime_price_idr;
  return {
    idr: typeof idr === "number" && idr > 0 ? idr : null,
    promo: j.promo ?? null,
    serverTimeIso: j.server_time ?? null,
  };
}

export async function previewCheckoutPricing(body: {
  coupon_code?: string;
  skip_auto_coupon?: boolean;
}): Promise<{
  base_lifetime_idr: number;
  compare_at_idr: number | null;
  final_idr: number;
  discount_idr: number;
  coupon: { id: string; code: string } | null;
  error?: string;
} | null> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, "");
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !anon) return null;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/preview-checkout-price`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const j = (await res.json().catch(() => ({}))) as {
      base_lifetime_idr?: number;
      compare_at_idr?: number | null;
      final_idr?: number;
      discount_idr?: number;
      coupon?: { id: string; code: string } | null;
      error?: string;
    };
    if (!res.ok) {
      return {
        base_lifetime_idr: typeof j.base_lifetime_idr === "number" ? j.base_lifetime_idr : 0,
        compare_at_idr: j.compare_at_idr ?? null,
        final_idr: typeof j.final_idr === "number" ? j.final_idr : 0,
        discount_idr: typeof j.discount_idr === "number" ? j.discount_idr : 0,
        coupon: j.coupon ?? null,
        error: j.error || "preview_failed",
      };
    }
    return {
      base_lifetime_idr: Number(j.base_lifetime_idr) || 0,
      compare_at_idr: j.compare_at_idr ?? null,
      final_idr: Number(j.final_idr) || 0,
      discount_idr: Number(j.discount_idr) || 0,
      coupon: j.coupon ?? null,
    };
  } catch {
    return null;
  }
}
