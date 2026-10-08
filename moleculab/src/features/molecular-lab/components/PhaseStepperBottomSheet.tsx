"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { StageDef, STAGE_GROUPS } from "@/store/lab";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface PhaseStepperBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  stages: StageDef[];
  currentIndex: number;
  onJump: (index: number) => void;
}

export function PhaseStepperBottomSheet({ isOpen, onClose, stages, currentIndex, onJump }: PhaseStepperBottomSheetProps) {
  const grouped = STAGE_GROUPS.map(g => ({
    name: g,
    items: stages.map((s, i) => ({ s, i })).filter(x => x.s.group === g)
  })).filter(g => g.items.length > 0);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Navigasi Tahap Pembelajaran">
      <div className="py-4 space-y-6">
        {grouped.map((group) => (
          <div key={group.name} className="space-y-2">
            <h4 className="font-display text-[11px] font-bold uppercase tracking-[0.15em] text-muted px-2">
              {group.name}
            </h4>
            <div className="grid gap-1">
              {group.items.map(({ s, i }) => {
                const isDone = i < currentIndex;
                const isCurrent = i === currentIndex;
                return (
                  <button
                    key={s.id}
                    onClick={() => { onJump(i); onClose(); }}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-all active:scale-95",
                      isCurrent ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-surface-hover"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold border",
                        isCurrent ? "border-white/30 bg-white/20" : isDone ? "border-primary/20 bg-primary/10 text-primary" : "border-border text-muted"
                      )}>
                        {i + 1}
                      </span>
                      <span className="font-display text-sm font-bold">{s.title}</span>
                    </div>
                    {isDone && !isCurrent && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}
