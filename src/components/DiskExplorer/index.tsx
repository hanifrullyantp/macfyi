import { useEffect, useRef, useState } from "react";
import { Bot, RefreshCw } from "lucide-react";
import { DiskExplorerProvider, useDiskExplorerStore } from "../../store/diskExplorerStore";
import { useI18n } from "../../i18n/context";
import { useAppActivity } from "../../context/AppActivityContext";
import { DiskExplorerBanner } from "./DiskExplorerBanner";
import { DiskUsageBar } from "./DiskUsageBar";
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
  const exportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (exportTimerRef.current) clearTimeout(exportTimerRef.current);
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
    const msg = t("diskExplorer.trashConfirm", { count: s.selectedPaths.length });
    if (!window.confirm(msg)) return;
    const risky = s.nodes.some(
      (n) => s.selectedPaths.includes(n.path) && (n.riskLevel === "Risky" || n.riskLevel === "Caution")
    );
    if (risky && !window.confirm(t("diskExplorer.trashConfirmRisky"))) {
      return;
    }
    const res = await s.trashSelected();
    if (res && res.failed.length) {
      window.alert(res.failed.map((f) => `${f.path}: ${f.message}`).join("\n"));
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
    <div className="h-full min-h-0 flex flex-col gap-4 p-4 sm:p-6 overflow-hidden">
      <header className="shrink-0 space-y-1">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">{t("diskExplorer.title")}</h1>
            <p className="text-sm text-white/55 max-w-2xl mt-1">{t("diskExplorer.subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAiModalOpen(true)}
              className="btn-secondary text-xs inline-flex items-center gap-2 px-3 py-2 border-emerald-500/25 bg-emerald-950/20 hover:bg-emerald-950/35"
            >
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              {t("diskExplorer.aiOpenButton")}
            </button>
            <button type="button" onClick={() => void s.refreshAll()} className="btn-secondary text-xs inline-flex items-center gap-2 px-3 py-2">
              <RefreshCw className="w-3.5 h-3.5" />
              {t("diskExplorer.refresh")}
            </button>
          </div>
        </div>
      </header>

      <DiskExplorerBanner fdaOk={s.fdaOk} onOpenFda={() => void s.openFda()} />

      {s.volume ? (
        <div className="shrink-0 max-w-xl">
          <DiskUsageBar totalBytes={s.volume.totalBytes} usedBytes={s.volume.usedBytes} freeBytes={s.volume.freeBytes} />
        </div>
      ) : null}

      <DiskExplorerBreadcrumbs items={s.breadcrumbs} onNavigate={(i) => void s.navigateBreadcrumb(i)} />

      {exportNotice && (
        <p className="text-sm text-emerald-200/90 rounded-lg border border-emerald-500/25 bg-emerald-950/20 px-3 py-2" role="status">
          {exportNotice}
        </p>
      )}

      {s.error ? (
        <p className="text-sm text-rose-300/90">
          {t("diskExplorer.errorPrefix")} {s.error}
        </p>
      ) : null}

      <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
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
            <div className="flex-1 min-h-0 overflow-auto pr-1">
              <DiskNodeTable
                nodes={s.nodes}
                selectedPaths={s.selectedPaths}
                onToggle={s.toggleSelect}
                onOpenDir={(n) => void s.navigateTo(n.path, n.displayName)}
                onTopFiles={(p) => void s.openFileModal(p)}
              />
            </div>
            <DiskActionBar
              selectedCount={s.selectedPaths.length}
              savingsBytes={s.savingsBytes}
              onReveal={() => void s.revealSelected()}
              onTrash={() => void handleTrash()}
              onExportJson={() => void handleExport("json")}
              onExportTxt={() => void handleExport("txt")}
              onClear={s.clearSelection}
              onSelectSafe={s.selectAllSafe}
            />
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
