import type { EnrichedItem, RiskBand } from "./results-types";

export interface RiskBucketStats {
  count: number;
  bytes: number;
}

export function aggregateRiskBuckets(items: EnrichedItem[]): Record<RiskBand, RiskBucketStats> {
  const empty = (): RiskBucketStats => ({ count: 0, bytes: 0 });
  const out: Record<RiskBand, RiskBucketStats> = {
    safe: empty(),
    caution: empty(),
    risky: empty(),
  };
  for (const x of items) {
    const b = out[x.risk];
    b.count += 1;
    b.bytes += x.item.size;
  }
  return out;
}

export function totalScanBytes(items: EnrichedItem[]): number {
  return items.reduce((acc, x) => acc + x.item.size, 0);
}

export interface CategorySlice {
  categoryKey: string;
  label: string;
  bytes: number;
}

export function aggregateByCategory(
  items: EnrichedItem[],
  labels: Record<string, string>
): CategorySlice[] {
  const m = new Map<string, number>();
  for (const x of items) {
    m.set(x.categoryKey, (m.get(x.categoryKey) ?? 0) + x.item.size);
  }
  return Array.from(m.entries())
    .map(([categoryKey, bytes]) => ({
      categoryKey,
      label: labels[categoryKey] ?? categoryKey,
      bytes,
    }))
    .filter((s) => s.bytes > 0)
    .sort((a, b) => b.bytes - a.bytes);
}

export function byteSharePct(bucketBytes: number, totalBytes: number): number {
  if (totalBytes <= 0) return 0;
  return Math.min(100, (bucketBytes / totalBytes) * 100);
}

export function countSharePct(count: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  return Math.min(100, (count / totalCount) * 100);
}

/** Heuristic only — TODO: refine from real clean benchmarks */
export function estimateCleanMinutesRecommended(recommendedItemCount: number): number {
  const base = Math.max(1, Math.ceil(recommendedItemCount / 400));
  return Math.min(30, base);
}

export function countRecommendedItems(items: EnrichedItem[]): number {
  return items.reduce((n, x) => n + (x.item.recommended ? 1 : 0), 0);
}
