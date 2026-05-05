import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, HardDrive, Loader2, Shield, Trash2 } from "lucide-react";
import type { AppStorageImpact, DiskSurgeDetectedPayload, SurgeFileItem, SurgeReport } from "../types";
import {
  analyzeDiskSurge,
  diskExplorerCheckFullDiskAccess,
  diskExplorerOpenFdaSettings,
  onDiskSurgeDetected,
  revealInFinder,
  surgeTrashSafeCachePaths,
} from "../lib/backend";
import { LoadingButton } from "./common/LoadingButton";
import { useI18n } from "../i18n/context";

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(0)} MB`;
  return `${(n / 1024).toFixed(0)} KB`;
}

function riskClass(level: string): string {
  if (level === "Safe") return "text-emerald-300";
  if (level === "Caution") return "text-amber-300";
  if (level === "Locked") return "text-white/35";
  return "text-rose-300";
}

export function SystemStorageAnalyzerPanel() {
  const { t } = useI18n();
  const [surge, setSurge] = useState<DiskSurgeDetectedPayload | null>(null);
  const [report, setReport] = useState<SurgeReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fdaOk, setFdaOk] = useState<boolean | null>(null);
  const [safeOnly, setSafeOnly] = useState(false);
  const [busyTrash, setBusyTrash] = useState(false);

  useEffect(() => {
    let un: (() => void) | null = null;
    void (async () => {
      try {
        un = await onDiskSurgeDetected((p) => setSurge(p));
      } catch {
        /* dev / no tauri */
      }
    })();
    return () => {
      un?.();
    };
  }, []);

  const refreshFda = useCallback(() => {
    void diskExplorerCheckFullDiskAccess()
      .then(setFdaOk)
      .catch(() => setFdaOk(false));
  }, []);

  useEffect(() => {
    refreshFda();
  }, [refreshFda]);

  const runAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await analyzeDiskSurge();
      setReport(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  /** First visit to this tab runs analysis so data appears without an extra click. */
  useEffect(() => {
    void runAnalyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional once on mount
  }, []);

  const pushSafeCaches = (items: SurgeFileItem[], out: string[]) => {
    for (const it of items) {
      if (it.riskLevel === "Safe" && it.nodeType === "Cache" && it.path.includes("/Library/Caches/")) {
        out.push(it.path);
      }
    }
  };

  const safeCachePaths = useMemo(() => {
    if (!report) return [];
    const out: string[] = [];
    for (const app of report.detectedApps) {
      for (const cat of app.categories) {
        pushSafeCaches(cat.items, out);
      }
    }
    pushSafeCaches(report.snapshotTop ?? [], out);
    return [...new Set(out)];
  }, [report]);

  const filteredSnapshot = useMemo(() => {
    if (!report?.snapshotTop?.length) return [];
    if (!safeOnly) return report.snapshotTop;
    return report.snapshotTop.filter((i) => i.riskLevel === "Safe");
  }, [report, safeOnly]);

  const filteredApps = useMemo(() => {
    if (!report) return [];
    if (!safeOnly) return report.detectedApps;
    return report.detectedApps
      .map((app) => ({
        ...app,
        categories: app.categories
          .map((c) => ({
            ...c,
            items: c.items.filter((i) => i.riskLevel === "Safe"),
          }))
          .filter((c) => c.items.length > 0),
      }))
      .filter((app) => app.categories.length > 0);
  }, [report, safeOnly]);

  const filteredLarge = useMemo(() => {
    if (!report) return [];
    const files = report.largeRecentFiles ?? [];
    if (!safeOnly) return files;
    return files.filter((i) => i.riskLevel === "Safe");
  }, [report, safeOnly]);

  const trashSafeCaches = async () => {
    if (safeCachePaths.length === 0) return;
    if (!window.confirm(t("storageAnalyzer.confirmTrashCaches", { n: safeCachePaths.length }))) return;
    setBusyTrash(true);
    setError(null);
    try {
      const res = await surgeTrashSafeCachePaths(safeCachePaths);
      if (res.failed.length > 0) {
        setError(res.failed.map((f) => `${f.path}: ${f.message}`).join("\n"));
      }
      await runAnalyze();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyTrash(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 min-h-0 min-w-0 p-4 md:p-6 overflow-y-auto custom-scrollbar">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <HardDrive size={18} className="text-cyan-400 shrink-0" />
            {t("storageAnalyzer.title")}
          </h3>
          <p className="text-[11px] text-white/45 mt-1 max-w-xl">{t("storageAnalyzer.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {fdaOk === false && (
            <button
              type="button"
              onClick={() => void diskExplorerOpenFdaSettings()}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              {t("storageAnalyzer.openFda")}
            </button>
          )}
          <LoadingButton
            loading={loading}
            loadingLabel="…"
            onClick={() => void runAnalyze()}
            className="btn-primary px-3 py-1.5 text-xs"
          >
            {t("storageAnalyzer.analyze")}
          </LoadingButton>
        </div>
      </div>

      {surge && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/25 px-4 py-3 flex gap-3">
          <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={18} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-100">{t("storageAnalyzer.surgeBannerTitle")}</p>
            <p className="text-xs text-amber-200/80 mt-1">
              {t("storageAnalyzer.surgeBannerBody", {
                delta: formatBytes(surge.deltaBytes),
                sec: String(surge.windowSec),
              })}
            </p>
          </div>
        </div>
      )}

      {report?.fdaLimited && (
        <p className="text-xs text-amber-300/90 flex items-start gap-2">
          <Shield size={14} className="shrink-0 mt-0.5" />
          {t("storageAnalyzer.fdaHint")}
        </p>
      )}

      {error && <p className="text-xs text-rose-300 whitespace-pre-wrap">{error}</p>}

      {report?.baselineEstablished && (
        <p className="text-sm text-white/50">{t("storageAnalyzer.baselineHint")}</p>
      )}

      {filteredSnapshot.length > 0 && (
        <div className="surface-card p-4 space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-white/45 font-semibold">
            {t("storageAnalyzer.snapshotTitle")}
          </p>
          <p className="text-[10px] text-white/35">{t("storageAnalyzer.snapshotHint")}</p>
          <ul className="space-y-1.5 list-none p-0 m-0">
            {filteredSnapshot.map((it) => (
              <SurgeFileRow key={it.path} item={it} />
            ))}
          </ul>
        </div>
      )}

      {report && report.totalDeltaBytes > 0 && (
        <p className="text-xs text-white/55">
          {t("storageAnalyzer.totalGrowth", { size: formatBytes(report.totalDeltaBytes) })}
        </p>
      )}

      <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer select-none">
        <input
          type="checkbox"
          className="rounded border-white/20"
          checked={safeOnly}
          onChange={(e) => setSafeOnly(e.target.checked)}
        />
        {t("storageAnalyzer.safeOnly")}
      </label>

      {safeCachePaths.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <LoadingButton
            loading={busyTrash}
            loadingLabel="…"
            onClick={() => void trashSafeCaches()}
            className="btn-secondary px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
          >
            <Trash2 size={14} />
            {t("storageAnalyzer.trashCaches", { n: safeCachePaths.length })}
          </LoadingButton>
        </div>
      )}

      {loading && !report && (
        <div className="flex items-center gap-2 text-white/40 text-sm py-6">
          <Loader2 size={18} className="animate-spin" />
          {t("loading")}
        </div>
      )}

      {report &&
        !report.baselineEstablished &&
        report.totalDeltaBytes === 0 &&
        filteredApps.length === 0 &&
        filteredLarge.length === 0 && (
          <p className="text-sm text-white/45">{t("storageAnalyzer.noDeltas")}</p>
        )}

      {filteredApps.map((app) => (
        <AppBlock key={app.appName + (app.bundleId ?? "")} app={app} />
      ))}

      {filteredLarge.length > 0 && (
        <div className="surface-card p-4 space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-white/45 font-semibold">
            {t("storageAnalyzer.largeRecent")}
          </p>
          <ul className="space-y-2">
            {filteredLarge.map((f) => (
              <SurgeFileRow key={f.path} item={f} />
            ))}
          </ul>
        </div>
      )}

      <p className="text-[10px] text-white/35 leading-relaxed">{t("storageAnalyzer.disclaimer")}</p>
    </div>
  );
}

function AppBlock({ app }: { app: AppStorageImpact }) {
  const { t } = useI18n();
  return (
    <div className="surface-card p-4 space-y-3">
      <div className="flex flex-wrap justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{app.appName}</p>
          {app.bundleId && <p className="text-[10px] text-white/40 font-mono mt-0.5">{app.bundleId}</p>}
        </div>
        <span className="text-xs text-white/55 tabular-nums">{formatBytes(app.totalBytes)}</span>
      </div>
      {app.categories.map((cat) => (
        <div key={cat.categoryKey} className="border border-white/10 rounded-lg p-3 bg-black/20">
          <div className="flex justify-between gap-2 text-xs mb-2">
            <span className="text-white/75">{t(`storageAnalyzer.categories.${cat.categoryKey}`)}</span>
            <span className={`tabular-nums shrink-0 ${riskClass(cat.riskLevel)}`}>{cat.riskLevel}</span>
          </div>
          <p className="text-[10px] text-white/40 mb-2">{t(`storageAnalyzer.riskHint.${cat.riskLevel}`)}</p>
          <ul className="space-y-1.5">
            {cat.items.slice(0, 12).map((it) => (
              <SurgeFileRow key={it.path} item={it} />
            ))}
            {cat.items.length > 12 && (
              <li className="text-[10px] text-white/35">+{cat.items.length - 12} more</li>
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}

function SurgeFileRow({ item }: { item: SurgeFileItem }) {
  const { t } = useI18n();
  return (
    <li className="rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5 flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-white/85 truncate">{item.displayName}</p>
        <p className="text-[10px] text-white/30 truncate font-mono">{item.path}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {item.deltaBytes > 0 && (
          <span className="text-[10px] text-amber-200/80 tabular-nums">+{formatBytes(item.deltaBytes)}</span>
        )}
        <span className="text-[10px] text-white/45 tabular-nums">{formatBytes(item.sizeBytes)}</span>
        <span className={`text-[10px] ${riskClass(item.riskLevel)}`}>{item.riskLevel}</span>
        <button
          type="button"
          onClick={() => void revealInFinder(item.path)}
          className="text-[10px] text-blue-300 hover:text-blue-200"
        >
          {t("uninstallerPanel.reveal")}
        </button>
      </div>
    </li>
  );
}
