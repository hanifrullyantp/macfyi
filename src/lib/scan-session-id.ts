import type { ScanResult } from "../types";

/** Stable short id for the current scan payload (24h session grouping). */
export function buildScanSessionId(results: ScanResult[]): string {
  let h = 2166136261;
  for (const r of results) {
    const part = `${r.category}:${r.items.length}:${r.items[0]?.id ?? ""}`;
    for (let i = 0; i < part.length; i++) {
      h ^= part.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  }
  return `scan_${(h >>> 0).toString(36)}`;
}
