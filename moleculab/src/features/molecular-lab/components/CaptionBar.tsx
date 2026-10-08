"use client";

import { motion } from "framer-motion";
import { ChevronUp, Volume2 } from "lucide-react";
import { NarrationIndicator } from "./NarrationIndicator";

interface CaptionBarProps {
  text: string;
  isSpeaking: boolean;
  onExpand: () => void;
  show: boolean;
}

export function CaptionBar({ text, isSpeaking, onExpand, show }: CaptionBarProps) {
  if (!show) return null;

  return (
    <div className="border-t border-border bg-surface/50 backdrop-blur-md px-4 py-3">
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <button
          onClick={onExpand}
          className="flex flex-1 items-center gap-3 text-left focus:outline-none"
        >
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {isSpeaking ? <NarrationIndicator active={true} /> : <Volume2 className="h-4 w-4 opacity-50" />}
          </div>
          
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[13px] font-medium leading-relaxed text-foreground/90">
              {text}
            </p>
          </div>
          
          <ChevronUp className="h-4 w-4 shrink-0 text-muted opacity-50" />
        </button>
      </div>
    </div>
  );
}
