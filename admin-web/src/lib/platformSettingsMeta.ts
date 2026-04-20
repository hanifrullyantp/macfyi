/** Group keys for nicer admin UX; unknown keys still appear under "Other". */
export const PLATFORM_SETTING_GROUPS: { id: string; label: string; prefix: string }[] = [
  { id: "demo", label: "Demo & limits", prefix: "demo." },
  { id: "ai", label: "AI", prefix: "ai." },
  { id: "marketing", label: "Marketing", prefix: "marketing." },
  { id: "seo", label: "SEO & pixels", prefix: "seo." },
  { id: "desktop", label: "Desktop app", prefix: "desktop." },
  { id: "checkout", label: "Checkout", prefix: "checkout." },
];

export function groupKeyForSetting(key: string): string {
  for (const g of PLATFORM_SETTING_GROUPS) {
    if (key.startsWith(g.prefix)) return g.id;
  }
  return "other";
}

export const GROUP_ORDER = ["demo", "ai", "marketing", "seo", "desktop", "checkout", "other"];
