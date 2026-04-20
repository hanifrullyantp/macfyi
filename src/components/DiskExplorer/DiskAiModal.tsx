import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/context";
import { DiskAiPanel } from "./DiskAiPanel";

const INTRO_KEY = "macfyi.diskAiIntroSeen";

export function DiskAiModal({
  open,
  onClose,
  aiText,
  aiLoading,
  aiSource,
  onRunAi,
}: {
  open: boolean;
  onClose: () => void;
  aiText: string;
  aiLoading: boolean;
  aiSource: "idle" | "local" | "kb";
  onRunAi: () => void;
}) {
  const { t } = useI18n();
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    if (!open) return;
    try {
      const seen = localStorage.getItem(INTRO_KEY);
      setShowIntro(seen !== "1");
    } catch {
      setShowIntro(true);
    }
  }, [open]);

  const dismissIntro = () => {
    try {
      localStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* */
    }
    setShowIntro(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disk-ai-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full sm:max-w-lg max-h-[min(92vh,640px)] flex flex-col rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#14151c] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 shrink-0">
          <h2 id="disk-ai-modal-title" className="text-sm font-semibold text-white">
            {t("diskExplorer.aiModalTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
            aria-label={t("common.close")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {showIntro ? (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/30 px-3 py-2.5 text-xs text-emerald-100/90 leading-relaxed">
              <p>{t("diskExplorer.aiModalIntro")}</p>
              <button type="button" onClick={dismissIntro} className="mt-2 text-[11px] font-semibold text-emerald-300 hover:underline">
                {t("diskExplorer.aiModalIntroOk")}
              </button>
            </div>
          ) : null}
          <DiskAiPanel text={aiText} loading={aiLoading} source={aiSource} onRun={onRunAi} />
        </div>
      </div>
    </div>
  );
}
