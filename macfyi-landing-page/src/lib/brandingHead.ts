function toAbsoluteUrl(href: string): string {
  const t = href.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  const path = t.startsWith("/") ? t : `/${t}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

const FALLBACK_LOGO = "/brand-logo-default.png";

/** Sinkronkan favicon, apple-touch-icon, dan og/twitter image dari pengaturan landing. */
export function syncLandingBrandingTags(brandLogoUrl: string, ogImageUrl: string): void {
  if (typeof document === "undefined") return;

  const logo = brandLogoUrl.trim() || FALLBACK_LOGO;
  const href = toAbsoluteUrl(logo);
  const ensureLink = (rel: string) => {
    let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!el) {
      el = document.createElement("link");
      el.rel = rel;
      document.head.appendChild(el);
    }
    el.href = href;
  };
  ensureLink("icon");
  ensureLink("apple-touch-icon");

  const og = ogImageUrl.trim() || logo;
  if (!og) return;
  const abs = toAbsoluteUrl(og);

  let m = document.querySelector('meta[property="og:image"]') as HTMLMetaElement | null;
  if (!m) {
    m = document.createElement("meta");
    m.setAttribute("property", "og:image");
    document.head.appendChild(m);
  }
  m.setAttribute("content", abs);

  let tw = document.querySelector('meta[name="twitter:image"]') as HTMLMetaElement | null;
  if (!tw) {
    tw = document.createElement("meta");
    tw.setAttribute("name", "twitter:image");
    document.head.appendChild(tw);
  }
  tw.setAttribute("content", abs);
}
