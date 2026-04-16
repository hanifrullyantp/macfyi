import React, { useEffect, useMemo, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";

type Phase = "before" | "after";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, ms));
}

export function HeroStorageAnimation() {
  const usedControls = useAnimationControls();
  const freeControls = useAnimationControls();
  const markerControls = useAnimationControls();
  const pulseControls = useAnimationControls();

  const [phase, setPhase] = useState<Phase>("before");

  const colors = useMemo(
    () => ({
      danger: "#dc2626",
      safe: "#22c55e",
      bg: "rgba(255,255,255,0.10)",
    }),
    []
  );

  useEffect(() => {
    let cancelled = false;

    const setInstant = async (usedPct: number, freePct: number, usedColor: string) => {
      await Promise.all([
        usedControls.set({ width: `${usedPct}%`, backgroundColor: usedColor }),
        freeControls.set({ width: `${freePct}%` }),
        markerControls.set({ left: `${usedPct}%` }),
      ]);
    };

    const loop = async () => {
      while (!cancelled) {
        // --- BEFORE ---
        setPhase("before");
        await setInstant(98, 2, colors.danger);

        // Danger pulse at the boundary (2s hold)
        pulseControls.start({
          opacity: [0.35, 1, 0.35],
          boxShadow: [
            "0 0 0 rgba(220,38,38,0.00)",
            "0 0 22px rgba(220,38,38,0.65)",
            "0 0 0 rgba(220,38,38,0.00)",
          ],
          transition: { duration: 0.65, repeat: Infinity, ease: "easeInOut" },
        });
        await sleep(2000);

        // --- TRANSITION to AFTER ---
        pulseControls.stop();
        pulseControls.set({ opacity: 0, boxShadow: "0 0 0 rgba(0,0,0,0)" });

        await Promise.all([
          usedControls.start({
            width: "30%",
            backgroundColor: colors.safe,
            transition: { duration: 1.8, ease: "easeInOut" },
          }),
          freeControls.start({
            width: "70%",
            transition: { duration: 1.8, ease: "easeInOut" },
          }),
          markerControls.start({
            left: "30%",
            transition: { duration: 1.8, ease: "easeInOut" },
          }),
          pulseControls.start({
            opacity: [0.1, 0.55, 0.1],
            boxShadow: [
              "0 0 0 rgba(34,197,94,0.00)",
              "0 0 22px rgba(34,197,94,0.45)",
              "0 0 0 rgba(34,197,94,0.00)",
            ],
            transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" },
          }),
        ]);

        setPhase("after");
        await sleep(3000);

        // Reset quickly (avoid a jarring flash)
        pulseControls.stop();
        pulseControls.set({ opacity: 0, boxShadow: "0 0 0 rgba(0,0,0,0)" });
        await setInstant(98, 2, colors.danger);
        await sleep(120);
      }
    };

    void loop();
    return () => {
      cancelled = true;
      pulseControls.stop();
    };
  }, [colors.danger, colors.safe, freeControls, markerControls, pulseControls, usedControls]);

  return (
    <div className="max-w-xl mx-auto mb-12 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
      <div className="flex justify-between items-end mb-3">
        <div className="text-left">
          <div className="text-sm text-white/40 mb-1 font-medium">Macintosh HD</div>
          <div className="text-lg font-bold">Storage Status</div>
        </div>
        <div className="text-right">
          {phase === "after" ? (
            <div className="text-xs text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded">
              Optimized by Macfyi
            </div>
          ) : (
            <div className="text-xs text-red-300/90 font-bold bg-red-500/10 px-2 py-0.5 rounded">
              Before Macfyi
            </div>
          )}
        </div>
      </div>

      <div className="relative h-[18px] w-full bg-white/10 rounded-full overflow-hidden flex">
        <motion.div
          initial={{ width: "98%", backgroundColor: colors.danger }}
          animate={usedControls}
          className="h-full"
        />
        <motion.div initial={{ width: "2%" }} animate={freeControls} className="h-full bg-white/10" />

        {/* Boundary marker + pulse/glow */}
        <motion.div
          initial={{ left: "98%" }}
          animate={markerControls}
          className="absolute top-0 bottom-0 w-[2px]"
          style={{ transform: "translateX(-1px)", backgroundColor: "rgba(255,255,255,0.18)" }}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={pulseControls}
          className="absolute top-[-10px] bottom-[-10px] w-[14px] rounded-full"
          style={{ left: "98%", transform: "translateX(-50%)" }}
        />
      </div>

      <div className="flex justify-between mt-3 text-[10px] font-bold tracking-wider uppercase text-white/40">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: phase === "after" ? colors.safe : colors.danger }}
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

