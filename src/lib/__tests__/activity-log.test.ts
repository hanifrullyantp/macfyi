import { describe, it, expect, beforeEach } from "vitest";
import {
  appendActivity,
  clearAllActivities,
  formatGb,
  loadActivities,
  removeActivity,
} from "../activity-log";

describe("formatGb", () => {
  it("formats defined numbers to one decimal", () => {
    expect(formatGb(12.345)).toBe("12.3 GB");
    expect(formatGb(0)).toBe("0.0 GB");
  });

  it("returns em dash for undefined or NaN", () => {
    expect(formatGb(undefined)).toBe("—");
    expect(formatGb(Number.NaN)).toBe("—");
  });
});

describe("activity log persistence", () => {
  beforeEach(() => {
    clearAllActivities();
  });

  it("appendActivity prepends and respects max window via save", () => {
    expect(loadActivities()).toEqual([]);
    appendActivity({
      kind: "scan_complete",
      itemsAnalyzed: 3,
      freeGbBefore: 10,
      freeGbAfter: 10.1,
    });
    const rows = loadActivities();
    expect(rows.length).toBe(1);
    expect(rows[0]?.kind).toBe("scan_complete");
    expect(rows[0]?.itemsAnalyzed).toBe(3);
  });

  it("removeActivity drops by id", () => {
    appendActivity({ kind: "cleanup_complete", filesRemoved: 1, bytesFreed: 100 });
    const id = loadActivities()[0]!.id;
    expect(removeActivity(id)).toBe(true);
    expect(loadActivities()).toEqual([]);
    expect(removeActivity("nope")).toBe(false);
  });
});
