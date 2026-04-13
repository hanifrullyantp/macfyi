import type { FileItem, SafetyLevel, ScanResult } from "../types";
import { attachAssociatedApp } from "./associated-app";

export type RiskBand = "safe" | "caution" | "risky";

export interface EnrichedItem {
  item: FileItem;
  categoryKey: string;
  categoryLabel: string;
  categorySafety: SafetyLevel;
  categoryRecommendation: string;
  categoryConfidence: number;
  risk: RiskBand;
}

export const CATEGORY_LABELS: Record<string, string> = {
  cache: "Caches",
  duplicates: "Duplicates",
  large_files: "Large Files",
  backups: "Backups",
  developer: "Developer",
  logs: "Logs",
  downloads_old: "Old Downloads",
  mail_attachments: "Mail Attachments",
  app_leftovers: "Orphaned App Files",
};

export function riskFromItem(item: FileItem, categorySafety: SafetyLevel): RiskBand {
  if (item.aiSafetyScore >= 0.75) return "safe";
  if (item.aiSafetyScore >= 0.45) return "caution";
  if (categorySafety === "safe" && item.aiSafetyScore >= 0.35) return "caution";
  return "risky";
}

export function enrichScanResults(results: ScanResult[]): EnrichedItem[] {
  return results.flatMap((r) => {
    const items = attachAssociatedApp(r.items);
    return items.map((item) => ({
      item,
      categoryKey: r.category,
      categoryLabel: CATEGORY_LABELS[r.category] ?? r.category,
      categorySafety: r.safety_level,
      categoryRecommendation: r.recommendation,
      categoryConfidence: r.confidence,
      risk: riskFromItem(item, r.safety_level),
    }));
  });
}
