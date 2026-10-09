"use client";

import { motion } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { StageDef } from "@/store/lab";
import { cn } from "@/lib/utils";

interface CompactPhaseStepperProps {
  stages: StageDef[];
  currentIndex: number;
  onJump: (index: number) => void;
  onShowFullStepper: () => void;
}

export function CompactPhaseStepper({ stages, currentIndex, onJump, onShowFullStepper }: CompactPhaseStepperProps) {
  const currentStage = stages[currentIndex];

  return (
    <div className="flex w-full items-center gap-4 bg-surface px-4 py-2.5 border-t border-border shadow-sm">
      <div className="flex items-center gap-2 shrink-0">
        {stages.map((_, i) => (
          <button
            key={i}
            onClick={() => onJump(i)}
            aria-label={`Pindah ke tahap ${i + 1}`}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === currentIndex 
                ? "w-6 bg-primary ring-4 ring-primary/10" 
                : i < currentIndex 
                  ? "w-2 bg-primary/40 hover:bg-primary/60" 
                  : "w-2 bg-border hover:bg-muted"
            )}
          />
        ))}
      </div>
      
      <button 
        onClick={onShowFullStepper}
        className="flex flex-1 items-center justify-between min-w-0 group"
      >
        <span className="truncate font-display text-[11px] sm:text-[13px] font-bold text-muted uppercase tracking-wider group-hover:text-primary transition-colors">
          {currentStage.group} <span className="mx-1 opacity-30">·</span> 
          <span className="text-foreground group-hover:text-primary">{currentStage.title}</span>
        </span>
        <ChevronUp className="h-4 w-4 text-muted opacity-40 group-hover:opacity-100" />
      </button>
    </div>
  );
}
