import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Ubah digit dalam rumus kimia jadi subscript unicode: H2O -> H₂O */
const SUBS: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
};
export function formatFormula(formula: string) {
  return formula.replace(/[0-9]/g, (d) => SUBS[d] ?? d);
}

/** Label golongan utama gaya SMA Indonesia: 1->IA, 13->IIIA, dst. */
export function groupLabel(group: number): string {
  const map: Record<number, string> = {
    1: "IA", 2: "IIA", 13: "IIIA", 14: "IVA", 15: "VA",
    16: "VIA", 17: "VIIA", 18: "VIIIA",
  };
  return map[group] ?? `Grup ${group}`;
}

/** Notasi AXE dengan subscript: AX2E2 -> AX₂E₂ */
export function formatAXE(vseprType: string) {
  return formatFormula(vseprType);
}

/** Ambil angka sudut pertama dari string seperti "≈104,5°" -> 104.5 */
export function parseAngle(bondAngle: string): number | null {
  const m = bondAngle.replace(",", ".").match(/([0-9]+(?:\.[0-9]+)?)/);
  return m ? parseFloat(m[1]) : null;
}

/** RNG deterministik dari string (untuk scatter posisi stabil per molekul) */
export function seededRandom(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function plural(n: number, singular: string, pluralForm?: string) {
  return n === 1 ? singular : (pluralForm ?? singular);
}

export function scrollToTop() {
  if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
}
