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
