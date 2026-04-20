import { cn } from "../../lib/cn";

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "muted" | "info"> = {
  active: "success",
  paid: "success",
  settlement: "success",
  completed: "success",
  pending: "warning",
  approved: "info",
  draft: "muted",
  revoked: "danger",
  rejected: "danger",
  cancelled: "danger",
  canceled: "danger",
  cancel: "danger",
  expire: "muted",
  suspended: "warning",
  ended: "muted",
};

const toneClass: Record<string, string> = {
  success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  danger: "bg-red-500/15 text-red-400 border-red-500/30",
  muted: "bg-zinc-700/80 text-zinc-400 border-zinc-600",
  info: "bg-violet-500/15 text-violet-300 border-violet-500/30",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = status.toLowerCase();
  const tone = STATUS_TONE[key] ?? "muted";
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        toneClass[tone],
        className,
      )}
    >
      {status}
    </span>
  );
}
