"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTerm } from "@/data/glossary";
import { useAppStore } from "@/store/app";

/* ================= Button ================= */

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantCls: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:brightness-110 shadow-sm",
  secondary:
    "bg-secondary/15 text-secondary border border-secondary/40 hover:bg-secondary/25",
  outline:
    "border border-border bg-surface text-foreground hover:bg-surface-hover",
  ghost: "text-muted hover:bg-surface-hover hover:text-foreground",
  danger: "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25",
};
const sizeCls: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
};

export function Button({
  children, variant = "primary", size = "md", className, href, onClick, disabled, ariaLabel, type,
}: {
  children: ReactNode; variant?: Variant; size?: Size; className?: string;
  href?: string; onClick?: () => void; disabled?: boolean; ariaLabel?: string;
  type?: "button" | "submit";
}) {
  const cls = cn(
    "inline-flex select-none items-center justify-center rounded-full font-semibold transition-all active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    variantCls[variant], sizeCls[size], className,
  );
  if (href && !disabled) {
    return <Link href={href} className={cls} aria-label={ariaLabel}>{children}</Link>;
  }
  return (
    <button type={type ?? "button"} onClick={onClick} disabled={disabled} className={cls} aria-label={ariaLabel}>
      {children}
    </button>
  );
}

/* ================= Badge ================= */

export function Badge({
  children, tone = "neutral", className,
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger" | "secondary";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-hover text-muted border-border",
    primary: "bg-primary/15 text-primary border-primary/40",
    secondary: "bg-secondary/15 text-secondary border-secondary/40",
    success: "bg-success/15 text-success border-success/40",
    warning: "bg-lonepair/15 text-lonepair border-lonepair/40",
    danger: "bg-danger/15 text-danger border-danger/40",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}

/* ================= Card ================= */

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface shadow-sm", className)}>
      {children}
    </div>
  );
}

/* ================= Modal ================= */

export function Modal({
  open, onClose, title, children, wide,
}: {
  open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center p-3 sm:items-center sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} aria-hidden />
          <motion.div
            role="dialog" aria-modal="true"
            className={cn(
              "relative max-h-[85vh] w-full overflow-y-auto rounded-3xl border border-border bg-surface p-5 shadow-2xl sm:p-6",
              wide ? "max-w-2xl" : "max-w-md",
            )}
            initial={{ y: 40, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 24, scale: 0.97, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <button
              onClick={onClose}
              aria-label="Tutup"
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-hover hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            {title && <div className="mb-3 pr-8">{title}</div>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================= Spinner & states ================= */

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-primary", className)} aria-label="Memuat" />;
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
      <BookOpen className="h-8 w-8 text-muted" />
      <p className="font-display font-semibold">{title}</p>
      {hint && <p className="text-sm text-muted">{hint}</p>}
      {action}
    </div>
  );
}

/* ================= Term (istilah glosarium, clickable) ================= */

export function Term({ id, children }: { id: string; children?: ReactNode }) {
  const langMode = useAppStore((s) => s.langMode);
  const term = getTerm(id);
  const label = children ?? term?.term ?? id;
  return (
    <button
      type="button"
      data-term={id}
      aria-label={`Penjelasan istilah: ${label}`}
      onClick={(e) => {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent("open-term", { detail: id }));
      }}
      className="inline cursor-help items-center rounded border-b border-dashed border-primary/60 px-0.5 font-semibold text-primary transition-colors hover:bg-primary/10"
      title={term ? (langMode === "simple" ? term.simple : term.technical) : id}
    >
      {label}
    </button>
  );
}

/** Host global untuk popup istilah — pasang sekali di AppShell. */
import { useState } from "react";

export function GlossaryPopupHost() {
  const [active, setActive] = useState<string | null>(null);
  const langMode = useAppStore((s) => s.langMode);
  useEffect(() => {
    const h = (e: Event) => setActive((e as CustomEvent<string>).detail);
    window.addEventListener("open-term", h);
    return () => window.removeEventListener("open-term", h);
  }, []);
  const term = active ? getTerm(active) : undefined;
  return (
    <Modal
      open={!!term}
      onClose={() => setActive(null)}
      title={
        term ? (
          <div>
            <p className="font-display text-lg font-bold">{term.term}</p>
            <Badge tone="primary" className="mt-1">Istilah Kunci</Badge>
          </div>
        ) : undefined
      }
    >
      {term && (
        <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
          <p>{langMode === "simple" ? term.simple : term.technical}</p>
          {langMode === "simple" && (
            <p className="rounded-xl bg-surface-hover p-3 text-xs text-muted">
              <span className="font-semibold text-foreground">Versi teknis: </span>
              {term.technical}
            </p>
          )}
          <Button href="/glossary" variant="outline" size="sm">Buka Kamus Istilah</Button>
        </div>
      )}
    </Modal>
  );
}
