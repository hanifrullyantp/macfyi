"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/store/app";
import { toSpeechFriendly } from "@/lib/chemNotationToSpeech";

/**
 * useAutoNarration Hook
 * Logic terpusat untuk pause-speak-resume narasi.
 * Berguna untuk popup interaktif di dalam simulasi.
 */
export function useAutoNarration() {
  const { rate, muted } = useAppStore();
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback((text: string, onComplete?: () => void) => {
    if (muted || typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    // Proses teks menjadi ramah audio (kimia aware)
    const speechFriendlyText = toSpeechFriendly(text);

    const u = new SpeechSynthesisUtterance(speechFriendlyText);
    u.lang = "id-ID";
    u.rate = rate;

    const voices = synth.getVoices();
    const idVoice = voices.find((v) => v.lang?.toLowerCase().startsWith("id") && v.name.toLowerCase().includes("google"))
      ?? voices.find((v) => v.lang?.toLowerCase().startsWith("id"));
    if (idVoice) u.voice = idVoice;

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
