import type { ScanResult } from "../types";
import { buildScanSessionId } from "./scan-session-id";

export { buildScanSessionId } from "./scan-session-id";

const STORAGE_PREFIX = "macfyi.selection.v1.";
const TTL_MS = 24 * 60 * 60 * 1000;

export interface PersistedSelection {
  scanSessionId: string;
  recommendedIds: string[];
  selectedIds: string[];
  savedAt: number;
}

function keyForSession(scanSessionId: string): string {
  return `${STORAGE_PREFIX}${scanSessionId}`;
}

export function loadPersistedSelection(scanSessionId: string): PersistedSelection | null {
  try {
    const raw = localStorage.getItem(keyForSession(scanSessionId));
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedSelection;
    if (data.scanSessionId !== scanSessionId) return null;
    if (Date.now() - data.savedAt > TTL_MS) {
      localStorage.removeItem(keyForSession(scanSessionId));
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function savePersistedSelection(data: PersistedSelection): void {
  try {
    localStorage.setItem(keyForSession(data.scanSessionId), JSON.stringify(data));
  } catch {
    /* quota */
  }
}

export function clearPersistedSelection(scanSessionId: string): void {
  try {
    localStorage.removeItem(keyForSession(scanSessionId));
  } catch {
    /* ignore */
  }
}

export function recommendedSetFromResults(results: ScanResult[]): Set<string> {
  const s = new Set<string>();
  for (const r of results) {
    for (const i of r.items) {
      if (i.recommended) s.add(i.id);
    }
  }
  return s;
}

export function filterIdsToScan(selected: Set<string>, results: ScanResult[]): Set<string> {
  const all = new Set<string>();
  for (const r of results) {
    for (const i of r.items) all.add(i.id);
  }
  return new Set([...selected].filter((id) => all.has(id)));
}

export function initSelectionFromScan(results: ScanResult[]): {
  scanSessionId: string;
  recommendedIds: Set<string>;
  selectedIds: Set<string>;
} {
  const scanSessionId = buildScanSessionId(results);
  const recommendedIds = recommendedSetFromResults(results);
  const persisted = loadPersistedSelection(scanSessionId);
  if (persisted) {
    const sel = filterIdsToScan(new Set(persisted.selectedIds), results);
    const rec = new Set(persisted.recommendedIds);
    return {
      scanSessionId,
      recommendedIds: rec.size ? rec : recommendedIds,
      selectedIds: sel.size ? sel : new Set(recommendedIds),
    };
  }
  return {
    scanSessionId,
    recommendedIds,
    selectedIds: new Set(recommendedIds),
  };
}
