import { BOND_ORDER, Molecule } from "@/lib/types";
import { getElement } from "@/data/periodic-table";

/**
 * lewisStructureEngine — fungsi murni yang menerima data Molecule
 * (+ lookup tabel periodik) dan mengembalikan rencana lengkap tahap
 * struktur Lewis: semua titik elektron, pengelompokan pasangan,
 * serta assignment PEI vs PEB (termasuk ikatan rangkap).
 *
 * PRINSIP: jumlah titik per atom SELALU sama dengan elektron valensi
 * atom tersebut hasil lookup periodic-table (2×PEB + orde ikatan).
 */

export type DotOwner = "central" | number; // number = indeks ligan

export interface LewisDot {
  id: string;
  owner: DotOwner;
  ownerSymbol: string;
  role: "lone" | "bond";
  /** untuk role=bond: indeks ligan tujuan */
  bondIndex: number | null;
  /** untuk role=bond: slot PEI ke- berapa pada ikatan tsb (0..k-1) */
  peiSlot: number | null;
  /** mengelompokkan dot yang berpasangan di stage 3 */
  pairId: string | null;
  /** urutan dot di sekitar atom pemilik (stage 2 orbit) */
  orbitIndex: number;
}

export interface LewisOutline {
  id: string;
  kind: "PEI" | "PEB";
  label: string;
  bondIndex?: number;
  slot?: number;
  slotCount?: number;
  owner?: DotOwner;
  ownerSymbol?: string;
}

export interface LewisPlan {
  dots: LewisDot[];
  outlines: LewisOutline[];
  /** jumlah dot per owner (untuk verifikasi / narasi) */
  dotCountByOwner: { owner: DotOwner; symbol: string; count: number; valence: number }[];
  peiCount: number;
  pebCentral: number;
  pebLigandTotal: number;
}

export function buildLewisPlan(mol: Molecule): LewisPlan {
  const dots: LewisDot[] = [];
  const outlines: LewisOutline[] = [];
  let peiNum = 0;
  let pebNum = 0;

  // ---- Atom pusat ----
  const centralBondDots: LewisDot[] = [];
  mol.ligands.forEach((lig, bi) => {
    const k = BOND_ORDER[lig.bondType];
    for (let s = 0; s < k; s++) {
      centralBondDots.push({
        id: `c-b${bi}-${s}`,
        owner: "central",
        ownerSymbol: mol.centralAtom,
        role: "bond",
        bondIndex: bi,
        peiSlot: s,
        pairId: `c-bp-${bi}`,
        orbitIndex: -1,
      });
    }
  });
  // kelompokkan dot ikatan pusat menjadi pasangan visual (2 per pasangan)
  const centralPairs: string[] = [];
  for (let i = 0; i < centralBondDots.length; i += 2) {
    centralPairs.push(`c-vis-pair-${i / 2}`);
  }
  centralBondDots.forEach((d, i) => {
    d.pairId = `c-vis-pair-${Math.floor(i / 2)}`;
    dots.push(d);
  });
  for (let p = 0; p < mol.lonePairs; p++) {
    pebNum++;
    const pairId = `peb-c-${p}`;
    outlines.push({
      id: pairId, kind: "PEB", label: `PEB-${pebNum}`,
      owner: "central", ownerSymbol: mol.centralAtom,
    });
    for (let j = 0; j < 2; j++) {
      dots.push({
        id: `${pairId}-${j}`, owner: "central", ownerSymbol: mol.centralAtom,
        role: "lone", bondIndex: null, peiSlot: null, pairId, orbitIndex: -1,
      });
    }
  }

  // ---- Outline PEI per ikatan ----
  mol.ligands.forEach((lig, bi) => {
    const k = BOND_ORDER[lig.bondType];
    for (let s = 0; s < k; s++) {
      peiNum++;
      outlines.push({
        id: `pei-${bi}-${s}`, kind: "PEI", label: `PEI-${peiNum}`,
        bondIndex: bi, slot: s, slotCount: k,
      });
    }
  });

  // ---- Ligan ----
  mol.ligands.forEach((lig, bi) => {
    const k = BOND_ORDER[lig.bondType];
    const ligDots: LewisDot[] = [];
    for (let s = 0; s < k; s++) {
      ligDots.push({
        id: `l${bi}-b-${s}`, owner: bi, ownerSymbol: lig.symbol,
        role: "bond", bondIndex: bi, peiSlot: s,
        pairId: `l${bi}-vis-pair`, orbitIndex: -1,
      });
    }
    // pasangan visual dot ikatan ligan
    ligDots.forEach((d, i) => {
      d.pairId = `l${bi}-vis-pair-${Math.floor(i / 2)}`;
      dots.push(d);
    });
    for (let p = 0; p < lig.lonePairsOnLigand; p++) {
      pebNum++;
      const pairId = `peb-l${bi}-${p}`;
      outlines.push({
        id: pairId, kind: "PEB", label: `PEB-${pebNum}`,
        owner: bi, ownerSymbol: lig.symbol,
      });
      for (let j = 0; j < 2; j++) {
        dots.push({
          id: `${pairId}-${j}`, owner: bi, ownerSymbol: lig.symbol,
          role: "lone", bondIndex: null, peiSlot: null, pairId, orbitIndex: -1,
        });
      }
    }
  });

  // ---- orbitIndex per owner ----
  const groups = new Map<string, LewisDot[]>();
  dots.forEach((d) => {
    const key = d.owner === "central" ? "c" : `l${d.owner}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  });
  const dotCountByOwner: LewisPlan["dotCountByOwner"] = [];
  const pushOwner = (owner: DotOwner, key: string, symbol: string) => {
    const arr = groups.get(key) ?? [];
    const valence = getElement(symbol).valenceElectrons ?? 0;
    arr.forEach((d, i) => (d.orbitIndex = i));
    dotCountByOwner.push({ owner, symbol, count: arr.length, valence });
  };
  pushOwner("central", "c", mol.centralAtom);
  mol.ligands.forEach((lig, bi) => pushOwner(bi, `l${bi}`, lig.symbol));

  const pebCentral = mol.lonePairs;
  const pebLigandTotal = mol.ligands.reduce((a, l) => a + l.lonePairsOnLigand, 0);
  return { dots, outlines, dotCountByOwner, peiCount: peiNum, pebCentral, pebLigandTotal };
}

/** Ringkasan unsur unik pada molekul (untuk narasi & mini tabel periodik). */
export function uniqueAtomSummary(mol: Molecule): { symbol: string; count: number; role: "central" | "ligand" }[] {
  const out: { symbol: string; count: number; role: "central" | "ligand" }[] = [
    { symbol: mol.centralAtom, count: 1, role: "central" },
  ];
  const ligMap = new Map<string, number>();
  mol.ligands.forEach((l) => ligMap.set(l.symbol, (ligMap.get(l.symbol) ?? 0) + 1));
  ligMap.forEach((count, symbol) => out.push({ symbol, count, role: "ligand" }));
  return out;
}
