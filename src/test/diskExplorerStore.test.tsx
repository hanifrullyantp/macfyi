import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { DiskExplorerProvider, useDiskExplorerStore } from "@/store/diskExplorerStore";
import type { DiskNode } from "@/lib/types/diskExplorer";
import type { ReactNode } from "react";
import { I18nProvider } from "@/i18n/context";

const scanMock = vi.fn<(path: string) => Promise<DiskNode[]>>();
const fdaMock = vi.fn<() => Promise<boolean>>();
const volMock = vi.fn<() => Promise<{ totalBytes: number; usedBytes: number; freeBytes: number }>>();

vi.mock("@/lib/backend", () => ({
  diskExplorerCheckFullDiskAccess: () => fdaMock(),
  diskExplorerVolumeStats: () => volMock(),
  diskExplorerScanLevel: (path: string) => scanMock(path),
  diskExplorerOpenFdaSettings: vi.fn(() => Promise.resolve()),
  diskExplorerExportReport: vi.fn(() => Promise.resolve("/tmp/out.json")),
  diskExplorerFileList: vi.fn(() => Promise.resolve([])),
  movePathsToTrash: vi.fn(() =>
    Promise.resolve({ freed_label: "0 B", freed_bytes: 0, succeeded: [], failed: [] })
  ),
  revealInFinder: vi.fn(() => Promise.resolve()),
}));

function wrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <DiskExplorerProvider>{children}</DiskExplorerProvider>
    </I18nProvider>
  );
}

const sampleRow: DiskNode = {
  path: "/Users/test/Downloads",
  displayName: "Downloads",
  redactedPath: "~/Downloads",
  sizeBytes: 1_000_000_000,
  itemCount: 42,
  children: [],
  nodeType: "Downloads",
  riskLevel: "Safe",
  isExpandable: true,
  isAccessible: true,
};

describe("diskExplorerStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fdaMock.mockResolvedValue(true);
    volMock.mockResolvedValue({ totalBytes: 1, usedBytes: 1, freeBytes: 1 });
    scanMock.mockImplementation(async () => []);
  });

  it("mounts and loads home scan", async () => {
    renderHook(() => useDiskExplorerStore(), { wrapper });
    await waitFor(() => expect(scanMock).toHaveBeenCalledWith("~"));
  });

  it("navigateTo updates currentPath and nodes", async () => {
    scanMock.mockImplementation(async (path: string) => {
      if (path === "/Users/test") return [sampleRow];
      return [];
    });
    const { result } = renderHook(() => useDiskExplorerStore(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.navigateTo("/Users/test", "test");
    });

    expect(result.current.currentPath).toBe("/Users/test");
    expect(result.current.nodes).toHaveLength(1);
    expect(result.current.loading).toBe(false);
  });

  it("toggleSelect adds and removes paths", async () => {
    scanMock.mockImplementation(async (path: string) => {
      if (path === "~") return [sampleRow];
      return [];
    });
    const { result } = renderHook(() => useDiskExplorerStore(), { wrapper });
    await waitFor(() => result.current.nodes.length === 1);

    act(() => {
      result.current.toggleSelect(sampleRow.path);
    });
    expect(result.current.selectedPaths).toContain(sampleRow.path);

    act(() => {
      result.current.toggleSelect(sampleRow.path);
    });
    expect(result.current.selectedPaths).not.toContain(sampleRow.path);
  });

  it("does not select Locked rows", async () => {
    const locked: DiskNode = {
      ...sampleRow,
      path: "/System",
      displayName: "System",
      riskLevel: "Locked",
      isExpandable: false,
      isAccessible: false,
    };
    scanMock.mockImplementation(async (path: string) => {
      if (path === "~") return [locked];
      return [];
    });
    const { result } = renderHook(() => useDiskExplorerStore(), { wrapper });
    await waitFor(() => expect(result.current.nodes).toHaveLength(1));

    act(() => {
      result.current.toggleSelect(locked.path);
    });
    expect(result.current.selectedPaths).not.toContain(locked.path);
  });

  it("refreshAll updates fdaOk from backend", async () => {
    fdaMock.mockResolvedValue(true);
    const { result } = renderHook(() => useDiskExplorerStore(), { wrapper });
    await waitFor(() => expect(result.current.fdaOk).toBe(true));

    fdaMock.mockResolvedValue(false);
    await act(async () => {
      await result.current.refreshAll();
    });

    expect(result.current.fdaOk).toBe(false);
  });
});
