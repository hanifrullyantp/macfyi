"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  ChevronLeft, ChevronRight, Pause, Play, RotateCcw, SlidersHorizontal, ChevronDown, ChevronUp 
} from "lucide-react";
import { IconButtonWithTooltip } from "@/components/ui/IconButtonWithTooltip";
import { cn } from "@/lib/utils";

interface ControlBarProps {
  index: number;
  seqLength: number;
  isPlaying: boolean;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  onTogglePlay: () => void;
  onOpenMore: () => void;
}

export function ControlBar({
  index,
  seqLength,
  isPlaying,
  onPrev,
  onNext,
  onReset,
  onTogglePlay,
  onOpenMore,
}: ControlBarProps) {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <div className={cn(
      "sticky bottom-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out",
      isVisible ? "translate-y-0" : "translate-y-[calc(100%-12px)]"
    )}>
      {/* Toggle Handle */}
      <div className="flex justify-center -mb-[1px]">
        <button 
          onClick={() => setIsVisible(!isVisible)}
          className="flex h-5 w-12 items-center justify-center rounded-t-xl bg-surface border-t border-x border-border text-muted hover:text-primary transition-all shadow-[0_-4px_8px_rgba(0,0,0,0.05)] active:scale-95"
          title={isVisible ? "Sembunyikan Kontrol" : "Tampilkan Kontrol"}
        >
          {isVisible ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>

      <div className="flex items-center justify-between gap-1 border-t border-border bg-surface/90 backdrop-blur-xl px-3 py-2 sm:px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-1 min-w-0">
          <IconButtonWithTooltip
            icon={<ChevronLeft className="h-4 w-4" />}
            label="Sebelumnya"
            onClick={onPrev}
            disabled={index === 0}
            className="h-9 w-9"
          />
          
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onTogglePlay}
            className="flex h-10 w-12 sm:w-16 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md transition-all hover:brightness-105"
            aria-label={isPlaying ? "Jeda" : "Putar"}
          >
            {isPlaying ? <Pause className="fill-current h-4 w-4" /> : <Play className="fill-current h-4 w-4 ml-0.5" />}
          </motion.button>

          <IconButtonWithTooltip
            icon={<ChevronRight className="h-4 w-4" />}
            label="Berikutnya"
            onClick={onNext}
            disabled={index >= seqLength - 1}
            className="h-9 w-9"
          />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <IconButtonWithTooltip
            icon={<RotateCcw className="h-4 w-4" />}
            label="Reset"
            onClick={onReset}
            variant="ghost"
            className="h-9 w-9"
          />
          <div className="h-6 w-px bg-border mx-0.5" />
          <IconButtonWithTooltip
            icon={<SlidersHorizontal className="h-4 w-4" />}
            label="Lainnya"
            onClick={onOpenMore}
            variant="secondary"
            className="h-9 w-9"
          />
        </div>
      </div>
    </div>
  );
}
