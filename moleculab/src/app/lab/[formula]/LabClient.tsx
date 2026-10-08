"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { 
  ArrowLeft, MousePointerClick, ChevronRight, MessageCircle, Loader2 
} from "lucide-react";

const Spinner = ({ className }: { className?: string }) => (
  <Loader2 className={`animate-spin ${className}`} />
);
import { LabPopup, Molecule } from "@/lib/types";
import { stageSequence, useLabStore } from "@/store/lab";
import { useAppStore } from "@/store/app";
import { getNarration } from "@/engine/narration";
import { getElement } from "@/data/periodic-table";
import { formatFormula, formatAXE } from "@/lib/utils";
import { MOLECULES, DIFFICULTY_LABEL } from "@/data/molecules";
import { Badge } from "@/components/ui";

import { MoleculeViewportContainer } from "@/features/molecular-lab/components/MoleculeViewportContainer";
import { PeriodicTableChip } from "@/features/molecular-lab/components/PeriodicTableChip";
import { ElementInfoBottomSheet } from "@/features/molecular-lab/components/ElementInfoBottomSheet";
import { CaptionBar } from "@/features/molecular-lab/components/CaptionBar";
import { CaptionDetailBottomSheet } from "@/features/molecular-lab/components/CaptionDetailBottomSheet";
import { CompactPhaseStepper } from "@/features/molecular-lab/components/CompactPhaseStepper";
import { PhaseStepperBottomSheet } from "@/features/molecular-lab/components/PhaseStepperBottomSheet";
import { ControlBar } from "@/features/molecular-lab/components/ControlBar";
import { MoreControlsSheet } from "@/features/molecular-lab/components/MoreControlsSheet";
import { OnboardingTour } from "@/features/molecular-lab/components/OnboardingTour";
import { LabInfoModal } from "@/components/lab-panels";
import { useHydrated } from "@/components/theme";

const MoleculeCanvas = dynamic(() => import("@/three/MoleculeCanvas"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-background">
      <Spinner className="h-8 w-8 animate-spin" />
    </div>
  ),
});

