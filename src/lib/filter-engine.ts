import type { EnrichedItem } from "./results-types";
import type { FilterState, SortKey } from "./filter-state";

function compareItems(a: EnrichedItem, b: EnrichedItem, key: SortKey): number {
  switch (key) {
    case "size-desc":
      return b.item.size - a.item.size;
    case "size-asc":
      return a.item.size - b.item.size;
    case "date-desc":
      return b.item.lastAccessed.getTime() - a.item.lastAccessed.getTime();
    case "date-asc":
      return a.item.lastAccessed.getTime() - b.item.lastAccessed.getTime();
    default:
      return a.item.name.localeCompare(b.item.name);
  }
}

function sortEnriched(items: EnrichedItem[], primary: SortKey, secondary: SortKey | null): EnrichedItem[] {
  const out = [...items];
  out.sort((a, b) => {
    const p = compareItems(a, b, primary);
    if (p !== 0) return p;
    if (secondary && secondary !== primary) return compareItems(a, b, secondary);
    return a.item.id.localeCompare(b.item.id);
  });
  return out;
}

/**
 * Apply search + multi-select filters. Sorting is applied after filtering.
 */
export function filterEnriched(all: EnrichedItem[], state: FilterState): EnrichedItem[] {
  const q = state.search.trim().toLowerCase();
  const base = all.filter((x) => {
    if (q) {
      if (!x.item.name.toLowerCase().includes(q) && !x.item.path.toLowerCase().includes(q)) return false;
    }
    if (state.fileTypes.length > 0) {
      const ft = x.item.fileType ?? "other";
      if (!state.fileTypes.includes(ft)) return false;
    }
    if (state.risks.length > 0 && !state.risks.includes(x.risk)) return false;
    if (state.folders.length > 0) {
      const rf = x.item.rootFolder ?? "";
      if (!state.folders.includes(rf)) return false;
    }
    if (state.appKeys.length > 0) {
      const ak = x.item.associatedApp ?? "";
      if (!state.appKeys.includes(ak)) return false;
    }
    return true;
  });
  return sortEnriched(base, state.primarySort, state.secondarySort);
}
