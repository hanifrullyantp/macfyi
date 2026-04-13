import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { EnrichedItem } from "../../lib/results-types";
import type { DeletionModeSetting } from "../../lib/deletion-settings";
import { cn } from "../../utils/cn";
import { useI18n } from "../../i18n/context";

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export function CleanConfirmSheet({
  open,
  onClose,
  onConfirm,
  items,
  defaultDeletionMode,
  filterActive,
  filteredCount,
  totalCount,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (mode: DeletionModeSetting) => void | Promise<void>;
  items: EnrichedItem[];
  defaultDeletionMode: DeletionModeSetting;
  filterActive: boolean;
  filteredCount: number;
  totalCount: number;
}) {
  const { t } = useI18n();
  const [sessionMode, setSessionMode] = useState<DeletionModeSetting>(defaultDeletionMode);
  const [typed, setTyped] = useState("");
  const [proceedReady, setProceedReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSessionMode(defaultDeletionMode);
    setTyped("");
    setProceedReady(false);
    const tid = window.setTimeout(() => setProceedReady(true), 1500);
    return () => clearTimeout(tid);
  }, [open, defaultDeletionMode]);

  const stats = useMemo(() => {
    let safeC = 0,
      safeB = 0,
      cauC = 0,
      cauB = 0,
      riskC = 0,
      riskB = 0;
    for (const x of items) {
      if (x.risk === "safe") {
        safeC++;
        safeB += x.item.size;
      } else if (x.risk === "caution") {
        cauC++;
        cauB += x.item.size;
      } else {
        riskC++;
        riskB += x.item.size;
      }
    }
    return { safeC, safeB, cauC, cauB, riskC, riskB };
  }, [items]);

  const needsDeleteType = sessionMode === "permanent" && stats.riskC > 0;
  const canProceed = proceedReady && (!needsDeleteType || typed === "DELETE");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={() => !busy && onClose()} />
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl border border-white/15 bg-[#16181e] shadow-2xl p-6 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clean-title"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-amber-300">
            <AlertTriangle size={22} />
            <h2 id="clean-title" className="text-lg font-semibold text-white">
              {t("clean.sheetTitle")}
            </h2>
          </div>
          <button type="button" className="p-1 text-white/45 hover:text-white" onClick={() => !busy && onClose()} aria-label={t("common.close")}>
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-white/65">
          {t("clean.aboutToRemove")}{" "}
          <strong className="text-white">{items.length}</strong> {items.length === 1 ? t("clean.file") : t("clean.files")} (
          {formatBytes(items.reduce((a, x) => a + x.item.size, 0))}
          ).
        </p>

        {filterActive && (
          <p className="text-xs text-amber-200/90 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            {t("clean.filterWarn", { visible: filteredCount, total: totalCount })}
          </p>
        )}

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-1.5 text-sm">
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">{t("clean.includes")}</p>
          <div className="flex justify-between text-emerald-300/95">
            <span>{t("clean.riskSafe")}</span>
            <span>
              {stats.safeC} files · {formatBytes(stats.safeB)}
            </span>
          </div>
          <div className="flex justify-between text-amber-300/95">
            <span>Caution</span>
            <span>
              {stats.cauC} files · {formatBytes(stats.cauB)}
            </span>
          </div>
          <div className="flex justify-between text-red-300/95">
            <span>{t("clean.riskyLabel")}</span>
            <span>
              {stats.riskC} files · {formatBytes(stats.riskB)}
            </span>
          </div>
        </div>

        {stats.riskC > 0 && (
          <p className="text-xs text-red-300/90">{t("clean.riskyIncluded", { n: stats.riskC })}</p>
        )}

        <div className="space-y-2">
          <p className="text-[11px] text-white/55">{t("clean.deletionMethodSession")}</p>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="sdel"
              checked={sessionMode === "trash"}
              onChange={() => setSessionMode("trash")}
              className="mt-1"
            />
            <span className="text-sm text-white/85">
              {t("clean.moveTrash")} — {t("clean.moveTrashHint")}
            </span>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="sdel"
              checked={sessionMode === "permanent"}
              onChange={() => setSessionMode("permanent")}
              className="mt-1"
            />
            <span className="text-sm text-amber-200/95">
              {t("clean.deletePermanent")} — {t("clean.deletePermanentHint")}
            </span>
          </label>
        </div>

        {needsDeleteType && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 space-y-2">
            <p className="text-xs font-semibold text-red-200">{t("clean.permanentRiskyTitle")}</p>
            <p className="text-[11px] text-white/65">{t("clean.typeDeletePrompt")}</p>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full bg-black/30 border border-red-500/30 rounded-lg px-2 py-1.5 text-sm text-white"
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary px-4 py-2 text-sm" disabled={busy} onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            type="button"
            className={cn(
              "px-4 py-2 text-sm rounded-xl font-semibold text-white",
              sessionMode === "trash" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"
            )}
            disabled={!canProceed || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm(sessionMode);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? t("clean.working") : sessionMode === "trash" ? t("clean.moveToTrashBtn") : t("clean.deletePermBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}
