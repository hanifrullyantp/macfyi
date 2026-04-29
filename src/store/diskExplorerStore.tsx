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
import { getIsProEntitled } from "../lib/entitlement";
import type { DiskExplorerFileInfo } from "../lib/types/diskExplorer";
import { askAI } from "../lib/aiService";

export type Breadcrumb = { label: string; path: string };

type DiskExplorerContextValue = {
  breadcrumbs: Breadcrumb[];
  currentPath: string;
  nodes: DiskNode[];
  loading: boolean;
  hasScanned: boolean;
  lastScannedAt: Date | null;
  movingToTrash: boolean;
  error: string | null;
  fdaOk: boolean | null;
  volume: { totalBytes: number; usedBytes: number; freeBytes: number } | null;
  selectedPaths: string[];
  toggleSelect: (path: string) => void;
  clearSelection: () => void;
  selectAllSafe: () => void;
  refreshAll: () => Promise<void>;
  scan: (path: string, force?: boolean) => Promise<void>;
  startInitialScan: () => Promise<void>;
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
  aiSource: "idle" | "cloud" | "kb";
  aiLoading: boolean;
  runAiInsight: () => Promise<void>;
  savingsBytes: number;
  isDemoLimited: boolean;
  maxDemoDepth: number;
  currentDepth: number;
  depthLimitReached: boolean;
};

const DiskExplorerContext = createContext<DiskExplorerContextValue | null>(null);

type DiskExplorerSessionCache = {
  breadcrumbs: Breadcrumb[];
  currentPath: string;
  nodes: DiskNode[];
  hasScanned: boolean;
  lastScannedAt: number | null;
  fdaOk: boolean | null;
  volume: { totalBytes: number; usedBytes: number; freeBytes: number } | null;
};

let sessionCache: DiskExplorerSessionCache = {
  breadcrumbs: [{ label: "~", path: "~" }],
  currentPath: "~",
  nodes: [],
  hasScanned: false,
  lastScannedAt: null,
  fdaOk: null,
  volume: null,
};

export function DiskExplorerProvider({ children }: { children: ReactNode }) {
  const MAX_DEMO_DEPTH = 2;
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>(sessionCache.breadcrumbs);
  const [currentPath, setCurrentPath] = useState(sessionCache.currentPath);
  const [nodes, setNodes] = useState<DiskNode[]>(sessionCache.nodes);
  const [loading, setLoading] = useState(false);
  const [hasScanned, setHasScanned] = useState(sessionCache.hasScanned);
  const [lastScannedAt, setLastScannedAt] = useState<Date | null>(
    sessionCache.lastScannedAt ? new Date(sessionCache.lastScannedAt) : null
  );
  const [error, setError] = useState<string | null>(null);
  const [fdaOk, setFdaOk] = useState<boolean | null>(sessionCache.fdaOk);
  const [volume, setVolume] = useState<DiskExplorerContextValue["volume"]>(sessionCache.volume);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [movingToTrash, setMovingToTrash] = useState(false);
  const [fileModalPath, setFileModalPath] = useState<string | null>(null);
  const [fileModalRows, setFileModalRows] = useState<DiskExplorerFileInfo[]>([]);
  const [fileModalLoading, setFileModalLoading] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiSource, setAiSource] = useState<"idle" | "cloud" | "kb">("idle");
  const [aiLoading, setAiLoading] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);
  const isDemoLimited = !getIsProEntitled();
  const currentDepth = Math.max(0, breadcrumbs.length - 1);
  const depthLimitReached = isDemoLimited && currentDepth >= MAX_DEMO_DEPTH;

  const scan = useCallback(async (path: string, force = false) => {
    if (hasScanned && !force && path === currentPath) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await diskExplorerScanLevel(path);
      setNodes(rows);
      setHasScanned(true);
      setLastScannedAt(new Date());
    } catch (e) {
      setNodes([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [currentPath, hasScanned]);

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
    await scan(currentPath, true);
  }, [currentPath, scan]);

  const startInitialScan = useCallback(async () => {
    await refreshAll();
  }, [refreshAll]);

  const navigateTo = useCallback(
    async (path: string, label: string) => {
      const nextDepth = Math.max(0, breadcrumbs.length);
      if (isDemoLimited && nextDepth > MAX_DEMO_DEPTH) {
        setError(`DEMO_DEPTH_LIMIT:${MAX_DEMO_DEPTH}`);
        return;
      }
      setCurrentPath(path);
      setBreadcrumbs((prev) => [...prev, { label, path }]);
      setSelectedPaths([]);
      setAiText("");
      setAiSource("idle");
      await scan(path, true);
    },
    [MAX_DEMO_DEPTH, breadcrumbs.length, isDemoLimited, scan]
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
      await scan(bc.path, true);
    },
    [breadcrumbs, scan]
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
    if (!getIsProEntitled()) {
      throw new Error("Penghapusan hanya tersedia untuk Pro.");
    }
    setMovingToTrash(true);
    try {
      // Temporary investigation logs for trash flow visibility.
      console.log("[DiskExplorer] Selected:", selectedPaths);
      const res = await movePathsToTrash(selectedPaths);
      console.log("[DiskExplorer] Move result:", res);
      setSelectedPaths([]);
      if (res.succeeded.length > 0) {
        setNodes((prev) => prev.filter((n) => !res.succeeded.includes(n.path)));
      }
      if (res.failed.length > 0) {
        setError(res.failed.map((f) => `${f.path}: ${f.message}`).join(" | "));
      }
      await scan(currentPath, true);
      return res;
    } finally {
      setMovingToTrash(false);
    }
  }, [currentPath, scan, selectedPaths]);

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
      const context = nodes
        .slice(0, 12)
        .map((n) => `${n.displayName} | ${n.nodeType} | ${n.riskLevel} | ${n.redactedPath}`)
        .join("\n");
      const result = await askAI("Jelaskan pola folder ini dan saran cleanup aman.", context);
      setAiText(result.response);
      setAiSource(result.provider === "kb" ? "kb" : "cloud");
    } finally {
      setAiLoading(false);
    }
  }, [nodes]);

  const savingsBytes = useMemo(
    () => nodes.reduce((sum, n) => (selectedSet.has(n.path) ? sum + n.sizeBytes : sum), 0),
    [nodes, selectedSet]
  );

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
      if (!sessionCache.hasScanned) {
        setNodes([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial mount only
  }, []);

  useEffect(() => {
    sessionCache = {
      breadcrumbs,
      currentPath,
      nodes,
      hasScanned,
      lastScannedAt: lastScannedAt ? lastScannedAt.getTime() : null,
      fdaOk,
      volume,
    };
  }, [breadcrumbs, currentPath, fdaOk, hasScanned, lastScannedAt, nodes, volume]);

  const value: DiskExplorerContextValue = {
    breadcrumbs,
    currentPath,
    nodes,
    loading,
    hasScanned,
    lastScannedAt,
    movingToTrash,
    error,
    fdaOk,
    volume,
    selectedPaths,
    toggleSelect,
    clearSelection,
    selectAllSafe,
    refreshAll,
    scan,
    startInitialScan,
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
    isDemoLimited,
    maxDemoDepth: MAX_DEMO_DEPTH,
    currentDepth,
    depthLimitReached,
  };

  return <DiskExplorerContext.Provider value={value}>{children}</DiskExplorerContext.Provider>;
}

export function useDiskExplorerStore(): DiskExplorerContextValue {
  const ctx = useContext(DiskExplorerContext);
  if (!ctx) throw new Error("useDiskExplorerStore must be used within DiskExplorerProvider");
  return ctx;
}
