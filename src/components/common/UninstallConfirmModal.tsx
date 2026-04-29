import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import type { UninstallAppEntry } from "../../types";

const ONE_GIB = 1024 ** 3;

function fmtBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

export type UninstallConfirmModalProps = {
  open: boolean;
  app: UninstallAppEntry | null;
  /** Paths of related folders that are checked */
  residualPathsSelected: Set<string>;
  useTrashMode: boolean;
  isRemoving: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
};

export function UninstallConfirmModal({
  open,
  app,
  residualPathsSelected,
  useTrashMode,
  isRemoving,
  onConfirm,
  onClose,
  t,
}: UninstallConfirmModalProps) {
  const [largeAck, setLargeAck] = useState(false);

  const residualRows = useMemo(() => {
    if (!app) return [];
    return app.related.filter((r) => residualPathsSelected.has(r.path));
  }, [app, residualPathsSelected]);

  const totalResidualBytes = useMemo(
    () => residualRows.reduce((s, r) => s + r.sizeBytes, 0),
    [residualRows]
  );

  const totalBytes = (app?.appSizeBytes ?? 0) + totalResidualBytes;
  const isLargeRemoval = totalBytes >= ONE_GIB;

  useEffect(() => {
    if (open) setLargeAck(false);
  }, [open, app]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open || isRemoving) return;
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isRemoving, onClose]);

  const canConfirm =
    !!app && (!isLargeRemoval || largeAck) && !isRemoving;

  return (
    <AnimatePresence>
      {open && app ? (
        <motion.div
          key="uninstall-confirm-layer"
          role="presentation"
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default border-0 p-0"
            aria-hidden
            disabled={isRemoving}
            onClick={() => {
              if (!isRemoving) onClose();
            }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="uninstall-confirm-title"
            className="relative w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/15 bg-[#15161e] shadow-[0_24px_60px_rgba(0,0,0,0.55)] max-h-[min(88vh,640px)] flex flex-col mt-auto sm:mt-0"
            initial={{ y: 36, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="shrink-0 flex items-start justify-between gap-3 px-5 pt-5 pb-2 border-b border-white/10">
              <div>
                <h2 id="uninstall-confirm-title" className="text-lg font-semibold text-white tracking-tight">
                  {t("uninstallerPanel.confirmModalTitle")}
                </h2>
                <p className="text-sm font-medium text-white/90 mt-1 truncate" title={app.name}>
                  {app.name}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isRemoving}
                className="p-2 rounded-lg text-white/45 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
                aria-label={t("uninstallerPanel.confirmModalCancel")}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4 text-sm">
              <>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 space-y-2">
                    <p className="text-[11px] uppercase tracking-wide text-white/45">{t("uninstallerPanel.confirmModalBundleSection")}</p>
                    <p className="text-xs font-mono text-white/65 break-all">{app.bundleId || "—"}</p>
                    <p className="text-[11px] text-white/50 break-all">{app.appPath}</p>
                    <p className="text-xs tabular-nums text-white/70">{fmtBytes(app.appSizeBytes)}</p>
                  </div>

                  <div className="rounded-xl border border-amber-500/25 bg-amber-950/30 px-3 py-2.5">
                    <p className="text-[11px] text-amber-100/95 leading-snug">{t(useTrashMode ? "uninstallerPanel.confirmModalTrashPolicy" : "uninstallerPanel.confirmModalPermanentPolicy")}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline gap-2">
                      <p className="text-[11px] uppercase tracking-wide text-white/45">{t("uninstallerPanel.confirmModalResidualsTitle")}</p>
                      <span className="text-xs text-white/55 tabular-nums">{fmtBytes(totalResidualBytes)}</span>
                    </div>
                    {residualRows.length === 0 ? (
                      <p className="text-xs text-white/45">{t("uninstallerPanel.confirmModalResidualsNone")}</p>
                    ) : (
                      <ul className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                        {residualRows.map((r) => (
                          <li
                            key={r.path}
                            className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs"
                          >
                            <span className="font-medium text-white/85">{r.label}</span>
                            <span className="text-white/45 tabular-nums float-right">{fmtBytes(r.sizeBytes)}</span>
                            <p className="text-[10px] text-white/35 font-mono break-all mt-0.5">{r.path}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex justify-between gap-4 pt-2 border-t border-white/10">
                    <span className="text-white/55">{t("uninstallerPanel.confirmModalTotalFreed")}</span>
                    <span className="text-base font-semibold text-emerald-300/95 tabular-nums">{fmtBytes(totalBytes)}</span>
                  </div>

                  {isLargeRemoval ? (
                    <label className="flex gap-3 items-start rounded-xl border border-rose-500/25 bg-rose-950/25 px-3 py-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={largeAck}
                        disabled={isRemoving}
                        onChange={() => setLargeAck((v) => !v)}
                        className="mt-1 rounded border-white/30"
                      />
                      <span className="text-[12px] text-rose-100/95 leading-snug">{t("uninstallerPanel.confirmModalLargeAck")}</span>
                    </label>
                  ) : null}
              </>
            </div>

            <div className="shrink-0 px-5 py-4 border-t border-white/10 flex flex-wrap gap-2 justify-end bg-black/35 rounded-b-none sm:rounded-b-2xl">
              <button
                type="button"
                onClick={onClose}
                disabled={isRemoving}
                className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
              >
                {t("uninstallerPanel.confirmModalCancel")}
              </button>
              <button
                type="button"
                disabled={!canConfirm}
                onClick={() => void onConfirm()}
                className="btn-danger px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isRemoving ? (
                  <>
                    <Loader2 size={16} className="animate-spin shrink-0" />
                    {t("uninstallerPanel.confirmModalRemoving")}
                  </>
                ) : (
                  t("uninstallerPanel.confirmModalConfirm")
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
