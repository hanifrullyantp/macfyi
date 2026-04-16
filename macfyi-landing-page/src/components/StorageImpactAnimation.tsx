import React, { useEffect, useMemo, useState } from "react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";

type Phase = "before" | "after";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, ms));
}

export type StorageImpactAnimationProps = {
  /** Default 98 */
  beforePercent?: number;
  /** Default 30 */
  afterPercent?: number;
  /** Default 2000 */
  beforeHoldMs?: number;
  /** Default 3000 */
  afterHoldMs?: number;
  /** Default 1400 */
  transitionMs?: number;
  /** Default 150 */
  loopDelayMs?: number;
  /** Default true */
  showDangerIcon?: boolean;
};

/**
 * StorageImpactAnimation
 *
 * Usage:
 * `<StorageImpactAnimation />`
 */
export function StorageImpactAnimation({
  beforePercent = 98,
  afterPercent = 30,
  beforeHoldMs = 2000,
  afterHoldMs = 3000,
  transitionMs = 1400,
  loopDelayMs = 150,
  showDangerIcon = true,
}: StorageImpactAnimationProps) {
  const reduceMotion = useReducedMotion();

  const fillControls = useAnimationControls();
  const glowControls = useAnimationControls();
  const labelControls = useAnimationControls();
  const subControls = useAnimationControls();
  const dangerIconControls = useAnimationControls();

  const [phase, setPhase] = useState<Phase>("before");

  const colors = useMemo(
    () => ({
      red: "#EF4444",
      green: "#22C55E",
      beforeGlow: "rgba(239, 68, 68, 0.55)",
      afterGlow: "rgba(34, 197, 94, 0.45)",
    }),
    []
  );

  const beforeP = Math.max(0, Math.min(100, Math.round(beforePercent)));
  const afterP = Math.max(0, Math.min(100, Math.round(afterPercent)));

  useEffect(() => {
    if (!reduceMotion) return;
    // Reduced motion: show AFTER state only.
    setPhase("after");
    fillControls.set({ scaleX: afterP / 100, backgroundColor: colors.green });
    glowControls.set({
      opacity: 0.55,
      boxShadow: `0 0 22px ${colors.afterGlow}`,
    });
    labelControls.set({ opacity: 1 });
    subControls.set({ opacity: 1 });
    dangerIconControls.set({ opacity: 0, scale: 1 });
  }, [
    afterP,
    colors.afterGlow,
    colors.green,
    dangerIconControls,
    fillControls,
    glowControls,
    labelControls,
    reduceMotion,
    subControls,
  ]);

  useEffect(() => {
    if (reduceMotion) return;
    let cancelled = false;

    const setInstant = (pct: number, color: string) => {
      fillControls.set({ scaleX: pct / 100, backgroundColor: color });
    };

    const setLabel = async (next: Phase) => {
      // fade out 150ms → swap → fade in 250ms
      await Promise.all([
        labelControls.start({ opacity: 0, transition: { duration: 0.15 } }),
        subControls.start({ opacity: 0, transition: { duration: 0.15 } }),
      ]);
      if (cancelled) return;
      setPhase(next);
      await Promise.all([
        labelControls.start({ opacity: 1, transition: { duration: 0.25 } }),
        subControls.start({ opacity: 1, transition: { duration: 0.25 } }),
      ]);
    };

    const loop = async () => {
      while (!cancelled) {
        // BEFORE
        setPhase("before");
        labelControls.set({ opacity: 1 });
        subControls.set({ opacity: 1 });
        setInstant(beforeP, colors.red);

        // Danger glow pulse for the filled area.
        glowControls.start({
          opacity: [0.25, 1, 0.25],
          boxShadow: [
            `0 0 0 rgba(239, 68, 68, 0.00)`,
            `0 0 26px ${colors.beforeGlow}`,
            `0 0 0 rgba(239, 68, 68, 0.00)`,
          ],
          transition: { duration: 0.75, repeat: Infinity, ease: "easeInOut" },
        });

        if (showDangerIcon) {
          dangerIconControls.start({
            opacity: [0.35, 1, 0.35],
            scale: [1, 1.04, 1],
            transition: { duration: 0.75, repeat: Infinity, ease: "easeInOut" },
          });
        } else {
          dangerIconControls.set({ opacity: 0, scale: 1 });
        }

        await sleep(beforeHoldMs);
        if (cancelled) return;

        // TRANSITION (BEFORE → AFTER)
        await setLabel("after");
        if (cancelled) return;

        await Promise.all([
          fillControls.start({
            scaleX: afterP / 100,
            backgroundColor: colors.green,
            transition: { duration: transitionMs / 1000, ease: "easeInOut" },
          }),
          glowControls.start({
            opacity: [0.18, 0.55, 0.18],
            boxShadow: [
              `0 0 0 rgba(34, 197, 94, 0.00)`,
              `0 0 22px ${colors.afterGlow}`,
              `0 0 0 rgba(34, 197, 94, 0.00)`,
            ],
            transition: { duration: 0.95, repeat: Infinity, ease: "easeInOut" },
          }),
          dangerIconControls.start({ opacity: 0, scale: 1, transition: { duration: 0.2 } }),
        ]);

        // AFTER hold
        await sleep(afterHoldMs);
        if (cancelled) return;

        // RESET fast (250ms) + small delay
        glowControls.stop();
        await glowControls.start({ opacity: 0, transition: { duration: 0.12 } });
        await Promise.all([
          fillControls.start({
            scaleX: beforeP / 100,
            backgroundColor: colors.red,
            transition: { duration: 0.25, ease: "easeOut" },
          }),
          setLabel("before"),
        ]);

        if (loopDelayMs > 0) await sleep(loopDelayMs);
      }
    };

    void loop();
    return () => {
      cancelled = true;
      glowControls.stop();
      dangerIconControls.stop();
    };
  }, [
    afterHoldMs,
    afterP,
    beforeHoldMs,
    beforeP,
    colors.afterGlow,
    colors.beforeGlow,
    colors.green,
    colors.red,
    dangerIconControls,
    fillControls,
    glowControls,
    labelControls,
    loopDelayMs,
    reduceMotion,
    showDangerIcon,
    subControls,
    transitionMs,
  ]);

  const labelText = phase === "after" ? "Optimized by Macfyi" : "Sebelum pakai Macfyi";
  const subText = phase === "after" ? "Ruang kembali lega" : "Storage hampir penuh";

  return (
    <div className="max-w-xl mx-auto mb-12 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
      <div className="flex justify-between items-end mb-3 gap-4">
        <div className="text-left">
          <div className="text-sm text-white/40 mb-1 font-medium">Macintosh HD</div>
          <div className="text-lg font-bold">Storage Status</div>
        </div>
        <div className="text-right flex items-center gap-2">
          <motion.div
            initial={{ opacity: 1 }}
            animate={labelControls}
            className={`text-xs font-bold px-2 py-0.5 rounded ${
              phase === "after" ? "text-green-500 bg-green-500/10" : "text-red-300/90 bg-red-500/10"
            }`}
          >
            {labelText}
          </motion.div>
          {showDangerIcon ? (
            <motion.div
              initial={{ opacity: 0, scale: 1 }}
              animate={dangerIconControls}
              className="w-5 h-5 rounded-full bg-red-500/15 border border-red-500/30 text-red-200 text-[11px] font-black flex items-center justify-center"
              aria-hidden
            >
              !
            </motion.div>
          ) : null}
        </div>
      </div>

      <motion.div initial={{ opacity: 1 }} animate={subControls} className="text-left text-xs text-white/45 mb-3">
        {subText}
      </motion.div>

      <div className="relative h-[18px] w-full bg-white/10 rounded-full overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            initial={{ scaleX: beforeP / 100, backgroundColor: colors.red }}
            animate={fillControls}
            className="h-full w-full"
            style={{ transformOrigin: "0% 50%" }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={glowControls}
              className="absolute inset-y-0 left-0 right-0"
              style={{
                transformOrigin: "0% 50%",
              }}
            />
          </motion.div>
        </div>
      </div>

      <div className="flex justify-between mt-3 text-[10px] font-bold tracking-wider uppercase text-white/40">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: phase === "after" ? colors.green : colors.red }}
          />
          <span>Used Space</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white/20" />
          <span>Free Space</span>
        </div>
      </div>
    </div>
  );
}

