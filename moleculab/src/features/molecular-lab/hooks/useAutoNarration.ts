"use client";

import { useState, useCallback, useRef } from "react";
import { useAppStore } from "@/store/app";

/**
 * useAutoNarration Hook
 * Logic terpusat untuk pause-speak-resume narasi.
 * Berguna untuk popup interaktif di dalam simulasi.
 */
export function useAutoNarration() {
  const { rate, muted } = useAppStore();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [resumeQueue, setResumeQueue] = useState<string | null>(null);

  const speak = useCallback((text: string, onComplete?: () => void) => {
    if (muted || typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;
    
    // Pause main narration if any
    synth.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = "id-ID";
    u.rate = rate;

    u.onstart = () => setIsSpeaking(true);
    u.onend = () => {
      setIsSpeaking(false);
      onComplete?.();
    };
    u.onerror = () => setIsSpeaking(false);

    synth.speak(u);
  }, [muted, rate]);

  const pause = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return { speak, pause, isSpeaking };
}
