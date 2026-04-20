import type { SiteSettings } from "../types/content";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    ttq?: { track?: (name: string, obj?: Record<string, unknown>) => void };
  }
}

/** Nama event konsisten untuk Meta (Custom), GA4, TikTok — prefix `macfyi_`. */
export function fireConversionPixels(
  settings: SiteSettings,
  event: string,
  payload?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  const base = { ...payload, event_source: "macfyi_landing" as const };
  const name = event.startsWith("macfyi_") ? event : `macfyi_${event}`;

  const metaOn = settings.pixelSendMeta !== false && Boolean(settings.facebookPixelId?.trim());
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

function fireMetaStandard(
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
export function firePixelStep(
  settings: SiteSettings,
  step:
    | "page_open"
    | "pricing_cta"
    | "demo_modal_open"
    | "demo_submit"
    | "lead_form_visible"
    | "lead_form_submit"
    | "checkout_nav"
    | "checkout_form_visible"
    | "checkout_form_submit"
    | "purchase_completed",
  payload?: Record<string, unknown>
): void {
  const meta =
    step === "page_open"
      ? settings.metaEventOnPageOpen
      : step === "pricing_cta"
        ? settings.metaEventOnPricingCta
        : step === "demo_modal_open"
          ? settings.metaEventOnDemoModalOpen
          : step === "demo_submit"
            ? settings.metaEventOnDemoSubmit
            : step === "lead_form_visible"
              ? settings.metaEventOnLeadFormVisible
              : step === "lead_form_submit"
                ? settings.metaEventOnLeadFormSubmit
                : step === "checkout_nav"
                  ? settings.metaEventOnCheckoutNav
                  : step === "checkout_form_visible"
                    ? settings.metaEventOnCheckoutFormVisible
                    : step === "checkout_form_submit"
                      ? settings.metaEventOnCheckoutFormSubmit
                      : settings.metaEventOnPurchaseCompleted;

  fireMetaStandard(settings, meta, payload);

  // Custom events (GA4 + TikTok + Meta custom, jika diaktifkan)
  fireConversionPixels(settings, step, payload);
}
