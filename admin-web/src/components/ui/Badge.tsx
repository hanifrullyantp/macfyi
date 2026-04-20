import { type HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

const tones = {
  default: "bg-zinc-700/80 text-zinc-200",
  success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  danger: "bg-red-500/15 text-red-400 border border-red-500/30",
  info: "bg-violet-500/15 text-violet-300 border border-violet-500/30",
  muted: "bg-zinc-800 text-zinc-500 border border-zinc-700",
} as const;

export function Badge({
  tone = "default",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
