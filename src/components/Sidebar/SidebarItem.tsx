import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../utils/cn";
import { AI_SIDEBAR_ID } from "../../lib/featureId";
import type { SidebarMenuEntry, SidebarNavEntry, SidebarAccent } from "./sidebarConfig";

const ACCENT_ACTIVE: Record<SidebarAccent, string> = {
  purple: "shadow-[inset_3px_0_0_0_rgba(168,85,247,0.75)]",
  green: "shadow-[inset_3px_0_0_0_rgba(34,197,94,0.7)]",
  blue: "shadow-[inset_3px_0_0_0_rgba(59,130,246,0.7)]",
  orange: "shadow-[inset_3px_0_0_0_rgba(249,115,22,0.7)]",
  indigo: "shadow-[inset_3px_0_0_0_rgba(99,102,241,0.7)]",
  yellow: "shadow-[inset_3px_0_0_0_rgba(234,179,8,0.65)]",
  pink: "shadow-[inset_3px_0_0_0_rgba(236,72,153,0.7)]",
  slate: "shadow-[inset_3px_0_0_0_rgba(148,163,184,0.5)]",
};

function isFeatureEntry(e: SidebarNavEntry): e is SidebarMenuEntry {
  return e.id !== AI_SIDEBAR_ID;
}

export function SidebarItem({
  entry,
  isActive,
  collapsed,
  badgeText,
  countFallback,
  onSelect,
}: {
  entry: SidebarNavEntry;
  isActive: boolean;
  collapsed: boolean;
  /** e.g. "1.2 GB" from last scan */
  badgeText?: string | null;
  /** Shown when no byte badge and `useCountFallback` on entry */
  countFallback?: number;
  onSelect: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const Icon = entry.icon;
  const accent = entry.accent;
  const activeAccent = ACCENT_ACTIVE[accent] ?? ACCENT_ACTIVE.slate;
  const useCount = isFeatureEntry(entry) && entry.useCountFallback;
  const showBadge =
    Boolean(badgeText) || (useCount && countFallback != null && countFallback > 0);
  const badgeContent =
    badgeText ??
    (useCount && countFallback != null && countFallback > 0
      ? countFallback > 99
        ? "99+"
        : String(countFallback)
      : null);

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={reduceMotion ? undefined : { x: 3 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      title={collapsed ? `${entry.label} — ${entry.sublabel}` : undefined}
      className={cn(
        "group relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors duration-200",
        collapsed ? "justify-center" : "",
        isActive
          ? cn("bg-[var(--color-sidebar-active-bg)] text-white", activeAccent)
          : "text-white/50 hover:bg-white/[0.06] hover:text-white/88 border border-transparent"
      )}
    >
      <span
        className={cn(
          "w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0",
          isActive
            ? "bg-white/12 border-white/20 text-white"
            : "bg-white/[0.04] border-white/10 text-white/70",
          collapsed && "w-8 h-8"
        )}
        aria-hidden
      >
        <Icon size={collapsed ? 16 : 15} />
      </span>
      {!collapsed && (
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-semibold text-white/95 leading-tight">{entry.label}</p>
          <p className="text-[10px] text-white/40 truncate mt-0.5">{entry.sublabel}</p>
        </div>
      )}
      {collapsed ? (
        <span className="sr-only">
          {entry.label} — {entry.sublabel}
        </span>
      ) : null}
      {collapsed && !showBadge ? (
        <span className="absolute bottom-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden>
          <Icon size={12} className="text-white/30" />
        </span>
      ) : null}
      {!collapsed && showBadge && badgeContent ? (
        <span
          className={cn(
            "ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-md tabular-nums max-w-[4.5rem] truncate flex-shrink-0",
            isActive ? "bg-white/15 text-white" : "bg-white/[0.08] text-white/60"
          )}
        >
          {badgeContent}
        </span>
      ) : null}
    </motion.button>
  );
}

export { AI_SIDEBAR_ID };
