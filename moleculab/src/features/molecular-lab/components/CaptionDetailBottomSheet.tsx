"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { Term } from "@/components/ui";

interface CaptionDetailBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fullText: string;
}

export function CaptionDetailBottomSheet({ isOpen, onClose, title, fullText }: CaptionDetailBottomSheetProps) {
  // Simple regex parser to highlight/link terms inside narration text could be added here
  // For now, render full text as is.
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <div className="py-4 space-y-4">
        <p className="text-base leading-relaxed text-foreground/90">
          {fullText}
        </p>
        <div className="rounded-2xl bg-surface-hover p-4 text-xs text-muted leading-relaxed italic border border-border">
          Ketuk istilah berwarna biru dalam aplikasi untuk melihat glosarium lengkap.
        </div>
      </div>
    </BottomSheet>
  );
}
