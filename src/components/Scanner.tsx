import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, HardDrive, XCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { ScanResult, ScanProgress } from "../types";
import { deepScan, cancelScan, onScanProgress } from "../lib/backend";
import { useI18n } from "../i18n/context";
import { getDashboardScanPhase } from "../lib/scanPhaseCopy";

export const Scanner = ({
  onFinish,
  onCancel,
  onProgress,
  dashboardPhaseCopy = false,
}: {
  onFinish: (results: ScanResult[]) => void;
  onCancel: () => void;
  onProgress?: (pct: number) => void;
  /** Use Indonesian phase text + progress buckets (Smart Care redesign). */
  dashboardPhaseCopy?: boolean;
}) => {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Preparing scan...");
  const [phase, setPhase] = useState<string | undefined>(undefined);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [filesFound, setFilesFound] = useState(0);
  const [itemsFlagged, setItemsFlagged] = useState(0);
  const doneRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    doneRef.current = false;
    mountedRef.current = true;
    let unlisten: (() => void) | null = null;

    const setup = async () => {
      unlisten = await onScanProgress((p: ScanProgress) => {
        if (doneRef.current) return;
        setProgress(p.pct);
        onProgress?.(p.pct);
        setStage(p.stage);
        setPhase(p.phase);
        setCurrentPath(p.currentPath ?? null);
        setFilesFound(p.filesFound);
        setItemsFlagged(p.itemsFlagged);
      });

      try {
        const results = await deepScan();
        if (doneRef.current) return;
        doneRef.current = true;
        if (mountedRef.current) {
          setProgress(100);
          onProgress?.(100);
          setStage("Done");
        }
        setTimeout(() => onFinish(results), 400);
      } catch (e) {
        if (doneRef.current) return;
        doneRef.current = true;
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("cancelled")) {
          onCancel();
        } else {
          if (mountedRef.current) {
            setStage(`Scan failed: ${msg}`);
            setProgress(0);
          }
        }
      }
    };

    setup();

    return () => {
      mountedRef.current = false;
      if (unlisten) unlisten();
    };
  }, [onFinish, onCancel, onProgress]);

  const handleCancel = () => {
    if (!window.confirm(t("scanner.cancelScanConfirm"))) return;
    doneRef.current = true;
    cancelScan();
    onCancel();
  };

  const phaseLabel =
    phase === "walk"
      ? t("scanner.phaseWalk")
      : phase === "analyze"
        ? t("scanner.phaseAnalyze")
        : phase === "finalize"
          ? t("scanner.phaseFinalize")
          : phase;

  const friendly = dashboardPhaseCopy ? getDashboardScanPhase(progress) : null;

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-0 text-center bg-[#0a0b0f]">
      <motion.div
        className="relative w-72 h-72 flex items-center justify-center"
        initial={reduceMotion ? false : { scale: 0.9, opacity: 0 }}
        animate={reduceMotion ? false : { scale: 1, opacity: 1 }}
      >
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="144" cy="144" r="120" stroke="rgba(255,255,255,0.05)" strokeWidth="20" fill="transparent" />
          <motion.circle
            cx="144" cy="144" r="120"
            stroke="url(#scanGradient)"
            strokeWidth="20"
            strokeDasharray={754}
            strokeDashoffset={754 - (754 * progress) / 100}
            strokeLinecap="round"
            fill="transparent"
            style={{ transition: "stroke-dashoffset 0.12s linear" }}
          />
          <defs>
            <linearGradient id="scanGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#007AFF" />
              <stop offset="50%" stopColor="#34C759" />
              <stop offset="100%" stopColor="#007AFF" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-black text-white tracking-tighter tabular-nums">
            {Math.round(progress)}%
          </span>
          <span className="text-xs text-white/40 mt-1 uppercase font-bold tracking-[0.2em]">
            {t("scanner.scanning")}
          </span>
        </div>
      </motion.div>

      <div className="mt-12 space-y-3 px-12 max-w-md">
        {friendly ? (
          <>
            <p className="text-white font-semibold min-h-[1.5rem] text-base leading-snug">{friendly.label}</p>
            <p className="text-xs text-white/45">{friendly.detail}</p>
            <p className="text-[10px] text-white/25 font-mono truncate" title={stage}>
              {stage}
            </p>
          </>
        ) : (
          <>
            {phase && (
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]/90">
                {phaseLabel}
              </p>
            )}
            <motion.p
              key={stage}
              initial={reduceMotion ? false : { y: 5, opacity: 0 }}
              animate={reduceMotion ? false : { y: 0, opacity: 1 }}
              className="text-white/80 font-medium min-h-[1.5rem] text-sm"
            >
              {stage}
            </motion.p>
          </>
        )}
        {currentPath && (
          <p className="text-[11px] text-white/35 font-mono truncate max-w-full" title={currentPath}>
            {currentPath}
          </p>
        )}

        <div className="flex gap-6 justify-center text-[10px] font-bold text-white/30 uppercase tracking-widest">
          <span>{t("scanner.filesScanned", { n: filesFound.toLocaleString() })}</span>
          {itemsFlagged > 0 && <span>{t("scanner.itemsFlagged", { n: itemsFlagged })}</span>}
        </div>

        <div className="flex gap-6 justify-center mt-4 flex-wrap">
          <div className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
            <ShieldCheck size={14} className="text-[#34C759]" /> {t("scanner.badgeSecure")}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
            <HardDrive size={14} className="text-[#007AFF]" /> {t("scanner.badgeDeep")}
          </div>
        </div>

        <button
          type="button"
          onClick={handleCancel}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/90 text-xs font-medium transition-all"
        >
          <XCircle size={14} /> {t("scanner.cancelScan")}
        </button>
      </div>
    </div>
  );
};
