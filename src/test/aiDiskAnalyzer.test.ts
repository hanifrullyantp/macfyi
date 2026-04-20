import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildRedactedFolderSummary,
  calculateSavingsBytes,
  analyzeDiskExplorerFolder,
  nodeTypeToKbCategory,
  riskLevelToAiLabel,
} from "@/lib/aiDiskAnalyzer";
import type { DiskNode } from "@/lib/types/diskExplorer";

vi.mock("@/lib/backend", () => ({
  aiCancelGeneration: vi.fn(() => Promise.resolve()),
  aiGenerate: vi.fn(() => Promise.resolve()),
  aiStatus: vi.fn(() =>
    Promise.resolve({
      enabled: false,
      selectedModel: "lite" as const,
      liteInstalled: false,
      betterInstalled: false,
      downloadInProgress: false,
      panelOpen: false,
      memoryPressureHigh: false,
    })
  ),
  onAiToken: vi.fn(() => Promise.resolve(() => {})),
}));

const mockNodes: DiskNode[] = [
  {
    path: "/Users/testuser/Library/Caches",
    displayName: "Caches",
    redactedPath: "~/Library/Caches",
    sizeBytes: 5_368_709_120,
    itemCount: 1200,
    children: [],
    nodeType: "Cache",
    riskLevel: "Safe",
    isExpandable: true,
    isAccessible: true,
  },
  {
    path: "/Users/testuser/Library/Developer",
    displayName: "Developer",
    redactedPath: "~/Library/Developer",
    sizeBytes: 33_285_996_544,
    itemCount: 8900,
    children: [],
    nodeType: "Developer",
    riskLevel: "Caution",
    isExpandable: true,
    isAccessible: true,
  },
];

describe("aiDiskAnalyzer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildRedactedFolderSummary", () => {
    it("does not contain raw home username segments from node.path", () => {
      const summary = buildRedactedFolderSummary(mockNodes);
      expect(summary).not.toContain("testuser");
      expect(summary).not.toContain("/Users/testuser");
      expect(summary).toContain("~/Library/Caches");
    });

    it("mentions risk levels", () => {
      const summary = buildRedactedFolderSummary(mockNodes);
      expect(summary).toMatch(/Safe|Caution/);
    });
  });

  describe("calculateSavingsBytes", () => {
    it("sums only selected paths", () => {
      const selected = new Set<string>([mockNodes[0]!.path]);
      expect(calculateSavingsBytes(mockNodes, selected)).toBe(5_368_709_120);
    });

    it("returns 0 when nothing selected", () => {
      expect(calculateSavingsBytes(mockNodes, new Set())).toBe(0);
    });
  });

  describe("analyzeDiskExplorerFolder", () => {
    it("returns KB source when local AI unavailable", async () => {
      const { text, source } = await analyzeDiskExplorerFolder(mockNodes);
      expect(source).toBe("kb");
      expect(text.length).toBeGreaterThan(0);
    });

    it("handles empty nodes", async () => {
      const { text, source } = await analyzeDiskExplorerFolder([]);
      expect(source).toBe("kb");
      expect(text).toContain("Tidak ada");
    });
  });

  describe("nodeTypeToKbCategory", () => {
    it("maps Cache to cache", () => {
      expect(nodeTypeToKbCategory("Cache")).toBe("cache");
    });
  });

  describe("riskLevelToAiLabel", () => {
    it("maps Safe to SAFE", () => {
      expect(riskLevelToAiLabel("Safe")).toBe("SAFE");
    });
  });
});
