"use client";

import { ReactNode, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Volume2, VolumeX,
  Languages, Rotate3d, Triangle, Eye, EyeOff, Ghost, Gauge, Boxes, Orbit, AudioLines,
  X, Info, MoreHorizontal, Settings2, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STAGE_GROUPS, StageDef } from "@/store/lab";
import { useAppStore } from "@/store/app";
import { useAuth } from "@/features/auth/useAuth";
import { useEditableContent, useUpdateContent } from "@/lib/useEditableContent";

/* ================= Timeline (6 phase-group + sub-stage dots) ================= */

export function Timeline({
  seq, index, onJump,
}: {
  seq: StageDef[];
  index: number;
  onJump: (i: number) => void;
}) {
  const groups = STAGE_GROUPS
    .map((g) => ({ name: g, items: seq.map((s, i) => ({ s, i })).filter((x) => x.s.group === g) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="overflow-x-auto pb-1" role="navigation" aria-label="Linimasa tahap pembelajaran">
      <ol className="flex min-w-max items-stretch px-1">
        {groups.map((g, gi) => {
          const firstIdx = g.items[0].i;
          const lastIdx = g.items[g.items.length - 1].i;
          const state = index > lastIdx ? "done" : index >= firstIdx ? "active" : "todo";
          return (
            <li key={g.name} className="flex items-center">
              {gi > 0 && (
                <div className={cn("mx-1.5 h-px w-3 sm:w-5", state !== "todo" ? "bg-primary/70" : "bg-border")} aria-hidden />
              )}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => onJump(firstIdx)}
                  aria-current={state === "active" ? "step" : undefined}
                  className={cn(
                    "whitespace-nowrap rounded-full px-2.5 py-1.5 text-[10.5px] font-bold tracking-wide transition-all sm:px-3 sm:text-[11.5px]",
                    state === "active"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : state === "done"
                        ? "bg-primary/15 text-primary hover:bg-primary/25"
                        : "bg-surface-hover text-muted hover:text-foreground",
                  )}
                >
                  {g.name}
                </button>
                <div className="flex items-center gap-1.5">
                  {g.items.map(({ s, i }) => (
                    <button
                      key={s.id}
                      onClick={() => onJump(i)}
                      aria-label={s.title}
                      title={s.title}
                      className={cn(
                        "rounded-full transition-all",
                        i === index
                          ? "h-2 w-4 bg-primary"
                          : i < index
                            ? "h-2 w-2 bg-primary/50 hover:bg-primary/80"
                            : "h-2 w-2 bg-border hover:bg-muted",
                      )}
                    />
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ================= ControlToolbar ================= */

function IconBtn({
  onClick, label, active, disabled, children, text,
}: {
  onClick: () => void; label: string; active?: boolean; disabled?: boolean; children?: ReactNode; text?: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-xl border px-2 text-[11px] font-bold transition-all",
        active
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-border text-muted hover:bg-surface-hover hover:text-foreground",
        disabled && "pointer-events-none opacity-35",
      )}
    >
      {children}
      {text && <span className="hidden xl:inline">{text}</span>}
    </motion.button>
  );
}

export function ControlToolbar({
  index, seqLength, playing, onPrev, onNext, onReset, onTogglePlay,
  showLigandElectrons, hideLonePairs, showAngles, autoRotate, viewMode,
  onToggle, onViewMode,
  hasLonePairs,
  showCaption, onToggleCaption
}: {
  index: number; seqLength: number; playing: boolean;
  onPrev: () => void; onNext: () => void; onReset: () => void; onTogglePlay: () => void;
  showLigandElectrons: boolean; hideLonePairs: boolean; showAngles: boolean;
  autoRotate: boolean; viewMode: "ball-stick" | "spacefill";
  onToggle: (key: "showLigandElectrons" | "hideLonePairs" | "showAngles" | "autoRotate") => void;
  onViewMode: () => void;
  hasLonePairs: boolean;
  showCaption: boolean;
  onToggleCaption: () => void;
}) {
  const muted = useAppStore((s) => s.muted);
  const toggleMuted = useAppStore((s) => s.toggleMuted);
  const rate = useAppStore((s) => s.rate);
  const cycleRate = useAppStore((s) => s.cycleRate);
  const langMode = useAppStore((s) => s.langMode);
  const setLangMode = useAppStore((s) => s.setLangMode);
  
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="flex w-full items-center justify-between gap-1.5" role="toolbar" aria-label="Kontrol simulasi">
      {/* Primary Controls (Always Visible) */}
      <div className="flex items-center gap-1">
        <IconBtn onClick={onPrev} label="Tahap sebelumnya (Arrow Left)" disabled={index === 0}>
          <ChevronLeft className="h-4 w-4" />
        </IconBtn>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onTogglePlay}
          aria-label={playing ? "Jeda (Space)" : "Putar (Space)"}
          title={playing ? "Jeda otomatis" : "Putar otomatis"}
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-[12px] font-bold text-primary-foreground shadow-md transition-all hover:brightness-110"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          <span className="hidden sm:inline">{playing ? "Jeda" : "Putar"}</span>
        </motion.button>
        <IconBtn onClick={onNext} label="Tahap berikutnya (Arrow Right)" disabled={index >= seqLength - 1}>
          <ChevronRight className="h-4 w-4" />
        </IconBtn>
        <IconBtn onClick={onReset} label="Ulangi dari awal">
          <RotateCcw className="h-4 w-4" />
        </IconBtn>
      </div>

      {/* Responsive Secondary Controls */}
      <div className="flex items-center gap-1">
        <div className="hidden items-center gap-1 md:flex">
          <IconBtn onClick={onToggleCaption} label={showCaption ? "Sembunyikan teks penjelasan" : "Tampilkan teks penjelasan"} active={showCaption}>
            <Info className="h-4 w-4" />
          </IconBtn>
          <div className="mx-1 h-6 w-px bg-border" />
          <IconBtn onClick={toggleMuted} label={muted ? "Aktifkan suara" : "Bisukan suara"} active={!muted}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </IconBtn>
          <IconBtn onClick={cycleRate} label={`Kecepatan: ${rate}x`}>
            <span className="w-8">{rate}x</span>
          </IconBtn>
          <IconBtn onClick={() => onToggle("autoRotate")} label="Rotasi kamera" active={autoRotate}>
            <Orbit className="h-4 w-4" />
          </IconBtn>
        </div>

        {/* More Menu (Mobile & Tablet) */}
        <div className="relative">
          <IconBtn onClick={() => setShowMore(!showMore)} label="Pengaturan lainnya" active={showMore}>
            <Settings2 className="h-4 w-4" />
          </IconBtn>
          
          <AnimatePresence>
            {showMore && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMore(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full right-0 z-40 mb-3 w-64 rounded-2xl border border-border bg-surface p-2 shadow-2xl"
                >
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={onToggleCaption} className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold", showCaption ? "bg-primary/15 text-primary" : "hover:bg-surface-hover")}>
                      <Info className="h-3.5 w-3.5" /> Penjelasan
                    </button>
                    <button onClick={toggleMuted} className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold", !muted ? "bg-primary/15 text-primary" : "hover:bg-surface-hover")}>
                      <Volume2 className="h-3.5 w-3.5" /> Suara
                    </button>
                    <button onClick={() => setLangMode(langMode === "simple" ? "technical" : "simple")} className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold hover:bg-surface-hover">
                      <Languages className="h-3.5 w-3.5" /> {langMode === "simple" ? "Sederhana" : "Teknis"}
                    </button>
                    <button onClick={cycleRate} className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold hover:bg-surface-hover">
                      <Gauge className="h-3.5 w-3.5" /> Laju: {rate}x
                    </button>
                    <button onClick={() => onToggle("showAngles")} className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold", showAngles ? "bg-primary/15 text-primary" : "hover:bg-surface-hover")}>
                      <Triangle className="h-3.5 w-3.5" /> Sudut
                    </button>
                    <button onClick={() => onToggle("autoRotate")} className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold", autoRotate ? "bg-primary/15 text-primary" : "hover:bg-surface-hover")}>
                      <Orbit className="h-3.5 w-3.5" /> Rotasi
                    </button>
                    <button onClick={onViewMode} className={cn("col-span-2 flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold", viewMode === "spacefill" ? "bg-primary/15 text-primary" : "hover:bg-surface-hover")}>
                      <Boxes className="h-3.5 w-3.5" /> Mode: {viewMode === "ball-stick" ? "Bola-Stik" : "SpaceFill"}
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ================= CaptionBar (teks narasi) ================= */

export function CaptionBar({
  group, title, stepLabel, text, speaking, show, onToggle, cmsKey
}: {
  group: string; title: string; stepLabel: string; text: string; speaking: boolean; show: boolean; onToggle: () => void;
  cmsKey?: string;
}) {
  const { data: user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: remoteValue } = useEditableContent(cmsKey || "", "");
  const updateMutation = useUpdateContent();
  const [isCmsEditing, setIsCmsEditing] = useState(false);
  const [cmsValue, setCmsValue] = useState("");

  useEffect(() => {
    if (remoteValue) setCmsValue(remoteValue);
  }, [remoteValue]);
  const [showDetail, setShowDetail] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Jika user menutup panel keterangan secara global, pastikan detail juga tutup
    if (!show) setShowDetail(false);
  }, [show]);

  useEffect(() => {
    // Reset detail saat ganti stage, tapi tetap patuh pada state 'show' global
    setShowDetail(false);
    setProgress(0);
  }, [title, stepLabel]);

  useEffect(() => {
    let interval: any;
    if (speaking) {
      const startTime = Date.now();
      const estimatedDuration = Math.max(3000, text.length * 65);
      interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const p = Math.min(100, (elapsed / estimatedDuration) * 100);
        setProgress(p);
        if (p >= 100) clearInterval(interval);
      }, 50);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [speaking, text]);

  if (!show) return null;

  return (
    <div key={title + stepLabel} className="caption-in pointer-events-none w-full">
      <div className="pointer-events-auto relative mx-auto max-w-2xl overflow-hidden rounded-2xl glass px-4 py-3 shadow-lg transition-all">
        {speaking && (
          <div className="absolute left-0 top-0 h-[2px] w-full bg-border" aria-hidden>
            <motion.div 
              className="h-full bg-primary shadow-[0_0_8px_rgb(var(--primary))]" 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear" }}
            />
          </div>
        )}
        
        <button
          onClick={onToggle}
          aria-label="Tutup panel penjelasan"
          title="Tutup (X)"
          className="absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-surface-hover text-muted hover:text-foreground active:scale-90"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="mb-1 flex flex-wrap items-center gap-2 pr-8">
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            {group}
          </span>
          <span className="text-[10px] font-semibold text-muted">{stepLabel}</span>
          {speaking && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary">
              <AudioLines className="h-3.5 w-3.5 animate-pulse" /> narasi
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 pr-8">
          <p className="font-display text-sm font-bold leading-snug">{title}</p>
          {isAdmin && (
            <button 
              onClick={() => setIsCmsEditing(true)}
              className="p-1 text-primary hover:bg-primary/10 rounded"
              title="Edit Template Narasi (Admin)"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
        </div>

        {isCmsEditing ? (
          <div className="mt-2 space-y-2 animate-in slide-in-from-top-1">
            <textarea 
              value={cmsValue}
              onChange={(e) => setCmsValue(e.target.value)}
              className="w-full bg-surface border border-primary p-2 rounded-xl text-xs min-h-[80px] focus:outline-none"
              placeholder="Gunakan variabel: {molecule.name}, {centralAtom.name}, dst."
            />
            <div className="flex justify-between items-center">
              <p className="text-[9px] text-muted">Variabel: molecule.name, centralAtom.valence, steric, pei, peb, angle</p>
              <div className="flex gap-2">
                <button onClick={async () => {
                  await updateMutation.mutateAsync({ key: cmsKey!, value: cmsValue });
                  setIsCmsEditing(false);
                }} className="px-2 py-1 bg-primary text-white text-[10px] font-bold rounded-lg">Simpan</button>
                <button onClick={() => setIsCmsEditing(false)} className="px-2 py-1 bg-surface-hover text-muted text-[10px] font-bold rounded-lg">Batal</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-1">
            <button 
              onClick={() => setShowDetail(!showDetail)}
              className="text-[10px] font-bold text-primary hover:underline"
            >
              {showDetail ? "Sembunyikan detail ▲" : "Baca penjelasan lengkap ▼"}
            </button>
          </div>
        )}

        <AnimatePresence>
          {showDetail && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <p className="mt-2 border-t border-border pt-2 text-[13px] leading-relaxed text-foreground/85">
                {text}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ================= Legend (permanen, sadar stage) ================= */

function SwatchSolid({ color }: { color: string }) {
  return (
    <span aria-hidden className="inline-block h-3.5 w-3.5 rounded-full" style={{ background: color }} />
  );
}
function SwatchRing({ color }: { color: string }) {
  return (
    <span aria-hidden className="relative inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border-2" style={{ borderColor: color }}>
      <span className="h-1 w-1 rounded-full" style={{ background: color }} />
    </span>
  );
}
function SwatchDashed({ color }: { color: string }) {
  return (
    <span aria-hidden className="inline-block h-3.5 w-3.5 rounded-full border-2 border-dashed" style={{ borderColor: color }} />
  );
}

export function LegendRail({ stageId, palette }: { stageId: string; palette: { electronCentral: string; electronLigand: string; pei: string; peb: string; force: string; lobe: string } }) {
  const items: ReactNode[] = [];
  const electronStages = ["valence-electrons", "electron-pairing", "identify-pei-peb", "lewis-transition", "domain-repulsion", "stable-geometry", "lone-pair-effect"];
  if (electronStages.includes(stageId)) {
    items.push(
      <div key="e1" className="flex items-center gap-2"><SwatchSolid color={palette.electronCentral} /><span>Elektron atom pusat (solid)</span></div>,
      <div key="e2" className="flex items-center gap-2"><SwatchRing color={palette.electronLigand} /><span>Elektron atom ligan (bercincin)</span></div>,
    );
  }
  if (["identify-pei-peb", "lewis-transition"].includes(stageId)) {
    items.push(
      <div key="p1" className="flex items-center gap-2"><SwatchDashed color={palette.pei} /><span><b className="text-pei">PEI</b> — dipakai bersama</span></div>,
      <div key="p2" className="flex items-center gap-2"><SwatchDashed color={palette.peb} /><span><b className="text-peb">PEB</b> — milik sendiri</span></div>,
    );
  }
  if (["domain-repulsion"].includes(stageId)) {
    items.push(
      <div key="f1" className="flex items-center gap-2"><span aria-hidden className="inline-block h-0.5 w-3.5 rounded" style={{ background: palette.force }} /><span>Gaya tolak antar domain</span></div>,
    );
  }
  if (["domain-repulsion", "stable-geometry", "lone-pair-effect"].includes(stageId)) {
    items.push(
      <div key="l1" className="flex items-center gap-2"><span aria-hidden className="inline-block h-3.5 w-3 rounded-full" style={{ background: palette.lobe }} /><span>PEB pusat (domain bebas)</span></div>,
    );
  }
  if (items.length === 0) return null;
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-10 hidden max-w-[210px] flex-col gap-1.5 rounded-2xl glass p-3 text-[10.5px] font-medium leading-tight shadow-md sm:flex" aria-label="Legenda visual">
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted">Legenda</p>
      {items}
      {electronStages.includes(stageId) && (
        <p className="mt-0.5 border-t border-border pt-1.5 text-[9.5px] text-muted">
          Warna hanya menandai <i>asal</i> elektron — secara kimia semua elektron identik.
        </p>
      )}
    </div>
  );
}
