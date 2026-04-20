import type { ReactNode } from "react";
import { Button } from "../ui/Button";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30">
      {icon ? <div className="mb-4 text-zinc-500">{icon}</div> : null}
      <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
      {description ? <p className="mt-1 text-xs text-zinc-500 max-w-sm">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button variant="secondary" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
