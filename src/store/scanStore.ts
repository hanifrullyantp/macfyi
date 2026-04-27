import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { ScanResult } from "../types";

const PERSIST_KEY = "macfyi-scan-persist";
/** Cap persisted file rows to avoid localStorage QuotaExceededError (WKWebView limit ~5–10MB). */
const MAX_PERSISTED_SCAN_ITEMS = 1500;

function trimResultsForPersist(results: ScanResult[] | null): ScanResult[] | null {
  if (!results?.length) return results;
  let remaining = MAX_PERSISTED_SCAN_ITEMS;
  const out: ScanResult[] = [];
  for (const r of results) {
    if (remaining <= 0) break;
    const items = r.items.slice(0, remaining);
    remaining -= items.length;
    out.push({ ...r, items });
  }
  return out;
}

const safeLocalStorage: StateStorage = {
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      const q = e instanceof DOMException && e.name === "QuotaExceededError";
      if (!q) throw e;
      try {
        localStorage.removeItem(name);
        const parsed = JSON.parse(value) as {
          state?: { lastScanAt?: string | null; results?: unknown };
          version?: number;
        };
        const st = parsed.state;
        const mini = JSON.stringify({
          state: { lastScanAt: st?.lastScanAt ?? null, results: null },
          version: parsed.version ?? 0,
        });
        localStorage.setItem(name, mini);
      } catch {
        /* best-effort: app continues without persisting */
      }
    }
  },
  removeItem: (name) => localStorage.removeItem(name),
};

/** Persisted scan snapshot for badge / resume (paths are local; keep device-appropriate). */
interface ScanStoreState {
  lastScanAt: string | null;
  results: ScanResult[] | null;
  setFromScan: (results: ScanResult[]) => void;
  clear: () => void;
}

export const useScanStore = create<ScanStoreState>()(
  persist(
    (set) => ({
      lastScanAt: null,
      results: null,
      setFromScan: (results) =>
        set({
          results,
          lastScanAt: new Date().toISOString(),
        }),
      clear: () => set({ results: null, lastScanAt: null }),
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (s) => ({
        lastScanAt: s.lastScanAt,
        results: trimResultsForPersist(s.results),
      }),
    }
  )
);
