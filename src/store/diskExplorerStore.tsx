import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DiskNode } from "../lib/types/diskExplorer";
import {
  diskExplorerCheckFullDiskAccess,
  diskExplorerExportReport,
  diskExplorerFileList,
  diskExplorerOpenFdaSettings,
  diskExplorerScanLevel,
  diskExplorerVolumeStats,
  movePathsToTrash,
  revealInFinder,
  type TrashResult,
} from "../lib/backend";
import type { DiskExplorerFileInfo } from "../lib/types/diskExplorer";
import { analyzeDiskExplorerFolder, calculateSavingsBytes } from "../lib/aiDiskAnalyzer";

export type Breadcrumb = { label: string; path: string };

type DiskExplorerContextValue = {
  breadcrumbs: Breadcrumb[];
  currentPath: string;
  nodes: DiskNode[];
  loading: boolean;
  error: string | null;
  fdaOk: boolean | null;
  volume: { totalBytes: number; usedBytes: number; freeBytes: number } | null;
  selectedPaths: string[];
  toggleSelect: (path: string) => void;
  clearSelection: () => void;
  selectAllSafe: () => void;
  refreshAll: () => Promise<void>;
  navigateTo: (path: string, label: string) => Promise<void>;
  navigateBreadcrumb: (index: number) => Promise<void>;
  openFda: () => Promise<void>;
  revealSelected: () => Promise<void>;
  trashSelected: () => Promise<TrashResult | null>;
  exportReport: (format: "json" | "txt") => Promise<string | null>;
  fileModalPath: string | null;
  fileModalRows: DiskExplorerFileInfo[];
  fileModalLoading: boolean;
  openFileModal: (path: string) => Promise<void>;
  closeFileModal: () => void;
  aiText: string;
  aiSource: "idle" | "local" | "kb";
  aiLoading: boolean;
  runAiInsight: () => Promise<void>;
  savingsBytes: number;
};

const DiskExplorerContext = createContext<DiskExplorerContextValue | null>(null);

export function DiskExplorerProvider({ children }: { children: ReactNode }) {
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ label: "~", path: "~" }]);
  const [currentPath, setCurrentPath] = useState("~");
  const [nodes, setNodes] = useState<DiskNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fdaOk, setFdaOk] = useState<boolean | null>(null);
  const [volume, setVolume] = useState<DiskExplorerContextValue["volume"]>(null);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [fileModalPath, setFileModalPath] = useState<string | null>(null);
  const [fileModalRows, setFileModalRows] = useState<DiskExplorerFileInfo[]>([]);
  const [fileModalLoading, setFileModalLoading] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiSource, setAiSource] = useState<"idle" | "local" | "kb">("idle");
  const [aiLoading, setAiLoading] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);

  const loadScan = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await diskExplorerScanLevel(path);
      setNodes(rows);
    } catch (e) {
      setNodes([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      setFdaOk(await diskExplorerCheckFullDiskAccess());
    } catch {
      setFdaOk(null);
    }
    try {
      setVolume(await diskExplorerVolumeStats());
    } catch {
      setVolume(null);
    }
    await loadScan(currentPath);
  }, [currentPath, loadScan]);

  const navigateTo = useCallback(
    async (path: string, label: string) => {
      setCurrentPath(path);
      setBreadcrumbs((prev) => [...prev, { label, path }]);
      setSelectedPaths([]);
      setAiText("");
      setAiSource("idle");
      await loadScan(path);
    },
    [loadScan]
  );

  const navigateBreadcrumb = useCallback(
    async (index: number) => {
      const bc = breadcrumbs[index];
      if (!bc) return;
      setBreadcrumbs((prev) => prev.slice(0, index + 1));
      setCurrentPath(bc.path);
      setSelectedPaths([]);
      setAiText("");
      setAiSource("idle");
      await loadScan(bc.path);
    },
    [breadcrumbs, loadScan]
  );

  const toggleSelect = useCallback((path: string) => {
    setSelectedPaths((prev) => {
      const node = nodes.find((n) => n.path === path);
      if (node?.riskLevel === "Locked") return prev;
      if (prev.includes(path)) return prev.filter((p) => p !== path);
      return [...prev, path];
    });
  }, [nodes]);

  const clearSelection = useCallback(() => setSelectedPaths([]), []);

  const selectAllSafe = useCallback(() => {
    const safe = nodes.filter((n) => n.riskLevel === "Safe" && n.isAccessible).map((n) => n.path);
    setSelectedPaths(safe);
  }, [nodes]);

  const openFda = useCallback(async () => {
    try {
      await diskExplorerOpenFdaSettings();
    } catch {
      /* */
    }
  }, []);

  const revealSelected = useCallback(async () => {
    const first = selectedPaths[0];
    if (!first) return;
    await revealInFinder(first);
  }, [selectedPaths]);

  const trashSelected = useCallback(async (): Promise<TrashResult | null> => {
    if (selectedPaths.length === 0) return null;
    const res = await movePathsToTrash(selectedPaths);
    setSelectedPaths([]);
    await loadScan(currentPath);
    return res;
  }, [currentPath, loadScan, nodes, selectedPaths]);

  const exportReport = useCallback(
    async (format: "json" | "txt") => {
      try {
        const p = await diskExplorerExportReport(nodes, format);
        return p;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return null;
      }
    },
    [nodes]
  );

  const openFileModal = useCallback(async (path: string) => {
    setFileModalPath(path);
    setFileModalLoading(true);
    setFileModalRows([]);
    try {
      const rows = await diskExplorerFileList(path, 200);
      setFileModalRows(rows);
    } catch {
      setFileModalRows([]);
    } finally {
      setFileModalLoading(false);
    }
  }, []);

  const closeFileModal = useCallback(() => {
    setFileModalPath(null);
    setFileModalRows([]);
  }, []);

  const runAiInsight = useCallback(async () => {
    setAiLoading(true);
    setAiText("");
    try {
      const { text, source } = await analyzeDiskExplorerFolder(nodes);
      setAiText(text);
      setAiSource(source);
    } finally {
      setAiLoading(false);
    }
  }, [nodes]);

  const savingsBytes = useMemo(() => calculateSavingsBytes(nodes, selectedSet), [nodes, selectedSet]);

  useEffect(() => {
    void (async () => {
      try {
        setFdaOk(await diskExplorerCheckFullDiskAccess());
      } catch {
        setFdaOk(null);
      }
      try {
        setVolume(await diskExplorerVolumeStats());
      } catch {
        setVolume(null);
      }
      await loadScan("~");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial mount only
  }, []);

  const value: DiskExplorerContextValue = {
    breadcrumbs,
    currentPath,
    nodes,
    loading,
    error,
    fdaOk,
    volume,
    selectedPaths,
    toggleSelect,
    clearSelection,
    selectAllSafe,
    refreshAll,
    navigateTo,
    navigateBreadcrumb,
    openFda,
    revealSelected,
    trashSelected,
    exportReport,
    fileModalPath,
    fileModalRows,
    fileModalLoading,
    openFileModal,
    closeFileModal,
    aiText,
    aiSource,
    aiLoading,
    runAiInsight,
    savingsBytes,
  };

  return <DiskExplorerContext.Provider value={value}>{children}</DiskExplorerContext.Provider>;
}

export function useDiskExplorerStore(): DiskExplorerContextValue {
  const ctx = useContext(DiskExplorerContext);
  if (!ctx) throw new Error("useDiskExplorerStore must be used within DiskExplorerProvider");
  return ctx;
}
