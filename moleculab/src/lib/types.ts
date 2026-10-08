import { z } from "zod";

/* ================= Unsur (Tabel Periodik) ================= */

export const ElementCategorySchema = z.enum([
  "alkali",
  "alkaline-earth",
  "metalloid",
  "nonmetal",
  "halogen",
  "noble-gas",
  "post-transition-metal",
  "transition-metal",
  "other",
]);
export type ElementCategory = z.infer<typeof ElementCategorySchema>;

export const ElementDataSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  atomicNumber: z.number().int().positive(),
  group: z.number().int().min(1).max(18),
  period: z.number().int().min(1).max(7),
  valenceElectrons: z.number().int().min(0).max(8),
  category: ElementCategorySchema,
  electronegativity: z.number().optional(),
  simpleExplanation: z.string(),
  whyItBonds: z.string().optional(),
  funFact: z.string().optional(),
  usedInApp: z.boolean(),
});
export type ElementData = z.infer<typeof ElementDataSchema>;

/* ================= Molekul ================= */

export const BondTypeSchema = z.enum(["single", "double", "triple"]);
export type BondType = z.infer<typeof BondTypeSchema>;

export const BOND_ORDER: Record<BondType, number> = {
  single: 1,
  double: 2,
  triple: 3,
};

export const BOND_LABEL: Record<BondType, string> = {
  single: "tunggal",
  double: "rangkap dua",
  triple: "rangkap tiga",
};

export const LigandBondSchema = z.object({
  symbol: z.string(),
  bondType: BondTypeSchema,
  /** PEB pada atom ligan ini (akurasi Lewis; TIDAK memengaruhi VSEPR) */
  lonePairsOnLigand: z.number().int().min(0).max(4),
});
export type LigandBond = z.infer<typeof LigandBondSchema>;

export const MoleculeSchema = z.object({
  formula: z.string(),
  name: z.string(),
  centralAtom: z.string(),
  ligands: z.array(LigandBondSchema).min(2),
  /** jumlah DOMAIN ikatan di atom pusat (ikatan rangkap = 1 domain) */
  bondingPairs: z.number().int().min(1).max(6),
  /** PEB pada atom pusat */
  lonePairs: z.number().int().min(0).max(3),
  stericNumber: z.number().int().min(2).max(6),
  electronGeometry: z.string(),
  molecularGeometry: z.string(),
  bondAngle: z.string(),
  vseprType: z.string(),
  polarity: z.enum(["polar", "nonpolar"]),
  difficultyLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  realWorldExample: z.string().optional(),
  simpleAnalogy: z.string().optional(),
  resonanceNote: z.string().optional(),
  category: z.string().optional(),
});
export type Molecule = z.infer<typeof MoleculeSchema>;

/* ================= Glosarium ================= */

export interface GlossaryTerm {
  id: string;
  term: string;
  /** definisi mode bahasa sederhana */
  simple: string;
  /** definisi mode teknis */
  technical: string;
}

/* ================= Popup di dalam Lab ================= */

export type LabPopup =
  | { kind: "atom"; symbol: string }
  | { kind: "electron"; ownerSymbol: string; valence: number }
  | { kind: "pair"; pairKind: "PEI" | "PEB"; bondOrder?: number; ownerSymbol?: string; bondSymbols?: [string, string] }
  | { kind: "bond"; bondType: BondType; symbols: [string, string] }
  | { kind: "term"; termId: string };
