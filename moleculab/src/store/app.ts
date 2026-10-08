"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FEATURES } from "@/config/features";
import type { LangMode } from "@/engine/narration";

export type ThemeMode = "light" | "dark";

interface AppState {
  theme: ThemeMode;
  muted: boolean;
  rate: number;
  langMode: LangMode;
  demoDismissed: boolean;
  /** progres tamu (localStorage) */
  visited: Record<string, boolean>;
  quizScores: Record<string, number>;

  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  toggleMuted: () => void;
  cycleRate: () => void;
  setLangMode: (m: LangMode) => void;
  dismissDemo: () => void;
  markVisited: (formula: string) => void;
  setQuizScore: (formula: string, score: number) => void;
}

export const RATES = [0.9, 1.05, 1.25, 1.5];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      muted: !FEATURES.NARRATION_ENABLED_BY_DEFAULT,
      rate: 1.05,
      langMode: FEATURES.SIMPLE_LANGUAGE_MODE_DEFAULT ? "simple" : "technical",
      demoDismissed: false,
      visited: {},
      quizScores: {},

      setTheme: (t) => set({ theme: t }),
      toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
      toggleMuted: () => set({ muted: !get().muted }),
      cycleRate: () => {
        const i = RATES.indexOf(get().rate);
        set({ rate: RATES[(i + 1) % RATES.length] });
      },
      setLangMode: (m) => set({ langMode: m }),
      dismissDemo: () => set({ demoDismissed: true }),
      markVisited: (formula) =>
        set((s) => ({ visited: { ...s.visited, [formula]: true } })),
      setQuizScore: (formula, score) =>
        set((s) => ({ quizScores: { ...s.quizScores, [formula]: score } })),
    }),
    { name: "vsepr-app-v1" },
  ),
);
