"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { useAppStore } from "@/store/app";
import { useLabStore } from "@/store/lab";
import { 
  Volume2, VolumeX, Languages, FastForward, Boxes, Triangle, Eye, EyeOff, PauseCircle, PlayCircle, BookOpen, MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MoreControlsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  showCaption: boolean;
  onToggleCaption: () => void;
  onOpenGlossary: () => void;
}

export function MoreControlsSheet({ isOpen, onClose, showCaption, onToggleCaption, onOpenGlossary }: MoreControlsSheetProps) {
  const { muted, toggleMuted, rate, cycleRate, langMode, setLangMode } = useAppStore();
  const { 
    viewMode, setViewMode, showAngles, toggle: toggleLab, autoRotate,
    showLigandElectrons 
  } = useLabStore();

  const ControlButton = ({ 
    icon: Icon, label, active, onClick, sublabel 
  }: { icon: any, label: string, active?: boolean, onClick: () => void, sublabel?: string }) => (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 transition-all active:scale-95",
        active ? "bg-primary/10 border-primary/40 text-primary" : "bg-surface-hover border-transparent text-muted hover:border-border"
      )}
    >
      <Icon className={cn("h-6 w-6", active ? "text-primary" : "text-muted")} />
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-wider leading-tight">{label}</p>
        {sublabel && <p className="text-[10px] opacity-60 font-medium">{sublabel}</p>}
      </div>
    </button>
  );

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Pengaturan Simulasi">
      <div className="py-4 space-y-8">
        {/* Grup Audio & Bahasa */}
        <div className="space-y-3">
          <h4 className="px-1 text-[11px] font-bold uppercase tracking-[0.15em] text-muted">Audio & Bahasa</h4>
          <div className="grid grid-cols-2 gap-2.5">
            <ControlButton
              icon={muted ? VolumeX : Volume2}
              label={muted ? "Suara Mati" : "Suara Aktif"}
              active={!muted}
              onClick={toggleMuted}
            />
            <ControlButton
              icon={FastForward}
              label="Kecepatan"
              sublabel={`${rate}x`}
              onClick={cycleRate}
            />
            <ControlButton
              icon={Languages}
              label="Bahasa"
              sublabel={langMode === "simple" ? "Sederhana" : "Teknis"}
              onClick={() => setLangMode(langMode === "simple" ? "technical" : "simple")}
            />
             <ControlButton
              icon={showCaption ? MessageSquare : EyeOff}
              label="Teks Penjelasan"
              active={showCaption}
              onClick={onToggleCaption}
            />
          </div>
        </div>

        {/* Grup Tampilan 3D */}
        <div className="space-y-3">
          <h4 className="px-1 text-[11px] font-bold uppercase tracking-[0.15em] text-muted">Tampilan 3D</h4>
          <div className="grid grid-cols-2 gap-2.5">
            <ControlButton
              icon={Boxes}
              label="Mode Visual"
              sublabel={viewMode === "ball-stick" ? "Ball & Stick" : "Space-Fill"}
              onClick={() => setViewMode(viewMode === "ball-stick" ? "spacefill" : "ball-stick")}
            />
            <ControlButton
              icon={Triangle}
              label="Sudut Ikatan"
              active={showAngles}
              onClick={() => toggleLab("showAngles")}
            />
            <ControlButton
              icon={showLigandElectrons ? Eye : EyeOff}
              label="Elektron Ligan"
              active={showLigandElectrons}
              onClick={() => toggleLab("showLigandElectrons")}
            />
            <ControlButton
              icon={autoRotate ? PlayCircle : PauseCircle}
              label="Auto Rotasi"
              active={autoRotate}
              onClick={() => toggleLab("autoRotate")}
            />
          </div>
        </div>

        {/* Grup Info Tambahan */}
        <div className="space-y-3 pb-4">
          <h4 className="px-1 text-[11px] font-bold uppercase tracking-[0.15em] text-muted">Informasi</h4>
          <button
            onClick={onOpenGlossary}
            className="flex w-full items-center gap-4 rounded-2xl bg-secondary/10 p-4 text-secondary transition-all hover:bg-secondary/15 active:scale-[0.98]"
          >
            <BookOpen className="h-6 w-6 shrink-0" />
            <div className="text-left">
              <p className="font-display text-sm font-bold uppercase tracking-wider">Kamus Istilah Kimia</p>
              <p className="text-[11px] opacity-70">Pelajari definisi PEI, PEB, VSEPR, dan lainnya.</p>
            </div>
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
