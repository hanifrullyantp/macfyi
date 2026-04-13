import { Check, Minus } from "lucide-react";
import { cn } from "../../utils/cn";

export type TriState = "checked" | "unchecked" | "mixed";

interface TriStateCheckboxProps {
  state: TriState;
  onClick: () => void;
  disabled?: boolean;
  "aria-label"?: string;
}

export function TriStateCheckbox({ state, onClick, disabled, "aria-label": ariaLabel }: TriStateCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === "mixed" ? "mixed" : state === "checked"}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all duration-200 ease-out",
        disabled && "opacity-40 cursor-not-allowed",
        state === "checked" && "bg-blue-500 border-blue-500",
        state === "unchecked" && "border-white/30 hover:border-white/60 bg-transparent",
        state === "mixed" && "bg-blue-500/80 border-blue-400"
      )}
    >
      {state === "checked" && <Check size={12} className="text-white" strokeWidth={3} />}
      {state === "mixed" && <Minus size={12} className="text-white" strokeWidth={3} />}
    </button>
  );
}

export function categoryTriState(ids: string[], selectedIds: Set<string>): TriState {
  if (ids.length === 0) return "unchecked";
  let n = 0;
  for (const id of ids) {
    if (selectedIds.has(id)) n++;
  }
  if (n === 0) return "unchecked";
  if (n === ids.length) return "checked";
  return "mixed";
}
