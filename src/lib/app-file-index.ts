import type { FileItem } from "../types";
import type { EnrichedItem } from "./results-types";

export interface AppFileGroup {
  appName: string;
  bundleId: string;
  iconHint: string;
  files: FileItem[];
  totalSize: number;
}

/** Enriched rows grouped for “By app” list (Issue 10) */
export interface AppEnrichedGroup {
  appName: string;
  items: EnrichedItem[];
  totalSize: number;
}

export { deriveAssociatedApp } from "./associated-app";

export function buildAppEnrichedGroups(enriched: EnrichedItem[]): AppEnrichedGroup[] {
  const map = new Map<string, EnrichedItem[]>();
  for (const e of enriched) {
    const key = e.item.associatedApp ?? "Other";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  const out: AppEnrichedGroup[] = [];
  for (const [appName, items] of map) {
    const totalSize = items.reduce((a, x) => a + x.item.size, 0);
    out.push({ appName, items, totalSize });
  }
  out.sort((a, b) => b.totalSize - a.totalSize);
  return out;
}

export function buildAppFileGroups(enriched: EnrichedItem[]): AppFileGroup[] {
  const map = new Map<string, FileItem[]>();
  for (const e of enriched) {
    const key = e.item.associatedApp ?? "Other";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e.item);
  }
  const out: AppFileGroup[] = [];
  for (const [appName, files] of map) {
    const totalSize = files.reduce((a, f) => a + f.size, 0);
    out.push({
      appName,
      bundleId: "",
      iconHint: "app",
      files,
      totalSize,
    });
  }
  out.sort((a, b) => b.totalSize - a.totalSize);
  return out;
}
