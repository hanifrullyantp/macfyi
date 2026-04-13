import type { FileType } from "../types";
import type { RiskBand } from "./results-types";

/** Primary sort axis (also used as secondary tie-breaker). */
export type SortKey =
  | "size-desc"
  | "size-asc"
  | "date-desc"
  | "date-asc"
  | "name";

export interface FilterState {
  search: string;
  /** Empty arrays mean “no restriction” (all). */
  fileTypes: FileType[];
  risks: RiskBand[];
  /** `rootFolder` values from scan items */
  folders: string[];
  /** `associatedApp` keys from items (Issue 10) */
  appKeys: string[];
  primarySort: SortKey;
  secondarySort: SortKey | null;
}

export function defaultFilterState(): FilterState {
  return {
    search: "",
    fileTypes: [],
    risks: [],
    folders: [],
    appKeys: [],
    primarySort: "size-desc",
    secondarySort: null,
  };
}

export function cloneFilterState(s: FilterState): FilterState {
  return {
    search: s.search,
    fileTypes: [...s.fileTypes],
    risks: [...s.risks],
    folders: [...s.folders],
    appKeys: [...s.appKeys],
    primarySort: s.primarySort,
    secondarySort: s.secondarySort,
  };
}

/** Number of independent filter dimensions currently narrowing the list (for badge). */
export function countActiveFilterDimensions(state: FilterState): number {
  let n = 0;
  if (state.search.trim().length > 0) n++;
  if (state.fileTypes.length > 0) n++;
  if (state.risks.length > 0) n++;
  if (state.folders.length > 0) n++;
  if (state.appKeys.length > 0) n++;
  return n;
}

export function isFilterActive(state: FilterState): boolean {
  return countActiveFilterDimensions(state) > 0;
}
