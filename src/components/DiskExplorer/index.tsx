import { useEffect, useRef, useState } from "react";
import { Bot, ScanSearch } from "lucide-react";
import { DiskExplorerProvider, useDiskExplorerStore } from "../../store/diskExplorerStore";
import { useI18n } from "../../i18n/context";
import { useAppActivity } from "../../context/AppActivityContext";
import { marketingCheckoutUrl } from "../../lib/marketingUrl";
import { revealInFinder } from "../../lib/backend";
import { DiskExplorerBanner } from "./DiskExplorerBanner";
import { DiskExplorerBreadcrumbs } from "./Breadcrumbs";
import { DiskNodeTable } from "./DiskNodeTable";
import { DiskAiModal } from "./DiskAiModal";
import { DiskActionBar } from "./DiskActionBar";
import { FileListModal } from "./FileListModal";
import { ScanningOverlay } from "./ScanningOverlay";

function DiskExplorerInner() {
  const { t } = useI18n();
  const s = useDiskExplorerStore();
  const { registerActivity } = useAppActivity();
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [trashNotice, setTrashNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const displayError = (() => {
    if (!s.error) return null;
    if (s.error.startsWith("DEMO_DEPTH_LIMIT:")) {
      return t("diskExplorer.demoDepthLimit", { max: s.maxDemoDepth });
    }
    return s.error;
  })();

  const exportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (exportTimerRef.current) clearTimeout(exportTimerRef.current);
      if (trashTimerRef.current) clearTimeout(trashTimerRef.current);
    };
  }, []);

  useEffect(() => {
    registerActivity("disk-explorer-folder", s.loading ? t("activity.diskFolder") : null);
    return () => registerActivity("disk-explorer-folder", null);
  }, [s.loading, registerActivity, t]);

  useEffect(() => {
    registerActivity("disk-explorer-ai", s.aiLoading ? t("activity.diskAi") : null);
    return () => registerActivity("disk-explorer-ai", null);
  }, [s.aiLoading, registerActivity, t]);

  const handleTrash = async () => {
    if (s.selectedPaths.length === 0) return;
    if (!s.isDemoLimited) {
      // continue
    } else {
      window.alert(t("diskExplorer.proOnlyDelete"));
      window.open(marketingCheckoutUrl(), "_blank", "noopener,noreferrer");
      return;
    }
    const msg = t("diskExplorer.trashConfirm", { count: s.selectedPaths.length });
    if (!window.confirm(msg)) return;
    const risky = s.nodes.some(
      (n) => s.selectedPaths.includes(n.path) && (n.riskLevel === "Risky" || n.riskLevel === "Caution")
    );
    if (risky && !window.confirm(t("diskExplorer.trashConfirmRisky"))) {
      return;
    }
    try {
      const res = await s.trashSelected();
      if (!res) return;
      if (trashTimerRef.current) clearTimeout(trashTimerRef.current);
      if (res.failed.length > 0) {
        setTrashNotice({
          type: "error",
          message: `${t("diskExplorer.trashFailed")} ${res.failed.length}/${res.failed.length + res.succeeded.length}`,
        });
      } else {
        setTrashNotice({
          type: "success",
          message: t("diskExplorer.trashSuccess", { count: res.succeeded.length }),
        });
      }
      trashTimerRef.current = setTimeout(() => setTrashNotice(null), 4500);
    } catch (e) {
      if (trashTimerRef.current) clearTimeout(trashTimerRef.current);
      setTrashNotice({
        type: "error",
        message: `${t("diskExplorer.trashError")} ${e instanceof Error ? e.message : String(e)}`,
      });
      trashTimerRef.current = setTimeout(() => setTrashNotice(null), 5000);
    }
  };

  const handleExport = async (format: "json" | "txt") => {
    const path = await s.exportReport(format);
    if (exportTimerRef.current) clearTimeout(exportTimerRef.current);
    if (path) {
      setExportNotice(`${t("diskExplorer.exportDone")} ${path}`);
      exportTimerRef.current = setTimeout(() => setExportNotice(null), 8000);
    } else {
      setExportNotice(t("diskExplorer.exportFailed"));
      exportTimerRef.current = setTimeout(() => setExportNotice(null), 5000);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-3 p-4 sm:p-5 overflow-hidden">
      <header className="shrink-0 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-white tracking-tight">{t("diskExplorer.title")}</h1>
            {s.lastScannedAt ? (
              <p className="text-[11px] text-white/45 mt-0.5">
                {t("diskExplorer.lastScanAt", { time: s.lastScannedAt.toLocaleTimeString() })}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setAiModalOpen(true)}
              className="btn-secondary text-xs inline-flex items-center gap-2 px-3 py-2 border-emerald-500/25 bg-emerald-950/20 hover:bg-emerald-950/35"
            >
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              {t("diskExplorer.aiOpenButton")}
            </button>
            <button
              type="button"
              onClick={() => void s.scan(s.currentPath, true)}
              disabled={s.loading}
              className="btn-secondary text-xs inline-flex items-center gap-2 px-3 py-2 border-[var(--color-brand)]/35 bg-[var(--color-brand)]/10 hover:bg-[var(--color-brand)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ScanSearch className="w-3.5 h-3.5 text-[var(--color-brand-glow)]" />
              {t("diskExplorer.fullScan")}
            </button>
          </div>
        </div>
        {s.isScanning ? (
          <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden" aria-hidden={false} role="progressbar" aria-valuenow={s.scanProgress} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-[width] duration-150 ease-out"
              style={{ width: `${s.scanProgress}%` }}
            />
          </div>
        ) : null}
      </header>

      <DiskExplorerBanner fdaOk={s.fdaOk} onOpenFda={() => void s.openFda()} />

      <DiskExplorerBreadcrumbs items={s.breadcrumbs} onNavigate={(i) => void s.navigateBreadcrumb(i)} />

      {exportNotice && (
        <p className="text-sm text-emerald-200/90 rounded-lg border border-emerald-500/25 bg-emerald-950/20 px-3 py-2" role="status">
          {exportNotice}
        </p>
      )}
      {trashNotice && (
        <p
          className={`text-sm rounded-lg border px-3 py-2 ${
            trashNotice.type === "success"
              ? "text-emerald-200/90 border-emerald-500/25 bg-emerald-950/20"
              : "text-rose-200/90 border-rose-500/25 bg-rose-950/20"
          }`}
          role="status"
          aria-live="polite"
        >
          {trashNotice.message}
        </p>
      )}

      {displayError ? (
        <p className="text-sm text-rose-300/90">
          {t("diskExplorer.errorPrefix")} {displayError}
        </p>
      ) : null}
      {s.depthLimitReached ? (
        <p className="text-sm text-amber-200/90 rounded-lg border border-amber-500/25 bg-amber-950/25 px-3 py-2">
          {t("diskExplorer.demoDepthLimit", { max: s.maxDemoDepth })}
        </p>
      ) : null}

      <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
        {!s.hasScanned ? (
          <div className="surface-card p-6 md:p-8 max-w-3xl">
            <h2 className="text-xl font-semibold text-white">{t("diskExplorer.idleTitle")}</h2>
            <p className="text-sm text-white/60 mt-2 leading-relaxed">{t("diskExplorer.idleBody")}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" className="btn-primary px-4 py-2" onClick={() => void s.startInitialScan()}>
                {t("diskExplorer.idleScanCta")}
              </button>
              <button type="button" className="btn-secondary px-4 py-2" onClick={() => void s.openFda()}>
                {t("diskExplorer.openFda")}
              </button>
            </div>
          </div>
        ) : (
          <div className="relative min-h-0 flex flex-col gap-3 overflow-hidden flex-1">
            <ScanningOverlay show={s.loading} />
            <DiskActionBar
              selectedCount={s.selectedPaths.length}
              savingsBytes={s.savingsBytes}
              onReveal={() => void s.revealSelected()}
              onTrash={() => void handleTrash()}
              onExportJson={() => void handleExport("json")}
              onExportTxt={() => void handleExport("txt")}
              onClear={s.clearSelection}
              onSelectSafe={s.selectAllSafe}
              actionDisabled={s.selectedPaths.length === 0 || s.movingToTrash}
              loadingTrash={s.movingToTrash}
            />
            <div className="flex-1 min-h-0 overflow-auto pr-1">
              <DiskNodeTable
                nodes={s.nodes}
                selectedPaths={s.selectedPaths}
                onToggle={s.toggleSelect}
                onOpenDir={(n) => void s.navigateTo(n.path, n.displayName)}
                onTopFiles={(p) => void s.openFileModal(p)}
                onRevealPath={(p) => void revealInFinder(p)}
                blockDeepNavigation={s.depthLimitReached}
              />
            </div>
          </div>
        )}
      </div>

      <DiskAiModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        aiText={s.aiText}
        aiLoading={s.aiLoading}
        aiSource={s.aiSource}
        onRunAi={() => void s.runAiInsight()}
      />

      <FileListModal
        open={s.fileModalPath !== null}
        loading={s.fileModalLoading}
        rows={s.fileModalRows}
        onClose={s.closeFileModal}
      />
    </div>
  );
}

export function DiskExplorer() {
  return (
    <DiskExplorerProvider>
      <DiskExplorerInner />
    </DiskExplorerProvider>
  );
}
