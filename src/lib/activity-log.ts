export type ActivityKind = "scan_complete" | "cleanup_complete";

export interface ActivityEntry {
  id: string;
  at: number;
  kind: ActivityKind;
  /** Free disk in GB (approx) */
  freeGbBefore?: number;
  freeGbAfter?: number;
  /** Scan */
  itemsAnalyzed?: number;
  /** Cleanup */
  filesRemoved?: number;
  bytesFreed?: number;
  failedCount?: number;
  deletionMode?: "trash" | "permanent";
  /** Short labels for UI (filenames only, capped) */
  sampleNames?: string[];
}

const KEY = "macfyi.activity.v1";
const MAX = 80;

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadActivities(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ActivityEntry[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(entries: ActivityEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)));
}

export function appendActivity(entry: Omit<ActivityEntry, "id" | "at"> & { id?: string; at?: number }): void {
  const full: ActivityEntry = {
    ...entry,
    id: entry.id ?? uid(),
    at: entry.at ?? Date.now(),
  };
  const prev = loadActivities();
  save([full, ...prev]);
}

export function formatGb(n: number | undefined): string {
  if (n === undefined || Number.isNaN(n)) return "—";
  return `${n.toFixed(1)} GB`;
}
