import { useCallback, useEffect, useMemo, useState, lazy, Suspense, type ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import { AppShell, type FeatureId } from "./components/AppShell";
import { Dashboard } from "./components/Dashboard";
import type { OrbDisplayMode } from "./components/ScanOrbButton";
import type { CleanFinishDetail, ReviewOrbIntent, ScanResult, StorageEntry, AppInfo, ShellProbe } from "./types";
import {
  appAudit,
  getDiskStats,
  getStorageBreakdown,
  orphanDetect,
  shellProbe,
} from "./lib/backend";
import { addSavedThisMonth, recordScanComplete } from "./lib/storage";
import type { InterviewQuestion } from "./lib/interview-engine";
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
import { MonitorDashboard } from "./components/MonitorDashboard";

const Scanner = lazy(async () => {
  const m = await import("./components/Scanner");
  return { default: m.Scanner };
});
const ResultsView = lazy(async () => {
  const m = await import("./components/ResultsView");
  return { default: m.ResultsView };
});
const AIAssistant = lazy(async () => {
  const m = await import("./components/AIAssistant");
  return { default: m.AIAssistant };
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
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [deletionMode, setDeletionMode] = useState<"trash" | "permanent">(() => getDeletionMode());
  const [shellCleaning, setShellCleaning] = useState(false);
  const [scanProgressPct, setScanProgressPct] = useState(0);
  const [selectionSummary, setSelectionSummary] = useState<{ count: number; bytesLabel: string } | null>(null);
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [freeSpace, setFreeSpace] = useState(0);
  const [diskTotalGb, setDiskTotalGb] = useState(0);
  const [storageEntries, setStorageEntries] = useState<StorageEntry[]>([]);
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [shellProbes, setShellProbes] = useState<ShellProbe[]>([]);
  const [perfRefreshTick, setPerfRefreshTick] = useState(0);
  const [perfLoading, setPerfLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !hasCompletedOnboarding());
  const [licenseGatePassed, setLicenseGatePassed] = useState(
    () => shouldSkipLicenseGate() || !!getStoredLicenseToken()
  );

  /** Disk stats only — no user-folder walks (avoids macOS Documents TCC on cold start). */
  useEffect(() => {
    getDiskStats().then((s) => {
      setFreeSpace(s.free_gb);
      setDiskTotalGb(s.total_gb);
    });
  }, []);

  /** Returning users: load folder breakdown once (onboarding already completed before). Only after license gate — avoids TCC before activation. */
  useEffect(() => {
    if (!licenseGatePassed) return;
    if (hasCompletedOnboarding()) {
      getStorageBreakdown().then(setStorageEntries).catch(() => {});
    }
  }, [licenseGatePassed]);

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

  const featureBadges = useMemo(() => {
    const out: Record<string, number> = {};
    out.cleanup = filterByFeature(scanResults, "cleanup").reduce((acc, r) => acc + r.items.length, 0);
    out["my-clutter"] = filterByFeature(scanResults, "my-clutter").reduce((acc, r) => acc + r.items.length, 0);
    return out;
  }, [scanResults]);

  const handleStartScan = useCallback(() => {
    if (storageEntries.length === 0) {
      getStorageBreakdown().then(setStorageEntries).catch(() => {});
    }
    setScanProgressPct(0);
    setActiveFeature("smart-care");
    setAppState("scanning");
  }, [storageEntries.length]);

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
    setAppState("results");
    try {
      const [a, o, s] = await Promise.all([
        appAudit().catch(() => [] as AppInfo[]),
        orphanDetect().catch(() => []),
        shellProbe().catch(() => [] as ShellProbe[]),
      ]);
      setApps(a);
      setShellProbes(s);
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
    setIsAIChatOpen(true);
  }, [freeSpace, t]);

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
    setTimeout(() => setIsUpgradeOpen(true), 1200);
  }, [freeSpace, t]);

  const handleInterviewAction = (q: InterviewQuestion, action: string) => {
    if (action === "select-recommended") {
      // handled in ResultsView
    }
    console.info("[interview]", q.id, action);
  };

  const safePotentialLabel = estimateSafePotential(scanResults);
  const freeGbLabel = freeSpace > 0 ? freeSpace.toFixed(1) : undefined;
  const activeTheme = FEATURE_THEME[activeFeature];

  const orbMode = useMemo((): OrbDisplayMode => {
    if (activeFeature === "performance") {
      return perfLoading ? "scanning" : "idle_scan";
    }
    if (shellCleaning) return "cleaning";
    if (appState === "scanning") return "scanning";
    if (appState === "results" && reviewOrbIntent) {
      return reviewOrbIntent.kind === "rescan" ? "rescan" : "clean_selected";
    }
    if (appState === "results") return "rescan";
    return "idle_scan";
  }, [activeFeature, perfLoading, shellCleaning, appState, reviewOrbIntent]);

  const orbMainText = useMemo(() => {
    if (activeFeature === "performance") {
      return perfLoading ? undefined : t("orb.perfAnalyze");
    }
    if (shellCleaning) return t("orb.cleaning");
    if (appState === "scanning") return undefined;
    if (appState === "results" && reviewOrbIntent) {
      return reviewOrbIntent.kind === "rescan" ? t("orb.rescan") : t("orb.clean");
    }
    if (appState === "results") return t("orb.rescan");
    return t("orb.scan");
  }, [activeFeature, perfLoading, shellCleaning, appState, reviewOrbIntent, t]);

  const handleOrbClick = useCallback(() => {
    if (activeFeature === "performance") {
      setPerfRefreshTick((n) => n + 1);
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
  }, [activeFeature, appState, reviewOrbIntent, handleStartScan]);

  if (!licenseGatePassed) {
    return <ActivationScreen onActivated={() => setLicenseGatePassed(true)} />;
  }

  const featuredResults = filterByFeature(scanResults, activeFeature);
  const hasFeatureResults = featuredResults.length > 0;

  let content = null;
  if (activeFeature === "smart-care") {
    if (appState === "idle") {
      content = (
        <Dashboard
          onStartScan={handleStartScan}
          onReview={scanResults.length > 0 ? () => setAppState("results") : undefined}
          hasResults={scanResults.length > 0}
          safePotentialLabel={safePotentialLabel}
          storageEntries={storageEntries}
          freeGb={freeSpace}
          totalGb={diskTotalGb}
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
            onCleaningPhaseChange={setShellCleaning}
            onSelectionStatsChange={setSelectionSummary}
            onOrbIntentChange={setReviewOrbIntent}
            onRequestRescan={handleStartScan}
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
          onCleaningPhaseChange={setShellCleaning}
          onSelectionStatsChange={setSelectionSummary}
          onOrbIntentChange={setReviewOrbIntent}
          onRequestRescan={handleStartScan}
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
          onCleaningPhaseChange={setShellCleaning}
          onSelectionStatsChange={setSelectionSummary}
          onOrbIntentChange={setReviewOrbIntent}
          onRequestRescan={handleStartScan}
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
        <AppUninstallerView />
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
        <UserTrashView />
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
          appState === "scanning" ||
          shellCleaning ||
          (appState === "results" &&
            reviewOrbIntent?.kind === "clean" &&
            reviewOrbIntent.disabled)
        }
        scanOrbProgressPct={activeFeature === "performance" && perfLoading ? 52 : scanProgressPct}
        showScanOrb={appState !== "scanning"}
        onAIButtonClick={() => setIsAIChatOpen((v) => !v)}
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

      <Suspense fallback={null}>
        <AnimatePresence>
          {isAIChatOpen && (
            <AIAssistant
              scanSummary={scanResults.length > 0 ? scanResults : null}
              apps={apps}
              shellProbes={shellProbes}
              onClose={() => setIsAIChatOpen(false)}
              onInterviewAction={handleInterviewAction}
              selectionSummary={selectionSummary}
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
              onUpgrade={() => setIsUpgradeOpen(false)}
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
