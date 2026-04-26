import type { EnrichedItem } from "./results-types";

export type CardBucketId =
  | "junk-files"
  | "app-leftovers"
  | "old-cache"
  | "old-downloads"
  | "large-files"
  | "trash";

export type CardRisk = "safe" | "caution" | "danger";

export interface ScanCardDef {
  id: CardBucketId;
  label: string;
  sublabel: string;
  emoji: string;
  riskLevel: CardRisk;
  riskBadge: string;
  userExplanation: string;
}

export const SCAN_RESULT_CARDS: ScanCardDef[] = [
  {
    id: "junk-files",
    label: "Junk Files",
    sublabel: "File sampah & sementara",
    emoji: "🗑",
    riskLevel: "safe",
    riskBadge: "Aman Dihapus",
    userExplanation:
      "File-file ini dibuat sementara saat Mac bekerja. Biasanya aman dipindah ke Trash bila scan menandainya aman.",
  },
  {
    id: "app-leftovers",
    label: "App Leftovers",
    sublabel: "Sisa file dari app yang sudah dihapus",
    emoji: "📦",
    riskLevel: "safe",
    riskBadge: "Aman Dihapus",
    userExplanation: "Bekas file aplikasi yang sudah tidak terpasang. Biasanya aman dibersihkan setelah tinjau cepat.",
  },
  {
    id: "old-cache",
    label: "Old Cache",
    sublabel: "Cache build & dev lama",
    emoji: "💾",
    riskLevel: "caution",
    riskBadge: "Tinjau Dulu",
    userExplanation:
      "Cache proyek (Xcode, npm, dsb). Menghapusnya bisa membuat build pertama berikutnya lebih lama, lalu normal lagi.",
  },
  {
    id: "old-downloads",
    label: "Old Downloads",
    sublabel: "Download yang jarang dipakai",
    emoji: "📥",
    riskLevel: "caution",
    riskBadge: "Tinjau Dulu",
    userExplanation: "File di folder Downloads. Pastikan installer/ZIP memang sudah tidak dibutuhkan sebelum dibuang.",
  },
  {
    id: "large-files",
    label: "Large Files",
    sublabel: "File sangat besar",
    emoji: "🐘",
    riskLevel: "caution",
    riskBadge: "Tinjau Dulu",
    userExplanation: "File besar (video, backup, VM). Tinjau manual — jangan dibuang semuanya sekaligus.",
  },
  {
    id: "trash",
    label: "Clutter & misc",
    sublabel: "Lain-lain (duplikat, email, dll.)",
    emoji: "🗂",
    riskLevel: "caution",
    riskBadge: "Tinjau Dulu",
    userExplanation: "Kategori campuran: duplikat, lampiran, atau lainnya. Tinjau per item sebelum membersihkan.",
  },
];

export interface CardBucket {
  def: ScanCardDef;
  totalSize: number;
  items: EnrichedItem[];
  itemIds: string[];
}

function pushItem(
  map: Map<CardBucketId, EnrichedItem[]>,
  key: CardBucketId,
  e: EnrichedItem
) {
  if (!map.has(key)) map.set(key, []);
  map.get(key)!.push(e);
}

/**
 * Map engine categories → six UX buckets (may overlap conceptually; each item only once to first match).
 */
export function buildCardBucketsFromEnriched(items: EnrichedItem[]): Map<CardBucketId, EnrichedItem[]> {
  const map = new Map<CardBucketId, EnrichedItem[]>();
  for (const e of items) {
    const c = e.categoryKey;
    if (c === "cache" || c === "logs" || c === "mail_attachments") {
      pushItem(map, "junk-files", e);
    } else if (c === "app_leftovers") {
      pushItem(map, "app-leftovers", e);
    } else if (c === "developer") {
      pushItem(map, "old-cache", e);
    } else if (c === "downloads_old") {
      pushItem(map, "old-downloads", e);
    } else if (c === "large_files" || c === "backups" || c === "duplicates") {
      pushItem(map, "large-files", e);
    } else {
      pushItem(map, "trash", e);
    }
  }
  return map;
}

export function cardBucketsToList(map: Map<CardBucketId, EnrichedItem[]>): CardBucket[] {
  return SCAN_RESULT_CARDS.map((def) => {
    const list = map.get(def.id) ?? [];
    const totalSize = list.reduce((a, x) => a + x.item.size, 0);
    return {
      def,
      totalSize,
      items: list,
      itemIds: list.map((x) => x.item.id),
    };
  });
}

export function getSafeCleanItemIds(buckets: CardBucket[]): string[] {
  const safeIds: string[] = [];
  for (const b of buckets) {
    if (b.def.riskLevel !== "safe" || b.totalSize <= 0) continue;
    for (const e of b.items) {
      if (e.risk === "safe" && e.item.recommended) safeIds.push(e.item.id);
    }
  }
  return safeIds;
}

export function sumBytesForIds(enriched: EnrichedItem[], ids: string[]): number {
  const set = new Set(ids);
  return enriched.filter((e) => set.has(e.item.id)).reduce((a, e) => a + e.item.size, 0);
}

export function getAllRecommendedSafeItemIds(enriched: EnrichedItem[]): string[] {
  return enriched.filter((e) => e.risk === "safe" && e.item.recommended).map((e) => e.item.id);
}
