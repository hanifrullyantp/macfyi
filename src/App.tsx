import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { AppShell, type FeatureId } from "./components/AppShell";
import { SmartCareDashboard } from "./components/SmartCareDashboard";
import type { OrbDisplayMode } from "./components/ScanOrbButton";
import type {
  CleanFinishDetail,
  FileItem,
  ReviewOrbIntent,
  ScanResult,
  StorageEntry,
  TrashListItem,
  UninstallAppEntry,
} from "./types";
import {
  appAudit,
  aiClosePanel,
  aiOpenPanel,
  getDiskStats,
  getStorageBreakdown,
  listTrashItems,
  listUninstallApps,
  orphanDetect,
  shellProbe,
} from "./lib/backend";
import { addSavedThisMonth, recordScanComplete } from "./lib/storage";
import { FolderSearch, Trash2 } from "lucide-react";
import { getDeletionMode } from "./lib/deletion-settings";
import { appendActivity } from "./lib/activity-log";
import { useI18n } from "./i18n/context";
import { loadSettings } from "./components/SettingsPanel";
import { playCleanDone, playScanComplete } from "./lib/sound";
import { notifyCleanComplete, notifyScanComplete } from "./lib/notifications";
import {
  OnboardingTour,
  hasCompletedOnboarding,
  resetOnboardingCompletion,
} from "./components/OnboardingTour";
import { ActivationScreen } from "./components/ActivationScreen";
import { getStoredLicenseToken, shouldSkipLicenseGate } from "./lib/activation";
import { isDemoMode, setDemoSession } from "./lib/demoSession";
import { fetchPublicConfig } from "./lib/publicConfig";
import { formatIdrShort } from "./lib/formatIdr";
import { sendClientTelemetry } from "./lib/telemetry";
import { MonitorDashboard } from "./components/MonitorDashboard";
import { AIAssistantPromptBanner } from "./components/AIAssistantPromptBanner";

const Scanner = lazy(async () => {
  const m = await import("./components/Scanner");
  return { default: m.Scanner };
});
const ResultsView = lazy(async () => {
  const m = await import("./components/ResultsView");
  return { default: m.ResultsView };
});
const AiAssistantPanel = lazy(async () => {
  const m = await import("./components/AiAssistantPanel");
  return { default: m.AiAssistantPanel };
});
const SearchOverlay = lazy(async () => {
  const m = await import("./components/SearchOverlay");
  return { default: m.SearchOverlay };
});
const SettingsPanel = lazy(async () => {
  const m = await import("./components/SettingsPanel");
  return { default: m.SettingsPanel };
});
const FilePreviewPanel = lazy(async () => {
  const m = await import("./components/FilePreviewPanel");
  return { default: m.FilePreviewPanel };
});
const UpgradePrompt = lazy(async () => {
  const m = await import("./components/UpgradePrompt");
  return { default: m.UpgradePrompt };
});
const AppUninstallerView = lazy(async () => {
  const m = await import("./components/AppUninstallerView");
  return { default: m.AppUninstallerView };
});
const UserTrashView = lazy(async () => {
  const m = await import("./components/UserTrashView");
  return { default: m.UserTrashView };
});
const ActivityHistoryView = lazy(async () => {
  const m = await import("./components/ActivityHistoryView");
  return { default: m.ActivityHistoryView };
});
const PerformanceView = lazy(async () => {
  const m = await import("./components/PerformanceView");
  return { default: m.PerformanceView };
});

function ViewFallback() {
  const { t } = useI18n();
  return <div className="h-full w-full flex items-center justify-center text-white/35 text-sm">{t("loading")}</div>;
}

const CLEANUP_CATEGORIES = new Set(["cache", "logs", "mail_attachments", "downloads_old", "backups", "developer"]);
const CLUTTER_CATEGORIES = new Set(["duplicates", "large_files", "app_leftovers"]);

