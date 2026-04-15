import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, X } from "lucide-react";
import { playNotificationChime } from "../lib/playChime";
import { buildSocialProofLine, randomIntervalMs } from "../lib/socialProofMessages";

const MUTE_KEY = "macfyi_social_proof_muted";
const UNLOCK_KEY = "macfyi_audio_unlocked";

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMuted(m: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {
    /* ignore */
  }
}

const MUTE_EVENT = "macfyi-social-proof-mute";

/** Untuk footer / tombol lain — sinkron dengan toast */
export function toggleSocialProofMuteFromOutside(): boolean {
  const next = !readMuted();
  writeMuted(next);
  window.dispatchEvent(new CustomEvent(MUTE_EVENT));
  return next;
}

export function getSocialProofMuted(): boolean {
  return readMuted();
}

export function SocialProofToast({
  enabled,
  soundEnabled,
  accentColor,
  names,
  actions,
  products,
  times,
  muteLabel = "MUTE",
  unmuteLabel = "UNMUTE",
}: {
  enabled: boolean;
  soundEnabled: boolean;
  accentColor?: string;
  names?: string;
  actions?: string;
  products?: string;
  times?: string;
  muteLabel?: string;
  unmuteLabel?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [line, setLine] = useState("");
  const [timeLabel, setTimeLabel] = useState("");
  const [muted, setMuted] = useState(readMuted);
  const audioOkInit = (() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(UNLOCK_KEY) === "1";
    } catch {
      return false;
    }
  })();
  const audioOkRef = useRef(audioOkInit);
  const mainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unlockAudio = useCallback(() => {
    if (audioOkRef.current) return;
    audioOkRef.current = true;
    try {
      localStorage.setItem(UNLOCK_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onMuteSync = () => setMuted(readMuted());
    window.addEventListener(MUTE_EVENT, onMuteSync);
    return () => window.removeEventListener(MUTE_EVENT, onMuteSync);
  }, []);

  useEffect(() => {
    const onInteract = () => unlockAudio();
    window.addEventListener("pointerdown", onInteract, { passive: true });
    window.addEventListener("keydown", onInteract);
    window.addEventListener("scroll", onInteract, { passive: true });
    window.addEventListener("wheel", onInteract, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
      window.removeEventListener("scroll", onInteract);
      window.removeEventListener("wheel", onInteract);
    };
  }, [unlockAudio]);

  useEffect(() => {
    const clearTimers = () => {
      if (mainTimerRef.current) clearTimeout(mainTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      mainTimerRef.current = null;
      hideTimerRef.current = null;
    };

    if (!enabled) {
      clearTimers();
      setVisible(false);
      return;
    }

    let cancelled = false;

    const scheduleShow = () => {
      if (cancelled) return;
      if (mainTimerRef.current) clearTimeout(mainTimerRef.current);
      mainTimerRef.current = window.setTimeout(() => {
        if (cancelled) return;
        const msg = buildSocialProofLine({ names, actions, products, times });
        setLine(msg.line);
        setTimeLabel(msg.timeLabel);
        setVisible(true);
        if (soundEnabled && !muted && audioOkRef.current) {
          playNotificationChime();
        }
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = window.setTimeout(() => {
          if (!cancelled) setVisible(false);
          scheduleShow();
        }, 6800);
      }, randomIntervalMs(25, 45));
    };

    scheduleShow();

    return () => {
      cancelled = true;
      clearTimers();
    };
  }, [enabled, muted, soundEnabled, names, actions, products, times]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    writeMuted(next);
    window.dispatchEvent(new CustomEvent(MUTE_EVENT));
    unlockAudio();
  };

  const dismiss = () => setVisible(false);

  return (
    <div className="fixed bottom-4 right-4 z-[85] flex flex-col items-end gap-2 pointer-events-none max-w-[min(100vw-2rem,22rem)]">
      <AnimatePresence>
        {visible && enabled && (
          <motion.div
            role="status"
            initial={{ x: 140, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="pointer-events-auto rounded-xl border border-white/15 bg-[#0B1220]/96 backdrop-blur-md shadow-2xl shadow-black/40 p-3.5 pl-4 pr-10 relative"
            style={{
              borderColor: accentColor ? `${accentColor}44` : undefined,
              boxShadow: accentColor ? `0 12px 40px ${accentColor}18` : undefined,
            }}
          >
            <button
              type="button"
              onClick={dismiss}
              className="absolute top-2 right-2 p-1 rounded-lg text-white/35 hover:text-white hover:bg-white/10"
              aria-label="Tutup"
            >
              <X size={14} />
            </button>
            <div className="flex items-start gap-2">
              <div
                className="mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: accentColor ? `${accentColor}28` : "rgba(239,68,68,0.2)" }}
              >
                <Bell size={16} className="text-white/90" />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-[13px] leading-snug text-white/92 font-medium">{line}</p>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-white/40">{timeLabel}</p>
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-white/45 hover:text-white/80 px-2 py-1 rounded-md hover:bg-white/5"
                    aria-label={muted ? unmuteLabel : muteLabel}
                  >
                    {muted ? <BellOff size={12} /> : <Bell size={12} />}
                    {muted ? unmuteLabel : muteLabel}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
