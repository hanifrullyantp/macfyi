import { Loader2, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { cn } from "../utils/cn";

export type OrbDisplayMode = "idle_scan" | "scanning" | "cleaning" | "rescan" | "clean_selected";

type ScanOrbButtonProps = {
  mode: OrbDisplayMode;
  disabled?: boolean;
  onClick: () => void;
  progressPct?: number;
  /** i18n line under icon (e.g. t("orb.clean")) */
  mainText?: string;
  subLabel?: string;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  className?: string;
};

export function ScanOrbButton({
  mode,
  disabled = false,
  onClick,
  progressPct = 0,
  mainText,
  subLabel = "Smart + Safe",
  onPointerEnter,
  onPointerLeave,
  className,
}: ScanOrbButtonProps) {
  const pct = Math.min(100, Math.max(0, progressPct));

  const { fallbackMain, Icon } = (() => {
    switch (mode) {
      case "scanning":
        return {
          fallbackMain: `${Math.round(pct)}%`,
          Icon: <Loader2 size={26} className="animate-spin text-white/95" />,
        };
      case "cleaning":
        return {
          fallbackMain: "Cleaning",
          Icon: <Sparkles size={26} className="text-white/95" />,
        };
      case "rescan":
        return {
          fallbackMain: "Rescan",
          Icon: <ShieldCheck size={26} className="text-white/95" />,
        };
      case "clean_selected":
        return {
          fallbackMain: "Clean",
          Icon: <Trash2 size={26} className="text-white/95" />,
        };
      default:
        return {
          fallbackMain: "Scan",
          Icon: <ShieldCheck size={26} className="text-white/95" />,
        };
    }
  })();

  const displayTitle = mode === "scanning" ? fallbackMain : (mainText ?? fallbackMain);

  const glowActive =
    mode === "idle_scan" || mode === "rescan" || mode === "clean_selected" || mode === "cleaning";

  const innerTint =
    mode === "cleaning" || mode === "clean_selected"
      ? "from-emerald-700/90 via-teal-700/70 to-[var(--color-brand)]"
      : mode === "scanning"
        ? "from-rose-600/90 via-[var(--color-brand)] to-amber-700/60"
        : "from-[#8b0000] via-[var(--color-brand)] to-[var(--color-brand-glow)]";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className={cn(
        "group/orb relative w-[140px] h-[140px] rounded-full select-none outline-none transform-gpu",
        "transition-transform duration-200 ease-out",
        "hover:scale-[1.04] active:scale-[0.96]",
        "focus-visible:ring-2 focus-visible:ring-[var(--color-brand-glow)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]",
        disabled ? "opacity-45 cursor-not-allowed hover:scale-100 active:scale-100" : "",
        glowActive && !disabled ? "animate-[orb-bounce_3s_ease-in-out_infinite]" : "",
        className
      )}
      aria-label={displayTitle}
    >
      {glowActive && !disabled && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-[4px] rounded-full z-[1] flex items-center justify-center overflow-hidden"
        >
          <div
            className="h-[165%] w-[165%] shrink-0 animate-[spin_7s_linear_infinite] opacity-[0.88]"
            style={{
              background:
                "conic-gradient(from 0deg, #450a0a, #dc2626, #7f1d1d, #fca5a5, #991b1b, #ef4444, #450a0a)",
              WebkitMaskImage: "radial-gradient(circle closest-side, transparent 56%, black 58%)",
              maskImage: "radial-gradient(circle closest-side, transparent 56%, black 58%)",
            }}
          />
        </div>
      )}
      <div
        className={cn(
          "pointer-events-none absolute -inset-4 rounded-full blur-2xl opacity-70 z-0",
          "bg-gradient-to-br from-[var(--color-brand-glow)]/50 via-[var(--color-brand)]/30 to-transparent",
          glowActive ? "animate-[orb-glow_2.2s_ease-in-out_infinite]" : "opacity-35"
        )}
      />
      <div
        className={cn(
          "absolute inset-0 rounded-full p-[2px] shadow-2xl z-[2]",
          "bg-gradient-to-br from-white/25 via-white/5 to-transparent"
        )}
      >
        <div
          className={cn(
            "h-full w-full rounded-full border border-white/25 bg-gradient-to-br",
            innerTint
          )}
        />
      </div>
      <div className="pointer-events-none absolute inset-[22px] rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-35 z-[2]" />
      <div className="relative z-[3] flex h-full w-full flex-col items-center justify-center gap-0.5 px-3 text-center text-white">
        <div className="mb-0.5 drop-shadow-md">{Icon}</div>
        <span className="text-[15px] font-bold tracking-tight leading-none">{displayTitle}</span>
        <span className="text-[9px] uppercase tracking-[0.14em] text-white/75 font-semibold">{subLabel}</span>
      </div>
    </button>
  );
}
