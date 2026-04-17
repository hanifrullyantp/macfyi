/** Update favicon + apple-touch-icon when a public HTTPS logo URL is available (from public-config). */
export function syncAppWebBrandingIcons(logoUrl: string | null | undefined): void {
  if (typeof document === "undefined") return;
  const logo = logoUrl?.trim() ?? "";
  if (!logo) return;

  const ensureLink = (rel: string, href: string) => {
    let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
    if (!el) {
      el = document.createElement("link");
      el.rel = rel;
      document.head.appendChild(el);
    }
    el.href = href;
  };

  ensureLink("icon", logo);
  ensureLink("apple-touch-icon", logo);
}
