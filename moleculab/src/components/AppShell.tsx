"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, FlaskRound, Grid3X3, Scale, Compass, Target, BookOpen, FlaskConical, Settings2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle, useHydrated } from "./theme";
import { GlossaryPopupHost } from "./ui";
import { useAppStore } from "@/store/app";
import { useAuth } from "@/features/auth/useAuth";
import { FEATURES } from "@/config/features";
import { LogoFull } from "./ui/LogoFull";
import { LogoMark } from "./ui/LogoMark";
import { BRAND } from "@/config/brand";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

const NAV = [
  { href: "/periodic-table", label: "Tabel", icon: Grid3X3 },
  { href: "/explorer", label: "Eksplorasi", icon: Compass },
  { href: "/lab", label: "Lab", icon: FlaskRound, central: true },
  { href: "/compare", label: "Bandingkan", icon: Scale },
  { href: "/predict", label: "Ujian", icon: Target },
];

function DesktopSidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="fixed left-0 top-0 hidden h-full w-[var(--sidebar-collapsed-width)] flex-col border-r border-border bg-surface py-4 transition-all hover:w-[var(--sidebar-width)] lg:flex z-[80] group shadow-xl">
      <div className="px-4 mb-8 overflow-hidden">
        <Link href="/" className="flex items-center gap-3">
          <LogoMark size="sm" />
          <span className="font-display text-lg font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Molecu<span className="text-primary">lab</span></span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((n) => {
          const active = pathname.startsWith(n.href);
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-4 rounded-2xl p-3.5 text-sm font-bold transition-all whitespace-nowrap",
                active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted hover:bg-surface-hover hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">{n.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 mt-auto pt-4 border-t border-border">
        <AuthStatus vertical />
        <div className="flex items-center gap-3 p-3 text-muted">
           <ThemeToggle className="h-8 w-8" />
           <span className="text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Tampilan</span>
        </div>
      </div>
    </aside>
  );
}

function MobileBottomNav({ pathname }: { pathname: string }) {
  const isLabView = pathname.startsWith("/lab/") && pathname.split("/").length > 2;

  if (isLabView) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-around border-t border-border bg-surface/80 pb-safe pt-2 backdrop-blur-xl lg:hidden px-2 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
      {NAV.map((n) => {
        const active = pathname.startsWith(n.href);
        const Icon = n.icon;
        
        if (n.central) {
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "relative -mt-10 flex h-16 w-16 items-center justify-center rounded-full bg-surface border-4 border-background shadow-2xl transition-all active:scale-90",
                active ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
              )}
            >
              <div className={cn(
                "flex h-full w-full items-center justify-center rounded-full transition-colors",
                active ? "bg-primary text-white" : "bg-primary/10 text-primary"
              )}>
                <LogoMark size="md" animate={active} className={active ? "text-white" : "text-primary"} />
              </div>
            </Link>
          );
        }

        return (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              "flex flex-col items-center gap-1 px-1 py-2 transition-all min-w-[64px]",
              active ? "text-primary scale-110" : "text-muted hover:text-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-tight">{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function GuestBanner() {
  const { data: user } = useAuth();
  const { demoDismissed, dismissDemo } = useAppStore();
  
  if (user || demoDismissed) return null;

  return (
    <div className="relative z-[60] flex items-center justify-center gap-3 bg-secondary/10 px-4 py-2.5 text-xs text-secondary border-b border-secondary/20 lg:ml-[var(--sidebar-collapsed-width)]">
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary/20 font-bold">!</div>
      <p className="text-center font-medium">
        🔓 Mode Tamu aktif. <Link href="/login" className="ml-1 underline font-bold hover:text-secondary/80">Masuk</Link> untuk simpan progres.
      </p>
      <button onClick={dismissDemo} aria-label="Tutup" className="rounded-full p-1 hover:bg-secondary/15 ml-2">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AuthStatus({ vertical }: { vertical?: boolean }) {
  const { data: user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  if (!user) {
    return (
      <Link href="/login" className={cn("text-[10px] font-bold uppercase tracking-widest text-muted hover:text-primary transition-colors flex items-center gap-3 p-3", vertical && "px-4")}>
        <User className="h-5 w-5 shrink-0" />
        <span className={cn(vertical && "opacity-0 group-hover:opacity-100 transition-opacity")}>Masuk</span>
      </Link>
    );
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    queryClient.setQueryData(["auth-user"], null);
    router.push("/");
  };

  return (
    <div className={cn("flex items-center gap-3", vertical ? "flex-col group-hover:items-start p-3" : "flex-row")}>
      <div className="flex items-center gap-3 px-1">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
          {user.full_name?.[0] || 'U'}
        </div>
        {vertical && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity overflow-hidden">
            <p className="text-xs font-bold truncate w-32">{user.full_name}</p>
            <p className="text-[9px] text-muted uppercase">{user.role}</p>
          </div>
        )}
      </div>
      <button onClick={handleLogout} className="p-2 text-muted hover:text-danger transition-colors shrink-0" title="Keluar">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const demoDismissed = useAppStore((s) => s.demoDismissed);
  const hydrated = useHydrated();
  
  const isLabView = pathname.startsWith("/lab/") && pathname.split("/").length > 2;

  return (
    <div className="flex min-h-screen bg-background">
      <GlossaryPopupHost />
      
      {/* Desktop Navigation */}
      {!isLabView && <DesktopSidebar pathname={pathname} />}

      <div className={cn(
        "flex flex-1 flex-col transition-all",
        !isLabView && "lg:pl-[var(--sidebar-collapsed-width)] group-hover:lg:pl-[var(--sidebar-width)]"
      )}>
        {hydrated && !demoDismissed && (
          <GuestBanner />
        )}
        
        {/* Mobile Header (Hanya Logo) - Hidden in Lab View */}
        {!isLabView && (
          <header className="flex h-14 shrink-0 items-center px-4 border-b border-border bg-surface/50 backdrop-blur lg:hidden z-[70]">
             <Link href="/" className="flex items-center gap-2">
                <LogoMark size="sm" />
                <span className="font-display font-bold">Moleculab</span>
             </Link>
          </header>
        )}

        <main className={cn("flex-1", !isLabView && "pb-20 lg:pb-0")}>{children}</main>

        <footer className="hidden border-t border-border py-12 text-center lg:block bg-surface-hover/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <p className="font-display text-sm font-bold tracking-tight">© {new Date().getFullYear()} {BRAND.appName}</p>
            <p className="mt-1 text-[11px] text-muted">Laboratorium virtual Geometri Molekul interaktif.</p>
            <div className="mt-4 flex items-center justify-center gap-1.5 opacity-40">
              <span className="text-[9px] font-medium tracking-[0.2em] uppercase">{BRAND.platformCredit}</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Navigation */}
      <MobileBottomNav pathname={pathname} />
    </div>
  );
}
