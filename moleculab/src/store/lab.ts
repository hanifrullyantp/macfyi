"use client";

import { create } from "zustand";
import { Molecule } from "@/lib/types";

/* ============ Definisi state machine 10-stage ============ */

export type StageId =
  | "periodic-table"
  | "valence-electrons"
  | "electron-pairing"
  | "identify-pei-peb"
  | "lewis-transition"
  | "domain-repulsion"
  | "stable-geometry"
  | "lone-pair-effect"
  | "molecular-shape-3d"
  | "conclusion";

export interface StageDef {
  id: StageId;
  group: string;
  title: string;
}

export const STAGES: StageDef[] = [
  { id: "periodic-table", group: "Kenali Atom", title: "Atom Penyusun & Golongannya" },
  { id: "valence-electrons", group: "Elektron Valensi", title: "Elektron Valensi Muncul" },
  { id: "electron-pairing", group: "Struktur Lewis", title: "Elektron Berpasangan" },
  { id: "identify-pei-peb", group: "Struktur Lewis", title: "Identifikasi PEI & PEB" },
  { id: "lewis-transition", group: "Struktur Lewis", title: "Garis Ikatan Terbentuk" },
  { id: "domain-repulsion", group: "VSEPR", title: "Tolakan Antar Domain Elektron" },
  { id: "stable-geometry", group: "VSEPR", title: "Geometri Elektron Stabil" },
  { id: "lone-pair-effect", group: "VSEPR", title: "Efek Pasangan Bebas (PEB)" },
  { id: "molecular-shape-3d", group: "Geometri 3D", title: "Bentuk Molekul 3D" },
  { id: "conclusion", group: "Kesimpulan", title: "Panel Kesimpulan" },
];

export const STAGE_GROUPS = [
  "Kenali Atom",
  "Elektron Valensi",
  "Struktur Lewis",
  "VSEPR",
  "Geometri 3D",
  "Kesimpulan",
] as const;

/** Stage 'lone-pair-effect' otomatis di-skip bila atom pusat tanpa PEB. */
export function stageSequence(mol: Molecule): StageDef[] {
  return STAGES.filter((s) => !(s.id === "lone-pair-effect" && mol.lonePairs === 0));
}

/* ============ Store ============ */

export type ViewMode = "ball-stick" | "spacefill";

interface LabState {
  stageIndex: number;
  playing: boolean;
  showLigandElectrons: boolean;
  hideLonePairs: boolean;
  showAngles: boolean;
  autoRotate: boolean;
  viewMode: ViewMode;
  resetToken: number;

  setStage: (i: number, seqLength: number) => void;
  next: (seqLength: number) => void;
  prev: () => void;
  reset: () => void;
  setPlaying: (p: boolean) => void;
  toggle: (key: "showLigandElectrons" | "hideLonePairs" | "showAngles" | "autoRotate") => void;
  setViewMode: (m: ViewMode) => void;
}

export const useLabStore = create<LabState>()((set) => ({
  stageIndex: 0,
  playing: false,
  showLigandElectrons: true,
  hideLonePairs: true,
  showAngles: true,
  autoRotate: true,
  viewMode: "ball-stick",
  resetToken: 0,

  setStage: (i, seqLength) =>
    set({ stageIndex: Math.max(0, Math.min(seqLength - 1, i)) }),
  next: (seqLength) =>
    set((s) => ({ stageIndex: Math.min(seqLength - 1, s.stageIndex + 1) })),
  prev: () => set((s) => ({ stageIndex: Math.max(0, s.stageIndex - 1) })),
  reset: () =>
    set((s) => ({
      stageIndex: 0,
      playing: false,
      showLigandElectrons: true,
      resetToken: s.resetToken + 1,
    })),
  setPlaying: (p) => set({ playing: p }),
  toggle: (key) => set((s) => ({ [key]: !s[key] }) as Partial<LabState>),
  setViewMode: (m) => set({ viewMode: m }),
}));
