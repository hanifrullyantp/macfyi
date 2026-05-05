import { AnimatePresence, motion } from "framer-motion";
import { useI18n } from "../i18n/context";

type UpdateFloatingNoticeProps = {
  open: boolean;
  latestVersion: string;
  manualOnly: boolean;
  installing: boolean;
  progressPct: number;
  progressLabel: string | null;
  onInstall: () => void;
  onManual: () => void;
  onDismiss: () => void;
};

export function UpdateFloatingNotice({
  open,
  latestVersion,
  manualOnly,
  installing,
  progressPct,
  progressLabel,
  onInstall,
  onManual,
  onDismiss,
}: UpdateFloatingNoticeProps) {
  const { t } = useI18n();
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="fixed bottom-4 left-4 z-[220] w-[min(92vw,22rem)]"
        >
          <div className="rounded-2xl border border-red-500/40 bg-red-950/85 px-4 py-3 shadow-2xl backdrop-blur">
            <div className="text-sm font-semibold text-white">{t("update.title")}</div>
            <div className="mt-1 text-xs text-red-100/95">
              {manualOnly
                ? t("update.manualOnlyBody", { version: latestVersion })
                : t("update.body", { version: latestVersion })}
            </div>
            {progressLabel ? <div className="mt-2 text-[11px] text-red-100/85">{progressLabel}</div> : null}
            {installing ? (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPct}>
                <div
                  className="h-full bg-white/90 transition-[width] duration-150 ease-out"
                  style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
                />
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={manualOnly ? onManual : onInstall}
                disabled={installing}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {manualOnly
                  ? t("update.downloadManual")
                  : installing
                    ? t("update.installing")
                    : t("update.installNow")}
              </button>
              {!manualOnly ? (
                <button
                  type="button"
                  onClick={onManual}
                  disabled={installing}
                  className="rounded-lg border border-white/25 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t("update.downloadManual")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={onDismiss}
                disabled={installing}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/85 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("update.later")}
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
