import { describe, it, expect } from "vitest";
import { formatSize, formatCount, formatDate } from "@/lib/formatters";

describe("formatSize", () => {
  it("formats bytes correctly", () => {
    expect(formatSize(500)).toBe("500 B");
    expect(formatSize(1_500)).toBe("1.5 KB");
    expect(formatSize(1_500_000)).toBe("1.4 MB");
    expect(formatSize(1_500_000_000)).toBe("1.4 GB");
    expect(formatSize(1_500_000_000_000)).toBe("1.4 TB");
  });

  it("handles zero", () => {
    expect(formatSize(0)).toBe("0 B");
  });

  it("handles negative without throwing", () => {
    expect(() => formatSize(-1)).not.toThrow();
  });
});

describe("formatCount", () => {
  it("formats item counts", () => {
    expect(formatCount(0)).toBe("0 item");
    expect(formatCount(1)).toBe("1 item");
    expect(formatCount(1200)).toBe("1.200 item");
  });
});

describe("formatDate", () => {
  it("returns ISO date slice", () => {
    expect(formatDate(new Date("2026-01-15T12:00:00Z"))).toBe("2026-01-15");
  });
});
