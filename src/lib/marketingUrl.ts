/**
 * Base marketing site (landing). Halaman `/#pricing` dan `/checkout` memakai harga dari server;
 * gateway aktual (Midtrans Snap vs Lynk.id) mengikuti `platform_settings.checkout.gateway` / public-config.
 */
export function marketingSiteBase(): string {
  return import.meta.env.VITE_MARKETING_SITE_URL?.trim().replace(/\/$/, "") || "https://macfyi.com";
}

/** Pricing/checkout entry — full URL override or `{base}/#pricing` (landing section id). */
export function marketingPricingUrl(): string {
  const explicit = import.meta.env.VITE_MARKETING_PRICING_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return `${marketingSiteBase()}/#pricing`;
}

/** Direct checkout on landing (Lynk/Midtrans flow). */
export function marketingCheckoutUrl(): string {
  const explicit = import.meta.env.VITE_MARKETING_CHECKOUT_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return `${marketingSiteBase()}/checkout`;
}

export function marketingTermsUrl(): string {
  const explicit = import.meta.env.VITE_MARKETING_TERMS_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return `${marketingSiteBase()}/terms`;
}

export function marketingPrivacyUrl(): string {
  const explicit = import.meta.env.VITE_MARKETING_PRIVACY_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return `${marketingSiteBase()}/privacy`;
}

const memberBase = (): string =>
  import.meta.env.VITE_MEMBER_BASE_URL?.trim().replace(/\/$/, "") || marketingSiteBase();

/** Member area — affiliate program (Pro). Returns empty if disabled. */
export function marketingMemberAffiliateUrl(): string {
  if (import.meta.env.VITE_MEMBER_AFFILIATE_URL?.trim()) {
    return import.meta.env.VITE_MEMBER_AFFILIATE_URL.trim();
  }
  return `${memberBase()}/member/affiliate`;
}
