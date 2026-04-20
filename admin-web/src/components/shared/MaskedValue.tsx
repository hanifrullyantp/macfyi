import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../lib/cn";

export function MaskedValue({
  value,
  masked,
  className,
}: {
  value: string;
  masked: string;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono text-xs", className)}>
      <span>{show ? value : masked}</span>
      <button
        type="button"
        className="rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide value" : "Reveal value"}
      >
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}
