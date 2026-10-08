"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, FlaskRound, Grid3X3, Scale, Compass, Target, BookOpen, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle, useHydrated } from "./theme";
import { GlossaryPopupHost } from "./ui";
import { useAppStore } from "@/store/app";
import { FEATURES } from "@/config/features";
import { LogoFull } from "./ui/LogoFull";
import { BRAND } from "@/config/brand";

const NAV = [
  { href: "/lab", label: "Lab Molekul", icon: FlaskRound },
  { href: "/periodic-table", label: "Tabel Periodik", icon: Grid3X3 },
  { href: "/explorer", label: "Eksplorasi", icon: Compass },
  { href: "/compare", label: "Bandingkan", icon: Scale },
  { href: "/predict", label: "Uji Pemahaman", icon: Target },
  { href: "/glossary", label: "Glosarium", icon: BookOpen },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const demoDismissed = useAppStore((s) => s.demoDismissed);
  const dismissDemo = useAppStore((s) => s.dismissDemo);
  const isLanding = pathname === "/";
  const hydrated = useHydrated();

  return (
    <div className="flex min-h-screen flex-col">
      <GlossaryPopupHost />
      {hydrated && !demoDismissed && !FEATURES.AUTH_ENABLED && (
        <div className="relative z-[60] flex items-center justify-center gap-3 bg-secondary/10 px-4 py-2 text-xs text-secondary">
          <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <p className="text-center">
            <span className="font-bold">Mode Demo</span> — kamu menjelajah sebagai tamu; progres tersimpan lokal di perangkat ini.
          </p>
          <button onClick={dismissDemo} aria-label="Tutup banner" className="rounded-full p-1 hover:bg-secondary/15">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <header className={cn("sticky top-0 z-[70] border-b border-border/70", isLanding ? "glass" : "bg-surface/90 backdrop-blur")}>
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" aria-label={`Beranda ${BRAND.appName}`}>
            <LogoFull withSubtitle />
          </Link>

          <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label="Navigasi utama">
            {NAV.map((n) => {
              const active = pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors",
                    active ? "bg-primary/12 text-primary" : "text-muted hover:bg-surface-hover hover:text-foreground",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2 lg:ml-2">
            <ThemeToggle />
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted hover:bg-surface-hover lg:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "Tutup menu" : "Buka menu"}
              aria-expanded={open}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="border-t border-border bg-surface px-4 py-3 lg:hidden" aria-label="Navigasi seluler">
            <div className="grid gap-1">
              {NAV.map((n) => {
                const active = pathname.startsWith(n.href);
                const Icon = n.icon;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold",
                      active ? "bg-primary/12 text-primary" : "text-muted hover:bg-surface-hover",
                    )}
                  >
                    <Icon className="h-4 w-4" /> {n.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border py-8 text-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="font-display text-sm font-bold tracking-tight">
            © {new Date().getFullYear()} {BRAND.appName}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            Laboratorium molekul virtual interaktif · Struktur Lewis dulu, VSEPR kemudian.
          </p>
          <div className="mt-4 flex items-center justify-center gap-1.5 opacity-50 transition-opacity hover:opacity-100">
            <span 
              className="cursor-help text-[9px] font-medium tracking-[0.2em] uppercase text-muted"
              title={BRAND.platformCreditTooltip}
            >
              {BRAND.platformCredit}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
