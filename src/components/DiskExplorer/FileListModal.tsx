import { X } from "lucide-react";
import { useI18n } from "../../i18n/context";
import type { DiskExplorerFileInfo } from "../../lib/types/diskExplorer";

function fmtSize(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

export function FileListModal({
  open,
  loading,
  rows,
  onClose,
}: {
  open: boolean;
  loading: boolean;
  rows: DiskExplorerFileInfo[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[340] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[80vh] rounded-2xl border border-white/15 bg-[#14161d] shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-sm font-semibold text-white">{t("diskExplorer.modalTitle")}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto p-2">
          {loading ? (
            <p className="text-sm text-white/45 px-2 py-6 text-center">{t("diskExplorer.modalLoading")}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-white/45 px-2 py-6 text-center">{t("diskExplorer.modalEmpty")}</p>
          ) : (
            <ul className="space-y-1">
              {rows.map((r) => (
                <li
                  key={`${r.name}-${r.lastModified}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-xs bg-white/[0.04] border border-white/5"
                >
                  <span className="text-white/90 truncate">{r.name}</span>
                  <span className="text-white/50 shrink-0 tabular-nums">{fmtSize(r.sizeBytes)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
