"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui";

interface TourStep {
  targetId: string;
  title: string;
  desc: string;
  position: "top" | "bottom" | "center";
}

const STEPS: TourStep[] = [
  {
    targetId: "molecule-canvas",
    title: "Simulasi 3D",
    desc: "Seret untuk memutar molekul, cubit/scroll untuk zoom. Ketuk atom untuk melihat detailnya.",
    position: "center"
  },
  {
    targetId: "play-button",
    title: "Putar Simulasi",
    desc: "Tekan tombol putar untuk memulai animasi pembentukan molekul dan narasi suara otomatis.",
    position: "top"
  },
  {
    targetId: "more-settings",
    title: "Pengaturan Lanjutan",
    desc: "Sesuaikan laju suara, mode tampilan, atau tampilkan sudut ikatan di sini.",
    position: "top"
  },
  {
    targetId: "caption-bar",
    title: "Penjelasan Lengkap",
    desc: "Ketuk baris ini untuk membaca deskripsi mendalam tentang apa yang terjadi di setiap tahap.",
    position: "top"
  }
];

export function OnboardingTour() {
  const [active, setActive] = useState<number | null>(null);
  
  useEffect(() => {
    const seen = localStorage.getItem("vsepr-onboarding-seen");
    if (!seen) {
      setTimeout(() => setActive(0), 2000);
    }
  }, []);

  const handleFinish = () => {
    localStorage.setItem("vsepr-onboarding-seen", "true");
    setActive(null);
  };

  const handleNext = () => {
    if (active === null) return;
    if (active < STEPS.length - 1) setActive(active + 1);
    else handleFinish();
  };

  if (active === null) return null;

  const step = STEPS[active];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-sm rounded-[2rem] border border-white/20 bg-surface p-8 shadow-2xl"
      >
        <button onClick={handleFinish} className="absolute right-4 top-4 p-2 text-muted hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
        
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Tutorial {active + 1}/{STEPS.length}</span>
        </div>
        
        <h3 className="font-display text-2xl font-bold">{step.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted">{step.desc}</p>
        
        <div className="mt-8 flex gap-3">
          <button onClick={handleFinish} className="text-xs font-bold text-muted hover:text-foreground">Lewati</button>
          <Button onClick={handleNext} className="flex-1 rounded-2xl">
            {active === STEPS.length - 1 ? "Mulai Belajar" : "Lanjut"} 
            {active === STEPS.length - 1 ? <Check className="ml-2 h-4 w-4" /> : <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
