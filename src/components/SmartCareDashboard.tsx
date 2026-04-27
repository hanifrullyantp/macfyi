import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Clock3,
  FolderTree,
  HardDrive,
  Layers,
  PackageOpen,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { getLastScanLabel, getSavedThisMonthLabel } from "../lib/storage";
import { StorageChart } from "./StorageChart";
import { ScanWelcome } from "./Dashboard/ScanWelcome";
import type { FeatureId } from "../lib/featureId";
import type { FileItem, StorageEntry, TrashListItem, UninstallAppEntry } from "../types";
import { useI18n } from "../i18n/context";

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(0)} MB`;
  return `${(n / 1024).toFixed(0)} KB`;
}

export interface SmartCareDashboardProps {
  onStartScan: () => void;
  onReview?: () => void;
  hasResults?: boolean;
  safePotentialLabel?: string;
  cleanupItemCount: number;
  clutterItemCount: number;
  storageEntries: StorageEntry[];
  freeGb: number;
  totalGb: number;
  apps: UninstallAppEntry[] | null;
  /** Orphan / leftover files (same source as Uninstaller tab) */
  orphans: FileItem[] | null;
  trashItems: TrashListItem[] | null;
  overviewLoading: boolean;
  uninstallerError: string | null;
  trashError: string | null;
  onNavigateFeature: (id: FeatureId) => void;
  onRefreshOverview?: () => void;
}

export function SmartCareDashboard({
  onStartScan,
  onReview,
  hasResults = false,
  safePotentialLabel = "0 MB",
  cleanupItemCount,
  clutterItemCount,
  storageEntries,
  freeGb,
  totalGb,
  apps,
  orphans,
  trashItems,
  overviewLoading,
  uninstallerError,
  trashError,
  onNavigateFeature,
  onRefreshOverview,
}: SmartCareDashboardProps) {
  const { t } = useI18n();
  const last = getLastScanLabel();
  const saved = getSavedThisMonthLabel();
  const hasStorage = storageEntries.length > 0;
  const appsCount = apps?.length ?? null;
  const orphansCount = orphans?.length ?? null;
  const orphanBytes = orphans?.reduce((s, o) => s + o.size, 0) ?? 0;
  const trashCount = trashItems?.length ?? null;
  const trashBytes = trashItems?.reduce((s, x) => s + x.sizeBytes, 0) ?? 0;
  const overviewReady = apps !== null && orphans !== null && trashItems !== null;

  return (
    <div className="relative z-10 flex flex-col h-full min-h-0 overflow-y-auto custom-scrollbar px-6 py-6 md:px-8 pb-28">
      <div className="max-w-5xl w-full mx-auto flex flex-col flex-1 min-h-0 gap-4">
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
          {onRefreshOverview && (
            <button
              type="button"
              onClick={onRefreshOverview}
              disabled={overviewLoading}
              className="btn-secondary text-xs inline-flex items-center gap-1.5 shrink-0 ml-auto"
            >
              <RefreshCw size={14} className={overviewLoading ? "animate-spin" : ""} />
              {t("dashboard.refreshOverview")}
            </button>
          )}
        </div>

        <ScanWelcome
          onStartScan={onStartScan}
          onReview={onReview}
          hasResults={hasResults}
          freeGb={freeGb}
          totalGb={totalGb}
        />

        {onRefreshOverview && !overviewReady && !overviewLoading ? (
          <div className="shrink-0 surface-card border border-white/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{t("dashboard.overviewIdleTitle")}</p>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">{t("dashboard.overviewIdleBody")}</p>
            </div>
            <button
              type="button"
              onClick={onRefreshOverview}
              className="btn-primary text-sm px-4 py-2.5 shrink-0 self-start sm:self-center"
            >
              {t("dashboard.loadOverview")}
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateFeature("cleanup")}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/[0.06] transition-colors"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
              {t("dashboard.metricScanTitle")}
            </p>
            <p className="text-lg font-semibold text-white mt-1 tabular-nums">
              {t("dashboard.metricScanValue", { cleanup: cleanupItemCount, clutter: clutterItemCount })}
            </p>
            <p className="text-[10px] text-white/40 mt-1">{t("dashboard.metricScanHint")}</p>
          </button>
          <button
            type="button"
            onClick={() => onNavigateFeature("uninstaller")}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/[0.06] transition-colors"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
              {t("dashboard.metricUninstallerTitle")}
            </p>
            <p className="text-lg font-semibold text-white mt-1 tabular-nums">
              {appsCount === null || orphansCount === null
                ? overviewLoading
                  ? "—"
                  : t("dashboard.notLoaded")
                : t("dashboard.metricUninstallerValue", {
                    apps: appsCount,
                    orphans: orphansCount,
                  })}
            </p>
            <p className="text-[10px] text-white/40 mt-1 truncate" title={uninstallerError ?? undefined}>
              {orphansCount !== null && orphansCount > 0
                ? formatBytes(orphanBytes)
                : uninstallerError
                  ? t("dashboard.loadErrorShort")
                  : t("dashboard.metricUninstallerHint")}
            </p>
          </button>
          <button
            type="button"
            onClick={() => onNavigateFeature("user-trash")}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/[0.06] transition-colors"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
              {t("dashboard.metricTrashTitle")}
            </p>
            <p className="text-lg font-semibold text-white mt-1 tabular-nums">
              {trashCount === null ? (overviewLoading ? "—" : t("dashboard.notLoaded")) : trashCount}
            </p>
            <p className="text-[10px] text-white/40 mt-1 truncate" title={trashError ?? undefined}>
              {trashCount !== null && trashCount > 0
                ? formatBytes(trashBytes)
                : trashError
                  ? t("dashboard.loadErrorShort")
                  : t("dashboard.metricTrashHint")}
            </p>
          </button>
          <button
            type="button"
            onClick={() => onNavigateFeature("monitor")}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/[0.06] transition-colors"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45 flex items-center gap-1">
              <HardDrive size={12} className="opacity-60" />
              {t("dashboard.metricDiskTitle")}
            </p>
            <p className="text-lg font-semibold text-white mt-1 tabular-nums">
              {freeGb > 0 ? `${freeGb.toFixed(1)}` : "—"} <span className="text-xs font-normal text-white/50">GB</span>
            </p>
            <p className="text-[10px] text-white/40 mt-1">
              {totalGb > 0 ? t("dashboard.metricDiskHint", { total: totalGb.toFixed(0) }) : ""}
            </p>
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="shrink-0 surface-card p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                {t("dashboard.aiSummaryLabel")}
              </p>
              <h2 className="text-lg sm:text-xl font-semibold text-white mt-1">
                {t("dashboard.safeFreeLine", { size: safePotentialLabel })}
              </h2>
              <p className="text-xs sm:text-sm text-white/60 mt-2 max-w-xl">{t("dashboard.safeFreeHint")}</p>
            </div>
            <div className="flex items-center gap-2">
              {hasResults && onReview && (
                <button type="button" onClick={onReview} className="btn-secondary hidden sm:inline-flex items-center gap-1.5">
                  {t("dashboard.reviewItems")} <ArrowRight size={14} />
                </button>
              )}
              <button type="button" onClick={onStartScan} className="btn-primary hidden sm:inline-flex">
                {t("dashboard.runSmartScan")}
              </button>
            </div>
          </div>
        </motion.div>

        {hasStorage && (
          <div className="shrink-0 surface-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-white/60 uppercase tracking-[0.12em]">
                {t("dashboard.storageOverview")}
              </h2>
              <span className="text-xs text-white/40 font-mono tabular-nums">
                {freeGb > 0 && totalGb > 0
                  ? t("dashboard.freeOfTotal", { free: freeGb.toFixed(1), total: totalGb.toFixed(0) })
                  : ""}
              </span>
            </div>
            <StorageChart entries={storageEntries} />
          </div>
        )}

        <div>
          <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.14em] mb-2 px-0.5">
            {t("dashboard.modulesHint")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => onNavigateFeature("cleanup")}
              className="surface-card-soft p-4 text-left hover:bg-white/[0.05] transition-colors border border-transparent hover:border-white/10"
            >
              <ShieldCheck className="text-emerald-400 mb-2" size={18} />
              <p className="text-sm font-semibold text-white">{t("shell.cleanup")}</p>
              <p className="text-xs text-white/50 mt-1">{t("dashboard.moduleCleanupDesc")}</p>
              <span className="text-[10px] text-[var(--color-accent-text)] mt-2 inline-flex items-center gap-1">
                {t("dashboard.openModule")} <ArrowRight size={12} />
              </span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateFeature("my-clutter")}
              className="surface-card-soft p-4 text-left hover:bg-white/[0.05] transition-colors border border-transparent hover:border-white/10"
            >
              <Layers className="text-cyan-400 mb-2" size={18} />
              <p className="text-sm font-semibold text-white">{t("shell.myClutter")}</p>
              <p className="text-xs text-white/50 mt-1">{t("dashboard.moduleClutterDesc")}</p>
              <span className="text-[10px] text-[var(--color-accent-text)] mt-2 inline-flex items-center gap-1">
                {t("dashboard.openModule")} <ArrowRight size={12} />
              </span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateFeature("disk-explorer")}
              className="surface-card-soft p-4 text-left hover:bg-white/[0.05] transition-colors border border-transparent hover:border-white/10"
            >
              <FolderTree className="text-sky-400 mb-2" size={18} />
              <p className="text-sm font-semibold text-white">{t("shell.diskExplorer")}</p>
              <p className="text-xs text-white/50 mt-1">{t("dashboard.moduleDiskExplorerDesc")}</p>
              <span className="text-[10px] text-[var(--color-accent-text)] mt-2 inline-flex items-center gap-1">
                {t("dashboard.openModule")} <ArrowRight size={12} />
              </span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateFeature("uninstaller")}
              className="surface-card-soft p-4 text-left hover:bg-white/[0.05] transition-colors border border-transparent hover:border-white/10"
            >
              <PackageOpen className="text-amber-300/90 mb-2" size={18} />
              <p className="text-sm font-semibold text-white">{t("shell.uninstaller")}</p>
              <p className="text-xs text-white/50 mt-1">{t("dashboard.moduleUninstallerDesc")}</p>
              <span className="text-[10px] text-[var(--color-accent-text)] mt-2 inline-flex items-center gap-1">
                {t("dashboard.openModule")} <ArrowRight size={12} />
              </span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateFeature("user-trash")}
              className="surface-card-soft p-4 text-left hover:bg-white/[0.05] transition-colors border border-transparent hover:border-white/10"
            >
              <Trash2 className="text-white/70 mb-2" size={18} />
              <p className="text-sm font-semibold text-white">{t("shell.userTrash")}</p>
              <p className="text-xs text-white/50 mt-1">{t("dashboard.moduleTrashDesc")}</p>
              <span className="text-[10px] text-[var(--color-accent-text)] mt-2 inline-flex items-center gap-1">
                {t("dashboard.openModule")} <ArrowRight size={12} />
              </span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateFeature("monitor")}
              className="surface-card-soft p-4 text-left hover:bg-white/[0.05] transition-colors border border-transparent hover:border-white/10"
            >
              <Activity className="text-violet-400 mb-2" size={18} />
              <p className="text-sm font-semibold text-white">{t("shell.monitor")}</p>
              <p className="text-xs text-white/50 mt-1">{t("dashboard.moduleMonitorDesc")}</p>
              <span className="text-[10px] text-[var(--color-accent-text)] mt-2 inline-flex items-center gap-1">
                {t("dashboard.openModule")} <ArrowRight size={12} />
              </span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateFeature("history")}
              className="surface-card-soft p-4 text-left hover:bg-white/[0.05] transition-colors border border-transparent hover:border-white/10"
            >
              <Clock3 className="text-white/50 mb-2" size={18} />
              <p className="text-sm font-semibold text-white">{t("shell.history")}</p>
              <p className="text-xs text-white/50 mt-1">{t("dashboard.moduleHistoryDesc")}</p>
              <span className="text-[10px] text-[var(--color-accent-text)] mt-2 inline-flex items-center gap-1">
                {t("dashboard.openModule")} <ArrowRight size={12} />
              </span>
            </button>
          </div>
        </div>

        <div className="shrink-0 py-2 mt-1">
          <div className="flex items-center gap-2 text-[10px] font-semibold text-white/25 uppercase tracking-[0.12em] flex-wrap">
            <div className="w-1 h-1 rounded-full bg-white/20" />
            {t("dashboard.lastScan")}: {last ?? t("dashboard.neverScan")}
            <div className="w-1 h-1 rounded-full bg-white/20" />
            {saved}
          </div>
        </div>
      </div>
    </div>
  );
}
