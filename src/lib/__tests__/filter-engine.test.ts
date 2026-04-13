import { describe, it, expect } from "vitest";
import { filterEnriched } from "../filter-engine";
import { defaultFilterState } from "../filter-state";
import type { EnrichedItem } from "../results-types";
import type { FileItem } from "../../types";

function item(partial: Partial<FileItem> & Pick<FileItem, "id" | "name" | "path">): FileItem {
  return {
    size: 100,
    lastAccessed: new Date(),
    isDuplicate: false,
    aiSafetyScore: 0.9,
    category: "cache",
    recommended: true,
    ...partial,
  };
}

const base: EnrichedItem[] = [
  {
    item: item({ id: "a", name: "a.log", path: "/x/a.log", fileType: "other", rootFolder: "Logs" }),
    categoryKey: "logs",
    categoryLabel: "Logs",
    categorySafety: "safe",
    categoryRecommendation: "",
    categoryConfidence: 0.9,
    risk: "safe",
  },
  {
    item: item({ id: "b", name: "b.jpg", path: "/y/b.jpg", fileType: "image", rootFolder: "Pics" }),
    categoryKey: "large_files",
    categoryLabel: "Large",
    categorySafety: "safe",
    categoryRecommendation: "",
    categoryConfidence: 0.9,
    risk: "caution",
  },
];

describe("filterEnriched", () => {
  it("returns all when filter state is default", () => {
    const out = filterEnriched(base, defaultFilterState());
    expect(out.length).toBe(2);
  });

  it("filters by fileTypes", () => {
    const s = defaultFilterState();
    s.fileTypes = ["image"];
    const out = filterEnriched(base, s);
    expect(out.map((x) => x.item.id)).toEqual(["b"]);
  });

  it("filters by search", () => {
    const s = defaultFilterState();
    s.search = ".log";
    const out = filterEnriched(base, s);
    expect(out.length).toBe(1);
    expect(out[0].item.id).toBe("a");
  });
});
