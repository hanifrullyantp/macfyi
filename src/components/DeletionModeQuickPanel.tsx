import { motion } from "framer-motion";
import { Trash2, X, AlertTriangle } from "lucide-react";
import type { DeletionModeSetting } from "../lib/deletion-settings";
import { useI18n } from "../i18n/context";

export function DeletionModeQuickPanel({
  mode,
  onChange,
  onClose,
}: {
  mode: DeletionModeSetting;
  onChange: (next: DeletionModeSetting) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[200] p-6">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-sm bg-[#1c1c1e] border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <Trash2 size={18} className="text-[var(--color-brand-glow)] shrink-0" />
            <span className="font-semibold text-white text-sm truncate">{t("deletionModePanel.title")}</span>
          </div>
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white shrink-0" aria-label={t("common.close")}>
            <X size={18} />
          </button>
        </div>

        <p className="px-4 pt-3 text-[11px] text-white/50 leading-relaxed">{t("deletionModePanel.hint")}</p>

        <div className="p-4 space-y-2">
          <button
            type="button"
            onClick={() => onChange("trash")}
            className={`w-full flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
              mode === "trash"
                ? "border-[var(--color-brand)] bg-[var(--color-brand)]/15"
                : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
            }`}
          >
            <Trash2 size={18} className="text-white/70 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-white">{t("shell.deletionTrash")}</div>
              <div className="text-[11px] text-white/45 mt-0.5">{t("deletionModePanel.trashDetail")}</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onChange("permanent")}
            className={`w-full flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
              mode === "permanent"
                ? "border-amber-500/60 bg-amber-500/10"
                : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
            }`}
          >
            <AlertTriangle size={18} className="text-amber-400/90 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-white">{t("shell.deletionPermanent")}</div>
              <div className="text-[11px] text-white/45 mt-0.5">{t("deletionModePanel.permanentDetail")}</div>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
