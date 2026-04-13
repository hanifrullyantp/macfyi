import { motion } from "framer-motion";
import { Sparkles, ShieldCheck, Layers, Activity, ArrowRight } from "lucide-react";
import { getLastScanLabel, getSavedThisMonthLabel } from "../lib/storage";
import { StorageChart } from "./StorageChart";
import { ScanOrbButton } from "./ScanOrbButton";
import type { StorageEntry } from "../types";
import { useI18n } from "../i18n/context";

interface DashboardProps {
  onStartScan: () => void;
  onReview?: () => void;
  hasResults?: boolean;
  safePotentialLabel?: string;
  storageEntries: StorageEntry[];
  freeGb: number;
  totalGb: number;
}

export const Dashboard = ({
  onStartScan,
  onReview,
  hasResults = false,
  safePotentialLabel = "0 MB",
  storageEntries,
  freeGb,
  totalGb,
}: DashboardProps) => {
  const { t } = useI18n();
  const last = getLastScanLabel();
  const saved = getSavedThisMonthLabel();
  const hasStorage = storageEntries.length > 0;

  return (
    <div className="relative z-10 flex flex-col h-full min-h-0 overflow-y-auto custom-scrollbar px-6 py-6 md:px-8 pb-28">
      <div className="max-w-5xl w-full mx-auto flex flex-col flex-1 min-h-0">
        <div className="shrink-0 relative rounded-2xl border border-white/[0.06] bg-[#0a0b0f]/55 px-5 py-3 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
            Smart Care <Sparkles className="text-[var(--color-accent-text)]" size={20} />
          </h1>
          <p className="text-xs sm:text-sm text-white/55 mt-0.5">{t("dashboard.heroHint")}</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center min-h-[min(52vh,28rem)] py-8">
          <div className="relative flex flex-col items-center gap-5">
            <div className="relative scale-[1.55] sm:scale-[1.85] md:scale-[2]">
              <ScanOrbButton
                mode="idle_scan"
                mainText={t("orb.scan")}
                subLabel={t("orb.subSmart")}
                onClick={onStartScan}
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {hasResults && onReview && (
                <button type="button" onClick={onReview} className="btn-secondary text-sm">
                  Review Items <ArrowRight size={14} />
                </button>
              )}
              <button type="button" onClick={onStartScan} className="btn-primary text-sm sm:hidden">
                {t("orb.scan")}
              </button>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="shrink-0 surface-card p-5 sm:p-6 mt-auto"
        >
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">AI Summary</p>
              <h2 className="text-lg sm:text-xl font-semibold text-white mt-1">
                You can safely free {safePotentialLabel}
              </h2>
              <p className="text-xs sm:text-sm text-white/60 mt-2 max-w-xl">
                Review recommended items first, then clean only after you confirm.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasResults && onReview && (
                <button type="button" onClick={onReview} className="btn-secondary hidden sm:inline-flex">
                  Review Items <ArrowRight size={14} />
                </button>
              )}
              <button type="button" onClick={onStartScan} className="btn-primary hidden sm:inline-flex">
                Run Smart Scan
              </button>
            </div>
          </div>
        </motion.div>

        {hasStorage && (
          <div className="shrink-0 surface-card p-5 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-white/60 uppercase tracking-[0.12em]">Storage Overview</h2>
              <span className="text-xs text-white/40 font-mono tabular-nums">
                {freeGb > 0 ? `${freeGb.toFixed(1)} GB free of ${totalGb.toFixed(0)} GB` : ""}
              </span>
            </div>
            <StorageChart entries={storageEntries} />
          </div>
        )}

        <div className="shrink-0 grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="surface-card-soft p-4 hover:bg-white/[0.05] transition-colors">
            <ShieldCheck className="text-emerald-400 mb-2" size={18} />
            <p className="text-sm font-semibold text-white">Safe Cleanup</p>
            <p className="text-xs text-white/50 mt-1">Caches, logs, trash, and attachments with risk labels.</p>
          </div>
          <div className="surface-card-soft p-4 hover:bg-white/[0.05] transition-colors">
            <Layers className="text-cyan-400 mb-2" size={18} />
            <p className="text-sm font-semibold text-white">My Clutter</p>
            <p className="text-xs text-white/50 mt-1">Duplicates and large files sorted for fast decisions.</p>
          </div>
          <div className="surface-card-soft p-4 hover:bg-white/[0.05] transition-colors">
            <Activity className="text-violet-400 mb-2" size={18} />
            <p className="text-sm font-semibold text-white">Monitor</p>
            <p className="text-xs text-white/50 mt-1">Track free space trends and cleanup history.</p>
          </div>
        </div>

        <div className="shrink-0 py-2 mt-2">
          <div className="flex items-center gap-2 text-[10px] font-semibold text-white/25 uppercase tracking-[0.12em] flex-wrap">
            <div className="w-1 h-1 rounded-full bg-white/20" />
            Last scan: {last ?? "Never"}
            <div className="w-1 h-1 rounded-full bg-white/20" />
            {saved} saved this month
          </div>
        </div>
      </div>
    </div>
  );
};
