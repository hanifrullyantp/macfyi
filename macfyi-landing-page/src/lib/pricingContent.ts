import type { ContentData } from "../types/content";
import { formatIdr, formatIdrCompactRb } from "./formatIdr";

const DEFAULT_SCARCITY: ContentData["scarcity"] = {
  headline1: "Jangan Sampai Menyesal",
  headline2: "Tidak Kebagian ya..",
  badge: "Hanya Untuk 10 Orang Tercepat Saja",
  slotsDash: "—",
  slotsLabel: "Tersisa",
  slotsCount: "7",
  slotsDashAfter: "Slot! —",
  hargaNormalLabel: "Harga Normal",
  strikeLargest: "Rp 1.200.000",
  strikeMedium: "Rp 379.000",
  strikeSmall: "Rp 299.000",
  exclusiveLine: "Khusus untuk 10 orang tercepat pertama sampai waktu berakhir:",
  visitorCountdownMinutes: 165,
  countdownEndIso: "",
};

/** Ensure pricing has free/paid columns (migrate older single-column JSON). */
export function normalizePricingContent(data: ContentData): ContentData {
  let next = { ...data };

  if (!next.scarcity?.headline1) {
    next = { ...next, scarcity: { ...DEFAULT_SCARCITY, ...next.scarcity } };
  }

  const p = next.pricing;
  if (!(p.freeTitle && Array.isArray(p.freeBullets) && p.freeBullets.length > 0 && p.paidTitle)) {
    const legacyTitle = p.title;
    const legacyBullets = Array.isArray(p.bullets) ? [...p.bullets] : [];
    next = {
      ...next,
      pricing: {
        ...p,
        title: "Demo gratis atau beli lifetime",
        freeTitle: "Demo Macfyi",
        freeSubtitle: "Unduh aplikasi, coba fitur utama, lalu putuskan kapan ingin membeli.",
        freeBullets: ["Unduh DMG resmi", "Mode demo dengan batas wajar", "Tanpa kartu kredit"],
        freeCta: "Coba gratis",
        compareAtPrice: p.compareAtPrice ?? "Rp 299.000",
        paidTitle: legacyTitle?.includes("Demo") ? "Lifetime (1 Mac)" : legacyTitle || "Lifetime (1 Mac)",
        bullets: legacyBullets.length ? legacyBullets : p.bullets,
        cta: p.cta?.trim() ? p.cta : "Lifetime (1x Bayar)",
      },
    };
  }

  const pp = next.pricing;
  if (!pp.compareAtPrice?.trim()) {
    next = { ...next, pricing: { ...pp, compareAtPrice: "Rp 299.000" } };
  }

  return next;
}

export function applyLifetimePriceIdrToContent(data: ContentData, idr: number): ContentData {
  if (!Number.isFinite(idr) || idr <= 0) return data;
  const formatted = formatIdr(idr);
  const compact = formatIdrCompactRb(idr);
  return {
    ...data,
    settings: {
      ...data.settings,
      lifetime_price_idr: idr,
      price: formatted,
    },
    pricing: {
      ...data.pricing,
      price: compact,
    },
  };
}
