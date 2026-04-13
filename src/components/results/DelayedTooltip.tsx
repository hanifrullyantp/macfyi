import { useRef, useState, type ReactNode } from "react";

/** Hover ≥800ms before showing (Issue 13) — keep content lightweight for virtualized rows */
export function DelayedTooltip({ text, children }: { text: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef(0);

  return (
    <div
      className="relative min-w-0"
      onMouseEnter={() => {
        window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setOpen(true), 800);
      }}
      onMouseLeave={() => {
        window.clearTimeout(timerRef.current);
        setOpen(false);
      }}
    >
      {children}
      {open && (
        <div
          className="absolute z-[80] left-0 top-full mt-1 max-w-[min(100%,24rem)] px-2 py-1.5 rounded-lg bg-[#0d0e12]/95 backdrop-blur-sm border border-white/15 text-[10px] text-white/88 shadow-xl break-all pointer-events-none"
          role="tooltip"
        >
          {text}
        </div>
      )}
    </div>
  );
}
