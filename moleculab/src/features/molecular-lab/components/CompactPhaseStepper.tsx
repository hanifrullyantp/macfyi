"use client";

import { motion } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { StageDef } from "@/store/lab";
import { cn } from "@/lib/utils";

interface CompactPhaseStepperProps {
  stages: StageDef[];
  currentIndex: number;
  onClick: () => void;
}

export function CompactPhaseStepper({ stages, currentIndex, onClick }: CompactPhaseStepperProps) {
  const currentStage = stages[currentIndex];

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 bg-surface px-4 py-2 border-t border-border focus:outline-none"
    >
      <div className="flex items-center gap-1.5 shrink-0">
        {stages.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 w-2 rounded-full transition-all duration-300",
              i === currentIndex 
                ? "h-2 w-5 bg-primary ring-2 ring-primary/20" 
                : i < currentIndex 
                  ? "bg-primary/40" 
                  : "bg-border"
            )}
          />
        ))}
      </div>
      
      <div className="flex flex-1 items-center justify-between min-w-0">
        <span className="truncate font-display text-[13px] font-bold text-muted uppercase tracking-wider">
          {currentStage.group} <span className="mx-1 opacity-30">·</span> 
          <span className="text-foreground">{currentStage.title}</span>
        </span>
        <ChevronUp className="h-4 w-4 text-muted opacity-40" />
      </div>
    </button>
  );
}
