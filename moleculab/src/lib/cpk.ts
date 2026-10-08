/** Warna CPK-ish yang ramah kedua tema + radius tampilan atom. */

export interface AtomStyle {
  color: string;
  /** warna setengah ikatan sisi atom ini */
  radius: number;
}

const MAP: Record<string, AtomStyle> = {
  H: { color: "#e8edf5", radius: 0.3 },
  C: { color: "#5b6472", radius: 0.42 },
  N: { color: "#3b82f6", radius: 0.42 },
  O: { color: "#ef4444", radius: 0.42 },
  F: { color: "#34d399", radius: 0.4 },
  Cl: { color: "#10b981", radius: 0.52 },
  S: { color: "#eab308", radius: 0.55 },
  P: { color: "#f97316", radius: 0.55 },
  B: { color: "#f472b6", radius: 0.45 },
  Be: { color: "#c8b285", radius: 0.45 },
  Al: { color: "#9ca3af", radius: 0.55 },
  Si: { color: "#d4a373", radius: 0.55 },
  Xe: { color: "#22d3ee", radius: 0.62 },
  He: { color: "#fbcfe8", radius: 0.32 },
  Ne: { color: "#fda4af", radius: 0.36 },
};

export function atomStyle(symbol: string): AtomStyle {
  return MAP[symbol] ?? { color: "#a78bfa", radius: 0.45 };
}

export function bondLength(centralSymbol: string, ligandSymbol: string): number {
  const a = atomStyle(centralSymbol);
  const b = atomStyle(ligandSymbol);
  return Math.min(2.4, Math.max(1.55, a.radius + b.radius + 0.85));
}

/** Palet 3D yang sadar tema (dipakai canvas). */
export interface ScenePalette {
  electronCentral: string;
  electronLigand: string;
  pei: string;
  peb: string;
  force: string;
  lobe: string;
  text: string;
}

export function scenePalette(mode: "light" | "dark"): ScenePalette {
  return mode === "dark"
    ? {
        electronCentral: "#22d3ee",
        electronLigand: "#a78bfa",
        pei: "#4ade80",
        peb: "#facc15",
        force: "#fb923c",
        lobe: "#fde68a",
        text: "#f1f5f9",
      }
    : {
        electronCentral: "#0891b2",
        electronLigand: "#7c3aed",
        pei: "#16a34a",
        peb: "#d97706",
        force: "#ea580c",
        lobe: "#f59e0b",
        text: "#0f172a",
      };
}
