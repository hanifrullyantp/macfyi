import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ScanResult } from "../types";

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
    { name: "macfyi-scan-persist" }
  )
);
