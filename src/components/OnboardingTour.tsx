import { useState, type ComponentType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { open } from "@tauri-apps/plugin-dialog";
import {
  X,
  Sparkles,
  Trash2,
  Zap,
  PackageOpen,
  MessageCircle,
  FolderOpen,
} from "lucide-react";
import { useI18n } from "../i18n/context";
import {
  ONBOARDING_CONTENT_VERSION,
  STORAGE_FOLDER,
  getOnboardingDoneKey,
  getOnboardingVersionKey,
  persistOnboardingCompletedNative,
  type OnboardingCompleteDetail,
} from "../lib/onboardingStorage";

export type { OnboardingCompleteDetail };
export { ONBOARDING_CONTENT_VERSION, STORAGE_FOLDER };

const SLIDE_ICONS: ComponentType<{ className?: string; strokeWidth?: number }>[] = [
  Sparkles,
  Trash2,
  Zap,
  PackageOpen,
  MessageCircle,
  FolderOpen,
];

/** Optional images: place files at `public/onboarding/slide-0.png` … `slide-5.png` */
function slideImageSrc(index: number): string | undefined {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/onboarding/slide-${index}.png`;
}

function SlideVisual({
  slideIndex,
  Icon,
}: {
  slideIndex: number;
  Icon: (typeof SLIDE_ICONS)[number];
}) {
  const [imgErr, setImgErr] = useState(false);
  const src = slideImageSrc(slideIndex);

  if (src && !imgErr) {
    return (
      <div className="relative h-full min-h-[180px] md:min-h-[220px] rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03]">
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImgErr(true)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[180px] md:min-h-[220px] rounded-2xl border border-white/10 bg-gradient-to-br from-[var(--color-brand)]/25 via-[#1a1c24] to-[#0e0f14] flex items-center justify-center p-10">
      <Icon className="w-20 h-20 md:w-24 md:h-24 text-white/35" strokeWidth={1} />
    </div>
  );
}

export function OnboardingTour({
  onComplete,
}: {
  onComplete: (detail: OnboardingCompleteDetail) => void;
}) {
  const { t } = useI18n();
  const [slide, setSlide] = useState(0);
  const total = 6;

  const markDoneAndComplete = (source: OnboardingCompleteDetail["source"]) => {
    try {
      localStorage.setItem(getOnboardingDoneKey(), "1");
      localStorage.setItem(getOnboardingVersionKey(), String(ONBOARDING_CONTENT_VERSION));
    } catch {
      /* */
    }
    void persistOnboardingCompletedNative(ONBOARDING_CONTENT_VERSION);
    onComplete({ source });
  };

  const dismiss = () => {
    markDoneAndComplete("skipped");
  };

  const next = () => {
    if (slide < total - 1) setSlide((s) => s + 1);
  };

  const pickFolder = async () => {
    try {
      const dir = await open({
        directory: true,
        multiple: false,
        title: t("onboard.permTitle"),
      });
      if (typeof dir === "string" && dir.length > 0) {
        localStorage.setItem(STORAGE_FOLDER, dir);
      }
    } catch {
      /* dialog unavailable in browser */
    }
    markDoneAndComplete("last_step");
  };

  const confirmStartFirstScan = () => {
    markDoneAndComplete("last_step");
  };

  const titles = [
    t("onboard.welcomeTitle"),
    t("onboard.cleanTitle"),
    t("onboard.perfTitle"),
    t("onboard.uninstallTitle"),
    t("onboard.aiTitle"),
    t("onboard.permTitle"),
  ];

  const bodies = [
    t("onboard.welcomeSubtitle"),
    t("onboard.cleanBody"),
    t("onboard.perfBody"),
    t("onboard.uninstallBody"),
    t("onboard.aiBody"),
    t("onboard.permBody"),
  ];

  const Icon = SLIDE_ICONS[slide] ?? Sparkles;
  const isLast = slide === total - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.96, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-3xl md:max-w-5xl rounded-3xl border border-white/10 bg-[#141414] shadow-2xl overflow-hidden flex flex-col max-h-[min(92vh,900px)]"
      >
        <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-white/10 shrink-0">
          <div className="flex gap-1">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${i === slide ? "w-6 bg-[var(--color-brand)]" : "w-1.5 bg-white/20"}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="p-1.5 rounded-lg text-white/45 hover:text-white hover:bg-white/10"
            aria-label={t("onboard.close")}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 p-5 md:p-8 items-stretch">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col justify-center min-w-0 order-2 md:order-1"
              >
                {slide === 0 && (
                  <p className="text-xs font-medium text-[var(--color-brand)]/90 uppercase tracking-[0.15em] mb-2">
                    {t("onboard.welcomeKicker")}
                  </p>
                )}
                <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight leading-snug">
                  {titles[slide]}
                </h2>
                <p className="text-sm text-white/60 mt-3 whitespace-pre-line leading-relaxed">{bodies[slide]}</p>
                {slide === 0 && (
                  <p className="text-sm text-white/50 mt-4 leading-relaxed border-l-2 border-white/15 pl-3">
                    {t("onboard.welcomeLead")}
                  </p>
                )}
                {isLast && (
                  <p className="text-xs text-white/45 mt-4 leading-relaxed bg-white/[0.04] rounded-xl px-3 py-2.5 border border-white/8">
                    {t("onboard.permExplain")}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="order-1 md:order-2 shrink-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`vis-${slide}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <SlideVisual slideIndex={slide} Icon={Icon} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="px-5 md:px-8 pb-5 md:pb-6 pt-2 flex flex-wrap gap-2 justify-end shrink-0 border-t border-white/5 bg-[#121212]/80">
          {slide === 0 ? (
            <button type="button" onClick={next} className="btn-primary px-5 py-2 text-sm">
              {t("onboard.welcomeCta")}
            </button>
          ) : slide < total - 1 ? (
            <button type="button" onClick={next} className="btn-primary px-5 py-2 text-sm">
              {t("onboard.next")}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={pickFolder}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-white/15 bg-white/[0.06] text-white/90 hover:bg-white/10"
              >
                {t("onboard.permAllow")}
              </button>
              <button type="button" onClick={confirmStartFirstScan} className="btn-primary px-5 py-2 text-sm">
                {t("onboard.permDone")}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
