import { useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useI18n } from "../i18n/context";

const AUTO_DISMISS_MS = 8000;

type AIAssistantPromptBannerProps = {
  question: string;
  onOpen: () => void;
  onDismiss: () => void;
  /** Called when auto-dismiss timer fires (rotate question or end session). */
  onAutoAdvance: () => void;
};

export function AIAssistantPromptBanner({
  question,
  onOpen,
  onDismiss,
  onAutoAdvance,
}: AIAssistantPromptBannerProps) {
  const { t } = useI18n();

  useEffect(() => {
    const id = window.setTimeout(() => onAutoAdvance(), AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [question, onAutoAdvance]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="fixed left-1/2 -translate-x-1/2 bottom-[calc(7rem+env(safe-area-inset-bottom,0px))] md:bottom-8 z-[70] w-[min(92vw,28rem)] pointer-events-auto"
    >
      <div className="rounded-2xl border border-white/12 bg-[#1a1b22]/95 backdrop-blur-md shadow-2xl px-4 py-3 flex gap-3 items-start">
        <div className="mt-0.5 rounded-lg bg-[var(--color-brand)]/20 p-1.5 shrink-0">
          <Sparkles size={16} className="text-[var(--color-brand-glow)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/90 leading-snug">{question}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={onOpen} className="btn-primary text-xs py-1.5 px-3">
              {t("assistant.bannerCta")}
            </button>
            <button type="button" onClick={onDismiss} className="btn-secondary text-xs py-1.5 px-2">
              {t("common.close")}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg text-white/35 hover:text-white/80 hover:bg-white/10 shrink-0"
          aria-label={t("common.close")}
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}
