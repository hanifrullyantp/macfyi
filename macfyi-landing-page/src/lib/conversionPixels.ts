import type { SiteSettings } from "../types/content";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    ttq?: { track?: (name: string, obj?: Record<string, unknown>) => void };
  }
}

/** Nama event konsisten untuk GA4 + TikTok — prefix `macfyi_*`. Meta standard lewat `firePixelStep` / `fireMetaStandard`. */
export function fireConversionPixels(
  settings: SiteSettings,
  event: string,
  payload?: Record<string, unknown>,
  opts?: { skipMeta?: boolean }
): void {
  if (typeof window === "undefined") return;
  const base = { ...payload, event_source: "macfyi_landing" as const };
  const name = event.startsWith("macfyi_") ? event : `macfyi_${event}`;

  const metaOn =
    !opts?.skipMeta && settings.pixelSendMeta !== false && Boolean(settings.facebookPixelId?.trim());
  const gaOn = settings.pixelSendGa !== false && Boolean(settings.googleAnalyticsId?.trim());
  const ttOn = settings.pixelSendTiktok !== false && Boolean(settings.tiktokPixelId?.trim());

  if (metaOn && typeof window.fbq === "function") {
    try {
      window.fbq("trackCustom", name, base);
    } catch {
      /* non-blocking */
    }
  }
  if (gaOn && typeof window.gtag === "function") {
    try {
      window.gtag("event", name, base);
    } catch {
      /* non-blocking */
    }
  }
  if (ttOn && window.ttq && typeof window.ttq.track === "function") {
    try {
      window.ttq.track(name, base);
    } catch {
      /* non-blocking */
    }
  }
}

export const META_STANDARD_EVENTS: { id: string; label: string }[] = [
  { id: "none", label: "— tidak kirim (none) —" },
  { id: "PageView", label: "PageView — tampilan halaman" },
  { id: "Lead", label: "Lead — kirim form / prospek" },
  { id: "Contact", label: "Contact — kontak / chat / pesan" },
  { id: "CompleteRegistration", label: "CompleteRegistration — registrasi selesai" },
  { id: "ViewContent", label: "ViewContent — lihat konten / produk" },
  { id: "InitiateCheckout", label: "InitiateCheckout — mulai checkout" },
  { id: "Purchase", label: "Purchase — pembelian" },
  { id: "Subscribe", label: "Subscribe — langganan" },
  { id: "SubmitApplication", label: "SubmitApplication — kirim aplikasi" },
  { id: "Schedule", label: "Schedule — jadwalkan" },
  { id: "FindLocation", label: "FindLocation — cari lokasi" },
  { id: "StartTrial", label: "StartTrial — mulai trial" },
  { id: "Donate", label: "Donate — donasi" },
  { id: "Search", label: "Search — pencarian" },
  { id: "AddToCart", label: "AddToCart — tambah ke keranjang" },
  { id: "AddPaymentInfo", label: "AddPaymentInfo — info pembayaran" },
];

export function fireMetaStandard(
  settings: SiteSettings,
  standardEvent: string,
  payload?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  const metaOn = settings.pixelSendMeta !== false && Boolean(settings.facebookPixelId?.trim());
  if (!metaOn || typeof window.fbq !== "function") return;
  const ev = (standardEvent || "").trim();
  if (!ev || ev === "none") return;
  try {
    window.fbq("track", ev, { ...payload, event_source: "macfyi_landing" as const });
  } catch {
    /* non-blocking */
  }
}

/**
 * Fire pixel untuk step (Meta standard event bisa dipilih via admin).
 * GA4 + TikTok tetap menerima event custom `macfyi_<step>`.
 */
export type ConversionPixelStep =
  | "page_open"
  | "open_demo_intent"
  | "scarcity_scroll_to_pricing"
  | "pricing_cta"
  | "demo_modal_open"
  | "demo_submit"
  | "demo_download_ready"
  | "lead_form_visible"
  | "lead_form_submit"
  | "checkout_nav"
  | "checkout_route_view"
  | "checkout_form_visible"
  | "checkout_form_submit"
  | "snap_opened"
  | "lynk_redirect"
  | "purchase_completed";

export function firePixelStep(
  settings: SiteSettings,
  step: ConversionPixelStep,
  payload?: Record<string, unknown>
): void {
  const meta =
    step === "page_open"
      ? settings.metaEventOnPageOpen
      : step === "open_demo_intent"
        ? settings.metaEventOnOpenDemoIntent
        : step === "scarcity_scroll_to_pricing"
          ? settings.metaEventOnScarcityScrollToPricing
          : step === "pricing_cta"
            ? settings.metaEventOnPricingCta
            : step === "demo_modal_open"
              ? settings.metaEventOnDemoModalOpen
              : step === "demo_submit"
                ? settings.metaEventOnDemoSubmit
                : step === "demo_download_ready"
                  ? settings.metaEventOnDemoDownloadReady
                  : step === "lead_form_visible"
                    ? settings.metaEventOnLeadFormVisible
                    : step === "lead_form_submit"
                      ? settings.metaEventOnLeadFormSubmit
                      : step === "checkout_nav"
                        ? settings.metaEventOnCheckoutNav
                        : step === "checkout_route_view"
                          ? settings.metaEventOnCheckoutRouteView
                          : step === "checkout_form_visible"
                            ? settings.metaEventOnCheckoutFormVisible
                            : step === "checkout_form_submit"
                              ? settings.metaEventOnCheckoutFormSubmit
                              : step === "snap_opened"
                                ? settings.metaEventOnSnapOpened
                                : step === "lynk_redirect"
                                  ? settings.metaEventOnLynkRedirect
                                  : settings.metaEventOnPurchaseCompleted;

  fireMetaStandard(settings, meta ?? "none", payload);

  // Custom macfyi_* ke GA4 + TikTok (Meta custom opsional lewat checkbox; hindari double dengan standard)
  fireConversionPixels(settings, step, payload, { skipMeta: true });
}