function LabInner({ molecule }: { molecule: Molecule }) {
  const router = useRouter();
  const params = useSearchParams();
  const seq = useMemo(() => stageSequence(molecule), [molecule]);
  
  const stageIndex = useLabStore((s) => s.stageIndex);
  const playing = useLabStore((s) => s.playing);
  const setPlaying = useLabStore((s) => s.setPlaying);
  const next = useLabStore((s) => s.next);
  const prev = useLabStore((s) => s.prev);
  const reset = useLabStore((s) => s.reset);
  const setStage = useLabStore((s) => s.setStage);
  const store = useLabStore();
  
  const theme = useAppStore((s) => s.theme);
  const muted = useAppStore((s) => s.muted);
  const rate = useAppStore((s) => s.rate);
  const langMode = useAppStore((s) => s.langMode);
  const markVisited = useAppStore((s) => s.markVisited);

  const safeIndex = Math.min(stageIndex, seq.length - 1);
  const stageId = seq[safeIndex].id;
  const stageDef = seq[safeIndex];

  // Overlay States
  const [showElementInfo, setShowElementInfo] = useState(false);
  const [showCaptionDetail, setShowCaptionDetail] = useState(false);
  const [showStepper, setShowStepper] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showCaptionBar, setShowCaptionBar] = useState(true);
  const [popup, setPopup] = useState<LabPopup | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const caption = useMemo(() => getNarration(stageId, molecule, langMode), [stageId, molecule, langMode]);

  const speakText = useCallback((text: string) => {
    if (muted || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "id-ID";
    u.rate = rate;
    
    const voices = synth.getVoices();
    const idVoice = voices.find((v) => v.lang?.toLowerCase().startsWith("id") && v.name.toLowerCase().includes("google"))
      ?? voices.find((v) => v.lang?.toLowerCase().startsWith("id"));
    if (idVoice) u.voice = idVoice;

    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    synth.speak(u);
  }, [muted, rate]);

  const advance = useCallback(() => {
    const st = useLabStore.getState();
    if (st.stageIndex < seq.length - 1) st.next(seq.length);
    else st.setPlaying(false);
  }, [seq.length]);

  useEffect(() => {
    markVisited(molecule.formula);
  }, [molecule.formula, markVisited]);

  // Handle auto-speak on popup
  useEffect(() => {
    if (popup) {
      let text = "";
      if (popup.kind === "atom") text = `${getElement(popup.symbol).name}. ${getElement(popup.symbol).simpleExplanation}`;
      else if (popup.kind === "electron") text = `Ini adalah elektron valensi atom ${popup.ownerSymbol}.`;
      else if (popup.kind === "pair") text = `Ini adalah pasangan elektron ${popup.pairKind === "PEI" ? "ikatan" : "bebas"}.`;
      if (text) speakText(text);
    }
  }, [popup, speakText]);

  // Handle Main Narration
  useEffect(() => {
    if (popup || showElementInfo || showCaptionDetail || showStepper || showMore) return;
    if (muted || typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeaking(false);
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    if (!caption) return;
    const u = new SpeechSynthesisUtterance(caption);
    u.lang = "id-ID";
    u.rate = rate;
    u.onstart = () => setSpeaking(true);
    u.onend = () => {
      setSpeaking(false);
      if (useLabStore.getState().playing) advance();
    };
    synth.speak(u);
    return () => { synth.cancel(); setSpeaking(false); };
  }, [caption, muted, rate, popup, showElementInfo, showCaptionDetail, showStepper, showMore, advance]);

  const hydrated = useHydrated();
  if (!hydrated) return <div className="flex h-screen items-center justify-center bg-background"><Spinner className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background no-scroll">
      <OnboardingTour />
      
      {/* Header - Fixed Height */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/lab")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-hover text-muted transition-colors hover:text-foreground"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate font-display text-[15px] font-bold tracking-tight">
              {molecule.name} <span className="text-primary">{formatFormula(molecule.formula)}</span>
            </h1>
          </div>
        </div>

        <select
          value={molecule.formula}
          onChange={(e) => router.push(`/lab/${e.target.value}`)}
          className="h-9 rounded-full border border-border bg-background px-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-primary"
        >
          {MOLECULES.map((m) => (
            <option key={m.formula} value={m.formula}>{formatFormula(m.formula)}</option>
          ))}
        </select>
      </header>

      {/* Viewport - Minimal 50dvh, flex-grow */}
      <MoleculeViewportContainer
        overlay={
          <div className="flex w-full items-start justify-between">
            <PeriodicTableChip molecule={molecule} onClick={() => setShowElementInfo(true)} />
            
            {stageId === "conclusion" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pointer-events-auto rounded-2xl glass p-3 text-[10px] font-bold uppercase tracking-widest text-primary">
                Selesai ✓
              </motion.div>
            )}
          </div>
        }
      >
        <div id="molecule-canvas" className="h-full w-full">
          <MoleculeCanvas
            molecule={molecule}
            stageId={stageId}
            showLigandElectrons={store.showLigandElectrons}
            hideLonePairs={store.hideLonePairs}
            showAngles={store.showAngles}
            autoRotate={store.autoRotate}
            viewMode={store.viewMode}
            theme={theme}
            onPopup={setPopup}
            resetToken={store.resetToken}
            rotateSpeed={safeIndex >= 8 ? 0.7 : 0.35}
          />
        </div>
      </MoleculeViewportContainer>

      {/* Info Layers - Collapsible */}
      <div className="shrink-0 z-50">
        <CaptionBar 
          text={caption} 
          isSpeaking={speaking} 
          onExpand={() => setShowCaptionDetail(true)}
          show={showCaptionBar}
        />
        
        <CompactPhaseStepper 
          stages={seq} 
          currentIndex={safeIndex} 
          onClick={() => setShowStepper(true)} 
        />
        
        {/* Sticky Control Bar */}
        <ControlBar
          index={safeIndex}
          seqLength={seq.length}
          isPlaying={playing}
          onPrev={() => { prev(); setPlaying(false); }}
          onNext={() => { next(seq.length); setPlaying(false); }}
          onReset={() => { reset(); }}
          onTogglePlay={() => setPlaying(!playing)}
          onOpenMore={() => setShowMore(true)}
        />
      </div>

      {/* BottomSheets / Modals */}
      <ElementInfoBottomSheet 
        isOpen={showElementInfo} 
        onClose={() => setShowElementInfo(false)} 
        molecule={molecule} 
      />

      <CaptionDetailBottomSheet
        isOpen={showCaptionDetail}
        onClose={() => setShowCaptionDetail(false)}
        title={stageDef.title}
        fullText={caption}
      />

      <PhaseStepperBottomSheet
        isOpen={showStepper}
        onClose={() => setShowStepper(false)}
        stages={seq}
        currentIndex={safeIndex}
        onJump={(i) => { setStage(i, seq.length); setPlaying(false); }}
      />

      <MoreControlsSheet
        isOpen={showMore}
        onClose={() => setShowMore(false)}
        showCaption={showCaptionBar}
        onToggleCaption={() => setShowCaptionBar(!showCaptionBar)}
        onOpenGlossary={() => router.push("/glossary")}
      />

      <LabInfoModal popup={popup} onClose={() => setPopup(null)} molecule={molecule} />
    </div>
  );
}

export function LabClient({ molecule }: { molecule: Molecule }) {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-background"><Spinner className="h-8 w-8 animate-spin" /></div>}>
      <LabInner molecule={molecule} />
    </Suspense>
  );
}
