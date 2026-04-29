import { Trash2, ExternalLink, FileJson, FileText, Eraser, ShieldCheck } from "lucide-react";
import { useI18n } from "../../i18n/context";

function fmtSize(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

export function DiskActionBar({
  selectedCount,
  savingsBytes,
  onReveal,
  onTrash,
  onExportJson,
  onExportTxt,
  onClear,
  onSelectSafe,
  actionDisabled = false,
  loadingTrash = false,
}: {
  selectedCount: number;
  savingsBytes: number;
  onReveal: () => void;
  onTrash: () => void;
  onExportJson: () => void;
  onExportTxt: () => void;
  onClear: () => void;
  onSelectSafe: () => void;
  actionDisabled?: boolean;
  loadingTrash?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101218]/90 backdrop-blur px-3 py-3 flex flex-wrap items-center gap-2">
      <div className="text-[11px] text-white/50 mr-auto min-w-[140px]">
        <span className="text-white/80 font-medium">{selectedCount}</span> selected · {t("diskExplorer.savings")}:{" "}
        <span className="text-emerald-300/90 tabular-nums">{fmtSize(savingsBytes)}</span>
      </div>
      <button type="button" onClick={onSelectSafe} className="btn-secondary text-xs inline-flex items-center gap-1 px-2.5 py-1.5">
        <ShieldCheck className="w-3.5 h-3.5" />
        {t("diskExplorer.actionSelectSafe")}
      </button>
      <button type="button" onClick={onReveal} disabled={actionDisabled} className="btn-secondary text-xs inline-flex items-center gap-1 px-2.5 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
        <ExternalLink className="w-3.5 h-3.5" />
        {t("diskExplorer.actionReveal")}
      </button>
      <button type="button" onClick={onTrash} disabled={actionDisabled} className="btn-secondary text-xs inline-flex items-center gap-1 px-2.5 py-1.5 border-amber-500/30 text-amber-100 disabled:opacity-40 disabled:cursor-not-allowed">
        <Trash2 className="w-3.5 h-3.5" />
        {loadingTrash ? t("diskExplorer.movingToTrash") : t("diskExplorer.actionTrash")}
      </button>
      <button type="button" onClick={onExportJson} className="btn-secondary text-xs inline-flex items-center gap-1 px-2.5 py-1.5">
        <FileJson className="w-3.5 h-3.5" />
        {t("diskExplorer.actionExportJson")}
      </button>
      <button type="button" onClick={onExportTxt} className="btn-secondary text-xs inline-flex items-center gap-1 px-2.5 py-1.5">
        <FileText className="w-3.5 h-3.5" />
        {t("diskExplorer.actionExportTxt")}
      </button>
      <button type="button" onClick={onClear} disabled={actionDisabled} className="btn-secondary text-xs inline-flex items-center gap-1 px-2.5 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
        <Eraser className="w-3.5 h-3.5" />
        {t("diskExplorer.actionClear")}
      </button>
    </div>
  );
}
