import { CATEGORY_LABELS, type EnrichedItem, type RiskBand } from "./results-types";

export interface CategorySummary {
  id: string;
  label: string;
  size: number;
  percentage: number;
  color: string;
}

export interface SummaryData {
  totalDisk: number;
  usedDisk: number;
  canFree: number;
  afterClean: number;
  categories: CategorySummary[];
  safeCount: number;
  cautionCount: number;
  riskyCount: number;
}

export type SummaryContext = "all" | "junk" | "myfiles";

const CATEGORY_COLORS: Record<string, string> = {
  cache: "#00d4aa",
  large_files: "#6366f1",
  backups: "#f59e0b",
  downloads_old: "#10b981",
  app_leftovers: "#8b5cf6",
  duplicates: "#ec4899",
  logs: "#6b7280",
  developer: "#22d3ee",
  mail_attachments: "#f97316",
};

const CONTEXT_CATEGORY_KEYS: Record<SummaryContext, string[] | null> = {
  all: null,
  junk: ["cache", "logs", "mail_attachments", "downloads_old", "backups", "developer", "app_leftovers"],
  myfiles: ["large_files", "duplicates", "downloads_old", "backups"],
};

function normalizeContext(context: SummaryContext): SummaryContext {
  return context;
}

export function inferSummaryContext(title: string, categoryKeys: string[]): SummaryContext {
  const t = title.toLowerCase();
  if (t.includes("cleanup") || t.includes("junk")) return "junk";
  if (t.includes("clutter") || t.includes("my files") || t.includes("myfile")) return "myfiles";
  const junkHits = categoryKeys.filter((k) => CONTEXT_CATEGORY_KEYS.junk?.includes(k)).length;
  const myFilesHits = categoryKeys.filter((k) => CONTEXT_CATEGORY_KEYS.myfiles?.includes(k)).length;
  if (junkHits > myFilesHits) return "junk";
  if (myFilesHits > junkHits) return "myfiles";
  return "all";
}

export function transformToSummaryData(
  enriched: EnrichedItem[],
  params: {
    diskTotalGb?: number;
    freeGb?: number;
    context?: SummaryContext;
  } = {}
): SummaryData {
  const context = normalizeContext(params.context ?? "all");
  const relevantKeys = CONTEXT_CATEGORY_KEYS[context];

  const grouped = new Map<string, number>();
  let safeCount = 0;
  let cautionCount = 0;
  let riskyCount = 0;

  for (const row of enriched) {
    if (relevantKeys && !relevantKeys.includes(row.categoryKey)) continue;
    grouped.set(row.categoryKey, (grouped.get(row.categoryKey) ?? 0) + Math.max(0, row.item.size));
    const risk: RiskBand = row.risk;
    if (risk === "safe") safeCount += 1;
    else if (risk === "caution") cautionCount += 1;
    else riskyCount += 1;
  }

  const categoriesRaw = Array.from(grouped.entries())
    .map(([id, size]) => ({
      id,
      label: CATEGORY_LABELS[id] ?? id,
      size,
      color: CATEGORY_COLORS[id] ?? "#6b7280",
    }))
    .filter((x) => x.size > 0)
    .sort((a, b) => b.size - a.size);

  const canFree = categoriesRaw.reduce((sum, c) => sum + c.size, 0);
  const categories: CategorySummary[] = categoriesRaw.map((c) => ({
    ...c,
    percentage: canFree > 0 ? (c.size / canFree) * 100 : 0,
  }));

  const totalDisk = Math.max(0, (params.diskTotalGb ?? 0) * 1024 ** 3);
  const freeDisk = Math.max(0, (params.freeGb ?? 0) * 1024 ** 3);
  const usedDisk = totalDisk > 0 ? Math.max(0, totalDisk - freeDisk) : 0;
  const afterClean = totalDisk > 0 ? Math.max(0, usedDisk - canFree) : Math.max(0, canFree);

  return {
    totalDisk,
    usedDisk,
    canFree,
    afterClean,
    categories,
    safeCount,
    cautionCount,
    riskyCount,
  };
}