function estimateSafePotential(results: ScanResult[]): string {
  if (results.length === 0) return "0 MB";
  let bytes = 0;
  results.forEach((r) => {
    r.items.forEach((i) => {
      if (i.recommended) bytes += i.size;
    });
  });
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function filterByFeature(results: ScanResult[], feature: FeatureId): ScanResult[] {
  if (feature === "cleanup") return results.filter((r) => CLEANUP_CATEGORIES.has(r.category));
  if (feature === "my-clutter") return results.filter((r) => CLUTTER_CATEGORIES.has(r.category));
  return results;
}

function EmptyModule({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="h-full flex items-center justify-center px-6 text-center">
      <div className="max-w-lg">
        <h2 className="text-3xl font-semibold text-white tracking-tight">{title}</h2>
        <p className="text-sm text-white/60 mt-2">{description}</p>
        <button
          type="button"
          onClick={onAction}
          className="mt-5 btn-primary"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

function FeatureHero({
  title,
  subtitle,
  bullets,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  subtitle: string;
  bullets: string[];
  actionLabel?: string;
  onAction?: () => void;
  icon: ReactNode;
}) {
  return (
    <div className="h-full flex items-center px-5 py-6 sm:px-8 sm:py-8">
      <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
        <div className="flex justify-center lg:justify-start">
          <div className="relative">
            <div className="w-52 h-52 sm:w-60 sm:h-60 lg:w-64 lg:h-64 rounded-[32px] sm:rounded-[36px] bg-white/[0.06] border border-white/10 shadow-lg flex items-center justify-center">
              <div className="w-36 h-36 sm:w-40 sm:h-40 lg:w-44 lg:h-44 rounded-[24px] sm:rounded-[26px] bg-white/[0.08] border border-white/10 flex items-center justify-center [&_svg]:w-14 [&_svg]:h-14 sm:[&_svg]:w-16 sm:[&_svg]:h-16 lg:[&_svg]:w-[4.5rem] lg:[&_svg]:h-[4.5rem]">
                {icon}
              </div>
            </div>
            <div className="absolute -inset-6 rounded-full bg-white/[0.04] blur-2xl pointer-events-none" />
          </div>
        </div>
        <div>
          <h2 className="text-3xl leading-tight sm:text-4xl sm:leading-tight lg:text-[2.75rem] lg:leading-[1.1] font-semibold text-white tracking-tight text-balance">
            {title}
          </h2>
          <p className="text-lg sm:text-xl lg:text-2xl text-white/[0.65] mt-2 sm:mt-3 max-w-xl text-balance">
            {subtitle}
          </p>
          <ul className="mt-5 sm:mt-6 space-y-2 sm:space-y-3">
            {bullets.map((b) => (
              <li key={b} className="text-sm sm:text-base text-white/80 inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
                {b}
              </li>
            ))}
          </ul>
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="mt-8 btn-secondary px-5 py-2.5 border border-white/20"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Shared neutral canvas + single accent orb (variation by copy/icon, not rainbow backgrounds). */
const CONTENT_BG =
  "from-[#1c1e26] via-[#181a22] to-[#13151c]";

const FEATURE_THEME: Record<FeatureId, { bg: string; orbSubKey: string; shellTitleKey: string }> = {
  "smart-care": {
    bg: CONTENT_BG,
    orbSubKey: "orb.subSmart",
    shellTitleKey: "shell.smartCare",
  },
  cleanup: {
    bg: CONTENT_BG,
    orbSubKey: "shell.cleanup",
    shellTitleKey: "shell.cleanup",
  },
  "my-clutter": {
    bg: CONTENT_BG,
    orbSubKey: "shell.myClutter",
    shellTitleKey: "shell.myClutter",
  },
  monitor: {
    bg: CONTENT_BG,
    orbSubKey: "shell.monitor",
    shellTitleKey: "shell.monitor",
  },
  history: {
    bg: CONTENT_BG,
    orbSubKey: "shell.history",
    shellTitleKey: "shell.history",
  },
  settings: {
    bg: CONTENT_BG,
    orbSubKey: "shell.settings",
    shellTitleKey: "shell.settings",
  },
  uninstaller: {
    bg: CONTENT_BG,
    orbSubKey: "shell.uninstaller",
    shellTitleKey: "shell.uninstaller",
  },
  "user-trash": {
    bg: CONTENT_BG,
    orbSubKey: "shell.userTrash",
    shellTitleKey: "shell.userTrash",
  },
  performance: {
    bg: CONTENT_BG,
    orbSubKey: "orb.subSmart",
    shellTitleKey: "shell.performance",
  },
};

export default function App() {
  const { t } = useI18n();
  const [appState, setAppState] = useState<"idle" | "scanning" | "results">("idle");
  const [activeFeature, setActiveFeature] = useState<FeatureId>("smart-care");
  const [reviewOrbIntent, setReviewOrbIntent] = useState<ReviewOrbIntent | null>(null);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [aiActiveContext, setAiActiveContext] = useState<import("./types").AiItemContext | null>(null);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [deletionMode, setDeletionMode] = useState<"trash" | "permanent">(() => getDeletionMode());
  const [shellCleaning, setShellCleaning] = useState(false);
  const [scanProgressPct, setScanProgressPct] = useState(0);
  const [, setSelectionSummary] = useState<{ count: number; bytesLabel: string } | null>(null);
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [freeSpace, setFreeSpace] = useState(0);
  const [diskTotalGb, setDiskTotalGb] = useState(0);
  const [storageEntries, setStorageEntries] = useState<StorageEntry[]>([]);
  const [perfRefreshTick, setPerfRefreshTick] = useState(0);
  const [perfLoading, setPerfLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !hasCompletedOnboarding());
  const [licenseGatePassed, setLicenseGatePassed] = useState(
    () => shouldSkipLicenseGate() || !!getStoredLicenseToken() || isDemoMode()
  );
  const [activatePrefill, setActivatePrefill] = useState<{ email?: string; license?: string }>({});
  const [marketingSiteUrl, setMarketingSiteUrl] = useState<string | null>(null);
  const [upgradePriceShort, setUpgradePriceShort] = useState<string | null>(null);
  const [trashItems, setTrashItems] = useState<TrashListItem[] | null>(null);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashLoadError, setTrashLoadError] = useState<string | null>(null);
  const [uninstallerApps, setUninstallerApps] = useState<UninstallAppEntry[] | null>(null);
  const [uninstallerOrphans, setUninstallerOrphans] = useState<FileItem[] | null>(null);
  const [uninstallerAppsLoading, setUninstallerAppsLoading] = useState(false);
  const [uninstallerOrphansLoading, setUninstallerOrphansLoading] = useState(false);
  const [uninstallerLoadError, setUninstallerLoadError] = useState<string | null>(null);
  const [aiBannerVisible, setAiBannerVisible] = useState(false);
  const [aiBannerIndex, setAiBannerIndex] = useState(0);
  const [smartCareOverviewLoading, setSmartCareOverviewLoading] = useState(false);
  const lastOverviewPrefetchRef = useRef(0);
  const overviewPrefetchInFlightRef = useRef(false);

  const OVERVIEW_TTL_MS = 5 * 60 * 1000;

  const prefetchSmartCareOverview = useCallback(
    async (force: boolean) => {
      if (overviewPrefetchInFlightRef.current) return;
      const now = Date.now();
      if (!force && now - lastOverviewPrefetchRef.current < OVERVIEW_TTL_MS) return;
      overviewPrefetchInFlightRef.current = true;
      setSmartCareOverviewLoading(true);
      setUninstallerLoadError(null);
      setTrashLoadError(null);
      try {
        const settled = await Promise.allSettled([
          listUninstallApps(),
          orphanDetect(),
          listTrashItems(),
        ]);
        if (settled[0].status === "fulfilled") {
          setUninstallerApps(settled[0].value);
        } else {
          const msg =
            settled[0].reason instanceof Error ? settled[0].reason.message : String(settled[0].reason);
          setUninstallerLoadError(msg);
        }
        if (settled[1].status === "fulfilled") {
          setUninstallerOrphans(settled[1].value);
        } else if (settled[0].status === "fulfilled") {
          const msg =
            settled[1].reason instanceof Error ? settled[1].reason.message : String(settled[1].reason);
          setUninstallerLoadError((prev) => (prev ? `${prev}; ${msg}` : msg));
        }
        if (settled[2].status === "fulfilled") {
          setTrashItems(settled[2].value);
          setTrashLoadError(null);
        } else {
          const msg =
            settled[2].reason instanceof Error ? settled[2].reason.message : String(settled[2].reason);
          setTrashLoadError(msg);
        }
        lastOverviewPrefetchRef.current = Date.now();
      } finally {
        overviewPrefetchInFlightRef.current = false;
        setSmartCareOverviewLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!licenseGatePassed) return;
    if (activeFeature !== "smart-care" || appState !== "idle") return;

    const run = () => {
      void prefetchSmartCareOverview(false);
    };
    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(run, { timeout: 2500 });
    } else {
      timeoutId = window.setTimeout(run, 500);
    }
    return () => {
      if (idleId !== undefined && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [licenseGatePassed, activeFeature, appState, prefetchSmartCareOverview]);

  /** Storage breakdown for dashboard chart — non-blocking when empty */
  useEffect(() => {
    if (!licenseGatePassed) return;
    if (activeFeature !== "smart-care" || appState !== "idle") return;
    if (storageEntries.length > 0) return;
    void getStorageBreakdown().then(setStorageEntries).catch(() => {});
  }, [licenseGatePassed, activeFeature, appState, storageEntries.length]);

  useEffect(() => {
    if (isAIChatOpen) {
      void aiOpenPanel();
    } else {
      void aiClosePanel();
    }
  }, [isAIChatOpen]);

  /** Disk stats only — no user-folder walks (avoids macOS Documents TCC on cold start). */
  useEffect(() => {
    getDiskStats().then((s) => {
      setFreeSpace(s.free_gb);
      setDiskTotalGb(s.total_gb);
    });
  }, []);

  /** Harga lifetime untuk CTA upgrade — mengikuti admin (`app_settings` → public-config). */
  useEffect(() => {
    void fetchPublicConfig(false).then((cfg) => {
      const idr = cfg?.pricing?.lifetime_price_idr;
      if (typeof idr === "number" && idr > 0) setUpgradePriceShort(formatIdrShort(idr));
    });
  }, []);

  const monitorBreakdownAttemptedRef = useRef(false);

  /** Folder breakdown is deferred until Monitor or Smart Scan — avoids long startup / TCC work on cold open. */
  useEffect(() => {
    if (activeFeature !== "monitor") {
      monitorBreakdownAttemptedRef.current = false;
      return;
    }
    if (!licenseGatePassed) return;
    if (monitorBreakdownAttemptedRef.current) return;
    monitorBreakdownAttemptedRef.current = true;
    if (storageEntries.length > 0) return;
    getStorageBreakdown().then(setStorageEntries).catch(() => {});
  }, [activeFeature, licenseGatePassed, storageEntries.length]);

  useEffect(() => {
    if (appState !== "results") setShellCleaning(false);
  }, [appState]);

  useEffect(() => {
    if (appState !== "results") setReviewOrbIntent(null);
  }, [appState]);

  useEffect(() => {
    const busy = appState === "scanning" || shellCleaning;
    document.body.classList.toggle("macfyi-busy", busy);
    return () => document.body.classList.remove("macfyi-busy");
  }, [appState, shellCleaning]);

  const diskUsedPercent =
    diskTotalGb > 0 ? Math.min(100, ((diskTotalGb - freeSpace) / diskTotalGb) * 100) : 45;

  const scanModuleCounts = useMemo(() => {
    const cleanup = filterByFeature(scanResults, "cleanup").reduce((acc, r) => acc + r.items.length, 0);
    const clutter = filterByFeature(scanResults, "my-clutter").reduce((acc, r) => acc + r.items.length, 0);
    return { cleanup, clutter };
  }, [scanResults]);

  const featureBadges = useMemo(() => {
    const out: Record<string, number> = {};
    out.cleanup = scanModuleCounts.cleanup;
    out["my-clutter"] = scanModuleCounts.clutter;
    if (uninstallerApps !== null && uninstallerOrphans !== null) {
      const oc = uninstallerOrphans.length;
      const ac = uninstallerApps.length;
      out.uninstaller = oc > 0 ? oc : ac;
    }
    return out;
  }, [scanModuleCounts, uninstallerApps, uninstallerOrphans]);

  const navigateFromSmartCare = useCallback((id: FeatureId) => {
    setActiveFeature(id);
    if (id === "settings") setIsSettingsOpen(true);
  }, []);

  const handleStartScan = useCallback(() => {
    if (storageEntries.length === 0) {
      getStorageBreakdown().then(setStorageEntries).catch(() => {});
    }
    setScanProgressPct(0);
    setActiveFeature("smart-care");
    setAppState("scanning");
  }, [storageEntries.length]);

  const refreshTrash = useCallback(async () => {
    setTrashLoading(true);
    setTrashLoadError(null);
    try {
      const rows = await listTrashItems();
      setTrashItems(rows);
    } catch (e) {
      setTrashLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setTrashLoading(false);
    }
  }, []);

  const refreshUninstaller = useCallback(async () => {
    setUninstallerAppsLoading(true);
    setUninstallerOrphansLoading(true);
    setUninstallerLoadError(null);
    try {
      const [appRows, orphanRows] = await Promise.all([listUninstallApps(), orphanDetect()]);
      setUninstallerApps(appRows);
      setUninstallerOrphans(orphanRows);
    } catch (e) {
      setUninstallerLoadError(e instanceof Error ? e.message : String(e));
    } finally {
      setUninstallerAppsLoading(false);
      setUninstallerOrphansLoading(false);
    }
  }, []);

  const handleFinishScan = useCallback(async (results: ScanResult[]) => {
    let freeGbBefore = freeSpace;
    try {
      const s0 = await getDiskStats();
      freeGbBefore = s0.free_gb;
    } catch {
      /* */
    }
    let itemsAnalyzed = results.reduce((acc, r) => acc + r.items.length, 0);

    setScanProgressPct(100);
    setScanResults(results);
    recordScanComplete();
    lastOverviewPrefetchRef.current = 0;
    setAppState("results");
    try {
      const [, o] = await Promise.all([
        appAudit().catch(() => []),
        orphanDetect().catch(() => []),
        shellProbe().catch(() => []),
      ]);
      if (o.length > 0) {
        itemsAnalyzed += o.length;
        const total = o.reduce((acc, i) => acc + i.size, 0);
        const orphanResult: ScanResult = {
          category: "app_leftovers",
          items: o,
          safety_level: "caution",
          space_to_free:
            total > 1024 * 1024 * 1024
              ? `${(total / (1024 * 1024 * 1024)).toFixed(1)} GB`
              : `${(total / (1024 * 1024)).toFixed(0)} MB`,
          recommendation: "Files left behind by uninstalled applications.",
          confidence: 0.82,
        };
        setScanResults((prev) => {
          if (prev.some((r) => r.category === "app_leftovers")) return prev;
          return [...prev, orphanResult];
        });
      }
    } catch {
      // non-blocking enrich
    }
    try {
      const s1 = await getDiskStats();
      appendActivity({
        kind: "scan_complete",
        freeGbBefore,
        freeGbAfter: s1.free_gb,
        itemsAnalyzed,
      });
    } catch {
      appendActivity({
        kind: "scan_complete",
        freeGbBefore,
        freeGbAfter: freeGbBefore,
        itemsAnalyzed,
      });
    }
    const sfx = loadSettings();
    if (sfx.soundEnabled !== false) {
      playScanComplete();
    }
    void notifyScanComplete(
      t("notif.scanTitle"),
      t("notif.scanBody", {
        count: itemsAnalyzed,
        size: estimateSafePotential(results),
      })
    );
    setAiBannerIndex(0);
    setAiBannerVisible(true);
    const totalBytes = results.reduce((a, r) => a + r.items.reduce((b, i) => b + i.size, 0), 0);
    const totalGb = Math.round((totalBytes / (1024 * 1024 * 1024)) * 100) / 100;
    void sendClientTelemetry("ScanCompleted", { total_gb: totalGb, items: itemsAnalyzed });
  }, [freeSpace, t]);

  const aiBannerQuestions = useMemo(
    () => [t("assistant.bannerQ1"), t("assistant.bannerQ2"), t("assistant.bannerQ3")],
    [t]
  );

  const handleAiBannerAutoAdvance = useCallback(() => {
    setAiBannerIndex((prev) => {
      if (prev >= 2) {
        setAiBannerVisible(false);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const handleCancelScan = useCallback(() => {
    setScanProgressPct(0);
    setAppState("idle");
  }, []);

  const handleCleanFinished = useCallback((detail: CleanFinishDetail) => {
    const freeGbBefore = freeSpace;
    const sfx = loadSettings();
    if (sfx.soundEnabled !== false) {
      playCleanDone();
    }
    const freedLabel =
      detail.freedBytes >= 1024 ** 3
        ? `${(detail.freedBytes / 1024 ** 3).toFixed(1)} GB`
        : `${Math.max(1, Math.round(detail.freedBytes / (1024 * 1024)))} MB`;
    void notifyCleanComplete(t("notif.cleanTitle"), t("notif.cleanBody", { size: freedLabel }));
    setFreeSpace((prev) => prev + detail.freedBytes / (1024 * 1024 * 1024));
    addSavedThisMonth(detail.freedBytes);
    getDiskStats().then((s) => {
      setFreeSpace(s.free_gb);
      setDiskTotalGb(s.total_gb);
      appendActivity({
        kind: "cleanup_complete",
        freeGbBefore,
        freeGbAfter: s.free_gb,
        filesRemoved: detail.succeededCount,
        bytesFreed: detail.freedBytes,
        failedCount: detail.failedCount,
        deletionMode: detail.mode,
        sampleNames: detail.sampleNames.slice(0, 12),
      });
    });
    getStorageBreakdown().then(setStorageEntries).catch(() => {});
    lastOverviewPrefetchRef.current = 0;
    setTimeout(() => setIsUpgradeOpen(true), 1200);
  }, [freeSpace, t]);

  const safePotentialLabel = estimateSafePotential(scanResults);
  const freeGbLabel = freeSpace > 0 ? freeSpace.toFixed(1) : undefined;
  const activeTheme = FEATURE_THEME[activeFeature];
  const smartCareFamily =
    activeFeature === "smart-care" || activeFeature === "cleanup" || activeFeature === "my-clutter";
  const uninstallerOrbLoading = uninstallerAppsLoading || uninstallerOrphansLoading;

  const orbMode = useMemo((): OrbDisplayMode => {
    if (activeFeature === "performance") {
      return perfLoading ? "scanning" : "idle_scan";
    }
    if (activeFeature === "user-trash") {
      if (shellCleaning) return "cleaning";
      if (trashLoading) return "scanning";
      return "idle_scan";
    }
    if (activeFeature === "uninstaller") {
      if (shellCleaning) return "cleaning";
      if (uninstallerOrbLoading) return "scanning";
      return "idle_scan";
    }
    if (activeFeature === "monitor") {
      if (shellCleaning) return "cleaning";
      if (appState === "scanning") return "scanning";
      return "idle_scan";
    }
    if (shellCleaning) return "cleaning";
    if (appState === "scanning") return "scanning";
    if (appState === "results" && reviewOrbIntent) {
      return reviewOrbIntent.kind === "rescan" ? "rescan" : "clean_selected";
    }
    if (appState === "results") return "rescan";
    return "idle_scan";
  }, [
    activeFeature,
    perfLoading,
    shellCleaning,
    appState,
    reviewOrbIntent,
    trashLoading,
    uninstallerOrbLoading,
  ]);

  const orbMainText = useMemo(() => {
    if (activeFeature === "performance") {
      return perfLoading ? undefined : t("orb.perfAnalyze");
    }
    if (activeFeature === "user-trash") {
      if (shellCleaning) return t("orb.cleaning");
      if (trashLoading) return undefined;
      return t("orb.refreshTrash");
    }
    if (activeFeature === "uninstaller") {
      if (shellCleaning) return t("orb.cleaning");
      if (uninstallerAppsLoading || uninstallerOrphansLoading) return undefined;
      return t("orb.refreshUninstaller");
    }
    if (activeFeature === "monitor") {
      if (shellCleaning) return t("orb.cleaning");
      if (appState === "scanning") return undefined;
      return t("orb.refreshMonitor");
    }
    if (shellCleaning) return t("orb.cleaning");
    if (appState === "scanning") return undefined;
    if (appState === "results" && reviewOrbIntent) {
      return reviewOrbIntent.kind === "rescan" ? t("orb.rescan") : t("orb.clean");
    }
    if (appState === "results") return t("orb.rescan");
    return t("orb.scan");
  }, [
    activeFeature,
    perfLoading,
    shellCleaning,
    appState,
    reviewOrbIntent,
    t,
    trashLoading,
    uninstallerAppsLoading,
    uninstallerOrphansLoading,
  ]);

  const handleOrbClick = useCallback(() => {
    if (activeFeature === "performance") {
      setPerfRefreshTick((n) => n + 1);
      return;
    }
    if (activeFeature === "user-trash") {
      void refreshTrash();
      return;
    }
    if (activeFeature === "uninstaller") {
      void refreshUninstaller();
      return;
    }
    if (activeFeature === "monitor") {
      getStorageBreakdown().then(setStorageEntries).catch(() => {});
      getDiskStats()
        .then((s) => {
          setFreeSpace(s.free_gb);
          setDiskTotalGb(s.total_gb);
        })
        .catch(() => {});
      return;
    }
    if (activeFeature === "history" || activeFeature === "settings") {
      return;
    }
    if (appState === "results" && reviewOrbIntent) {
      if (reviewOrbIntent.kind === "clean") {
        if (!reviewOrbIntent.disabled) reviewOrbIntent.onPress();
      } else {
        reviewOrbIntent.onPress();
      }
      return;
    }
    handleStartScan();
  }, [activeFeature, appState, reviewOrbIntent, handleStartScan, refreshTrash, refreshUninstaller]);

  if (!licenseGatePassed) {
    return <ActivationScreen onActivated={() => setLicenseGatePassed(true)} />;
  }

  const featuredResults = filterByFeature(scanResults, activeFeature);
  const hasFeatureResults = featuredResults.length > 0;

  let content = null;
  if (activeFeature === "smart-care") {
    if (appState === "idle") {
      content = (
        <SmartCareDashboard
          onStartScan={handleStartScan}
          onReview={scanResults.length > 0 ? () => setAppState("results") : undefined}
          hasResults={scanResults.length > 0}
          safePotentialLabel={safePotentialLabel}
          cleanupItemCount={scanModuleCounts.cleanup}
          clutterItemCount={scanModuleCounts.clutter}
          storageEntries={storageEntries}
          freeGb={freeSpace}
          totalGb={diskTotalGb}
          apps={uninstallerApps}
          orphans={uninstallerOrphans}
          trashItems={trashItems}
          overviewLoading={smartCareOverviewLoading}
          uninstallerError={uninstallerLoadError}
          trashError={trashLoadError}
          onNavigateFeature={navigateFromSmartCare}
          onRefreshOverview={() => void prefetchSmartCareOverview(true)}
        />
      );
    } else if (appState === "scanning") {
      content = (
        <Suspense fallback={<ViewFallback />}>
          <Scanner onFinish={handleFinishScan} onCancel={handleCancelScan} onProgress={setScanProgressPct} />
        </Suspense>
      );
    } else {
      content = (
        <Suspense fallback={<ViewFallback />}>
          <ResultsView
            results={scanResults}
            onClean={handleCleanFinished}
            onBack={() => setAppState("idle")}
            onPreview={(p) => setPreviewPath(p)}
            title={t("shell.smartCare")}
            diskTotalGb={diskTotalGb}
            freeGb={freeSpace}
            onCleaningPhaseChange={setShellCleaning}
            onSelectionStatsChange={setSelectionSummary}
            onOrbIntentChange={setReviewOrbIntent}
            onRequestRescan={handleStartScan}
            onAskAi={(ctx) => {
              setAiActiveContext(ctx);
              setIsAIChatOpen(true);
            }}
          />
        </Suspense>
      );
    }
  } else if (activeFeature === "cleanup") {
    content = hasFeatureResults ? (
      <Suspense fallback={<ViewFallback />}>
        <ResultsView
          results={featuredResults}
          onClean={handleCleanFinished}
          onPreview={(p) => setPreviewPath(p)}
          title={t("shell.cleanup")}
          diskTotalGb={diskTotalGb}
          freeGb={freeSpace}
          onCleaningPhaseChange={setShellCleaning}
          onSelectionStatsChange={setSelectionSummary}
          onOrbIntentChange={setReviewOrbIntent}
          onRequestRescan={handleStartScan}
          onAskAi={(ctx) => {
            setAiActiveContext(ctx);
            setIsAIChatOpen(true);
          }}
        />
      </Suspense>
    ) : (
      <FeatureHero
        title="Junk Cleanup"
        subtitle="Clean your Mac safely and reclaim free space."
        bullets={["System Junk", "Mail Attachments", "Trash Bins"]}
        actionLabel="Run Smart Scan"
        onAction={handleStartScan}
        icon={<Trash2 className="text-white/90" />}
      />
    );
  } else if (activeFeature === "my-clutter") {
    content = hasFeatureResults ? (
      <Suspense fallback={<ViewFallback />}>
        <ResultsView
          results={featuredResults}
          onClean={handleCleanFinished}
          onPreview={(p) => setPreviewPath(p)}
          title={t("shell.myClutter")}
          diskTotalGb={diskTotalGb}
          freeGb={freeSpace}
          onCleaningPhaseChange={setShellCleaning}
          onSelectionStatsChange={setSelectionSummary}
          onOrbIntentChange={setReviewOrbIntent}
          onRequestRescan={handleStartScan}
          onAskAi={(ctx) => {
            setAiActiveContext(ctx);
            setIsAIChatOpen(true);
          }}
        />
      </Suspense>
    ) : (
      <FeatureHero
        title="My Clutter"
        subtitle="Sort through files and reduce the mess in minutes."
        bullets={["Large Files", "Duplicates", "Old Downloads"]}
        actionLabel="Run Smart Scan"
        onAction={handleStartScan}
        icon={<FolderSearch className="text-white/90" />}
      />
    );
  } else if (activeFeature === "uninstaller") {
    content = (
      <Suspense fallback={<ViewFallback />}>
        <AppUninstallerView
          apps={uninstallerApps}
          orphans={uninstallerOrphans}
          appsLoading={uninstallerAppsLoading}
          orphansLoading={uninstallerOrphansLoading}
          loadError={uninstallerLoadError}
          onRefresh={refreshUninstaller}
        />
      </Suspense>
    );
  } else if (activeFeature === "monitor") {
    content = (
      <MonitorDashboard freeGb={freeSpace} totalGb={diskTotalGb} storageEntries={storageEntries} />
    );
  } else if (activeFeature === "performance") {
    content = (
      <Suspense fallback={<ViewFallback />}>
        <PerformanceView refreshSignal={perfRefreshTick} onLoadingChange={setPerfLoading} />
      </Suspense>
    );
  } else if (activeFeature === "user-trash") {
    content = (
      <Suspense fallback={<ViewFallback />}>
        <UserTrashView
          items={trashItems}
          loading={trashLoading}
          error={trashLoadError}
          onRefresh={refreshTrash}
        />
      </Suspense>
    );
  } else if (activeFeature === "history") {
    content = (
      <Suspense fallback={<ViewFallback />}>
        <ActivityHistoryView />
      </Suspense>
    );
  } else if (activeFeature === "settings") {
    content = (
      <EmptyModule
        title={t("settings.title")}
        description={t("settings.scanScope")}
        actionLabel={t("common.done")}
        onAction={() => setIsSettingsOpen(true)}
      />
    );
  } else {
    content = null;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--color-bg)]">
      <AppShell
        title={t(activeTheme.shellTitleKey)}
        activeFeature={activeFeature}
        onFeatureChange={(feature) => {
          setActiveFeature(feature);
          if (feature === "settings") setIsSettingsOpen(true);
        }}
        orbMode={orbMode}
        orbMainText={orbMainText}
        onScanOrbClick={handleOrbClick}
        scanOrbDisabled={
          (activeFeature === "performance" && perfLoading) ||
          (trashLoading && activeFeature === "user-trash") ||
          (uninstallerOrbLoading && activeFeature === "uninstaller") ||
          (smartCareFamily && appState === "scanning") ||
          shellCleaning ||
          (smartCareFamily &&
            appState === "results" &&
            reviewOrbIntent?.kind === "clean" &&
            reviewOrbIntent.disabled)
        }
        scanOrbProgressPct={
          activeFeature === "performance" && perfLoading
            ? 52
            : (activeFeature === "user-trash" && trashLoading) ||
                (activeFeature === "uninstaller" && uninstallerOrbLoading)
              ? 52
              : scanProgressPct
        }
        showScanOrb={
          !(smartCareFamily && appState === "scanning") &&
          !(activeFeature === "smart-care" && appState === "idle") &&
          activeFeature !== "history" &&
          activeFeature !== "settings"
        }
        onAIButtonClick={() =>
          setIsAIChatOpen((v) => {
            const next = !v;
            if (!next) setAiActiveContext(null);
            return next;
          })
        }
        onSearchClick={() => setIsSearchOpen(true)}
        onSettingsClick={() => setIsSettingsOpen(true)}
        diskUsedPercent={diskUsedPercent}
        freeSpaceGb={freeGbLabel}
        badges={featureBadges}
        contentBackgroundClass={
          appState === "scanning" ? "from-[#0a0b0f] via-[#0a0b0f] to-[#0a0b0f]" : activeTheme.bg
        }
        hideMainGlow={appState === "scanning"}
        orbSubLabel={t(activeTheme.orbSubKey)}
        deletionMode={deletionMode}
        onDeletionModeClick={() => setIsSettingsOpen(true)}
        onUpgradeClick={() => setIsUpgradeOpen(true)}
      >
        {content}
      </AppShell>

      <AnimatePresence>
        {aiBannerVisible && (
          <AIAssistantPromptBanner
            question={aiBannerQuestions[aiBannerIndex] ?? ""}
            onOpen={() => {
              setIsAIChatOpen(true);
              setAiBannerVisible(false);
            }}
            onDismiss={() => setAiBannerVisible(false)}
            onAutoAdvance={handleAiBannerAutoAdvance}
          />
        )}
      </AnimatePresence>

      <Suspense fallback={null}>
        <AnimatePresence>
          {isAIChatOpen && (
            <AiAssistantPanel
              scanSummary={scanResults.length > 0 ? scanResults : null}
              activeContext={aiActiveContext}
              onClose={() => {
                setIsAIChatOpen(false);
                setAiActiveContext(null);
              }}
            />
          )}
        </AnimatePresence>
      </Suspense>

      <Suspense fallback={null}>
        <AnimatePresence>
          {isSearchOpen && (
            <SearchOverlay
              results={scanResults}
              onClose={() => setIsSearchOpen(false)}
            />
          )}
        </AnimatePresence>
      </Suspense>

      <Suspense fallback={null}>
        <AnimatePresence>
          {isSettingsOpen && (
            <SettingsPanel
              onClose={() => {
                setIsSettingsOpen(false);
                setDeletionMode(getDeletionMode());
              }}
              onReplayTour={() => {
                resetOnboardingCompletion();
                setIsSettingsOpen(false);
                setShowOnboarding(true);
              }}
            />
          )}
        </AnimatePresence>
      </Suspense>

      <Suspense fallback={null}>
        <AnimatePresence>
          {previewPath && (
            <FilePreviewPanel
              path={previewPath}
              onClose={() => setPreviewPath(null)}
            />
          )}
        </AnimatePresence>
      </Suspense>

      <Suspense fallback={null}>
        <AnimatePresence>
          {isUpgradeOpen && (
            <UpgradePrompt
              priceShort={upgradePriceShort}
              onUpgrade={() => {
                void sendClientTelemetry("UpgradeClicked", {});
                setIsUpgradeOpen(false);
                const envUrl = import.meta.env.VITE_MARKETING_SITE_URL?.trim().replace(/\/$/, "");
                const target = marketingSiteUrl || envUrl || "https://macfyi.com";
                window.open(target, "_blank", "noopener,noreferrer");
              }}
              onMaybeLater={() => setIsUpgradeOpen(false)}
            />
          )}
        </AnimatePresence>
      </Suspense>

      <AnimatePresence>
        {showOnboarding && (
          <OnboardingTour
            onComplete={({ source }) => {
              setShowOnboarding(false);
              if (source === "last_step") {
                getStorageBreakdown().then(setStorageEntries).catch(() => {});
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
