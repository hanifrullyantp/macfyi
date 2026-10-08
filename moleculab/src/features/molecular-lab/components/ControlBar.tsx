"use client";

import { motion } from "framer-motion";
import { 
  ChevronLeft, ChevronRight, Pause, Play, RotateCcw, SlidersHorizontal 
} from "lucide-react";
import { IconButtonWithTooltip } from "@/components/ui/IconButtonWithTooltip";

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
  return (
    <div className="sticky bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-2 border-t border-border bg-surface px-4 py-3 sm:px-6">
      <div className="flex items-center gap-1.5">
        <IconButtonWithTooltip
          icon={<ChevronLeft className="h-5 w-5" />}
          label="Tahap Sebelumnya"
          onClick={onPrev}
          disabled={index === 0}
        />
        
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onTogglePlay}
          className="flex h-12 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-110"
          aria-label={isPlaying ? "Jeda" : "Putar"}
        >
          {isPlaying ? <Pause className="fill-current h-5 w-5" /> : <Play className="fill-current h-5 w-5 ml-0.5" />}
        </motion.button>

        <IconButtonWithTooltip
          icon={<ChevronRight className="h-5 w-5" />}
          label="Tahap Berikutnya"
          onClick={onNext}
          disabled={index >= seqLength - 1}
        />
      </div>

      <div className="flex items-center gap-1.5">
        <IconButtonWithTooltip
          icon={<RotateCcw className="h-5 w-5" />}
          label="Ulangi Simulasi"
          onClick={onReset}
          variant="ghost"
        />
        <div className="h-8 w-px bg-border mx-1" />
        <IconButtonWithTooltip
          icon={<SlidersHorizontal className="h-5 w-5" />}
          label="Pengaturan Lanjutan"
          onClick={onOpenMore}
          variant="secondary"
        />
      </div>
    </div>
  );
}
