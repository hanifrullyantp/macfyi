"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useAppStore } from "@/store/app";
import { cn } from "@/lib/utils";

/** true setelah komponen ter-mount di client (hindari hydration mismatch
 *  untuk UI yang bergantung pada state zustand-persist). */
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

/** Menerapkan class .dark pada <html> sesuai store. */
export function ThemeApplier() {
  const theme = useAppStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return null;
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const hydrated = useHydrated();
  if (!hydrated) {
    return <span className={cn("inline-flex h-9 w-9 rounded-full border border-border", className)} aria-hidden />;
  }
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      title={theme === "dark" ? "Mode terang" : "Mode gelap"}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted transition-colors hover:bg-surface-hover hover:text-foreground",
        className,
      )}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
