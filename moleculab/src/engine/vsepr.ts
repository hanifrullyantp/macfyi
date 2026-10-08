import { Quaternion, Vector3 } from "three";

/**
 * Engine geometri VSEPR murni (pure functions) — generik untuk
 * bilangan sterik 2–6. Baru dipakai mulai Stage 6 (domain-repulsion);
 * tahap Lewis memakai lewis.ts.
 */

function v3(x: number, y: number, z: number) {
  return new Vector3(x, y, z);
}

/** Slot domain ideal per bilangan sterik (belum dipisah ikatan vs bebas). */
function slots(steric: number): Vector3[] {
  switch (steric) {
    case 2:
      return [v3(1, 0, 0), v3(-1, 0, 0)];
    case 3: {
      // bidang XZ (datar) — trigonal planar
      const out: Vector3[] = [];
      for (let i = 0; i < 3; i++) {
        const a = Math.PI / 2 + (i * 2 * Math.PI) / 3;
        out.push(v3(Math.cos(a), 0, Math.sin(a)));
      }
      return out;
    }
    case 4: {
      const t = [
        v3(1, 1, 1), v3(1, -1, -1), v3(-1, 1, -1), v3(-1, -1, 1),
      ].map((d) => d.normalize());
      // orientasikan supaya slot pertama menghadap ke atas (estetika)
      const q = new Quaternion().setFromUnitVectors(t[0].clone(), v3(0, 1, 0));
      return t.map((d) => d.clone().applyQuaternion(q));
    }
    case 5: {
      // urutan: 3 ekuatorial (bidang XZ), 2 aksial (±Y)
      const eq: Vector3[] = [];
      for (let i = 0; i < 3; i++) {
        const a = (i * 2 * Math.PI) / 3;
        eq.push(v3(Math.cos(a), 0, Math.sin(a)));
      }
      return [eq[0], eq[1], eq[2], v3(0, 1, 0), v3(0, -1, 0)];
    }
    case 6:
    default:
      return [
        v3(1, 0, 0), v3(-1, 0, 0), v3(0, 0, 1), v3(0, 0, -1),
        v3(0, 1, 0), v3(0, -1, 0),
      ];
  }
}

/**
 * Penempatan PEB sesuai aturan VSEPR:
 * - sterik 3 & 4: PEB mengambil slot mana saja (kongruen) — ambil dari ekor.
 * - sterik 5: PEB SELALU di posisi ekuatorial (tolakan minimal).
 * - sterik 6: PEB pertama aksial, PEB kedua trans (berseberangan).
 */
export function assignDomains(steric: number, lonePairs: number): {
  bond: Vector3[];
  lone: Vector3[];
} {
  const s = slots(steric).map((d) => d.clone());
  const lone: Vector3[] = [];
  if (steric === 5) {
    // slot ekuatorial = indeks 0..2; ambil dari belakang barisan ekuatorial
    const eqOrder = [2, 1, 0];
    for (let i = 0; i < lonePairs; i++) lone.push(s[eqOrder[i]].clone());
    const loneSet = new Set(eqOrder.slice(0, lonePairs));
    const bond = s.filter((_, idx) => idx >= 3 || !loneSet.has(idx));
    return { bond, lone };
  }
  if (steric === 6) {
    // slot aksial = indeks 4 (up) & 5 (down)
    if (lonePairs >= 1) lone.push(s[4].clone());
    if (lonePairs >= 2) lone.push(s[5].clone());
    const bond = s.slice(0, 6 - lonePairs);
    return { bond, lone };
  }
  // sterik 2–4: PEB dari ekor slot
  for (let i = 0; i < lonePairs; i++) lone.push(s[s.length - 1 - i].clone());
  const bond = s.slice(0, s.length - lonePairs);
  return { bond, lone };
}

/** Posisi awal tersebar merata (fibonacci sphere) untuk koreografi tolakan. */
export function fibonacciSphere(n: number): Vector3[] {
  if (n <= 1) return [v3(0, 0.65, 0.75).normalize()];
  const pts: Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts.push(v3(Math.cos(theta) * r, y, Math.sin(theta) * r));
  }
  return pts;
}

interface VSEPRRow {
  type: string;
  electron: string;
  molecular: string;
}

const TABLE: Record<number, Record<number, VSEPRRow>> = {
  2: { 0: { type: "AX2", electron: "Linear", molecular: "Linear" } },
  3: {
    0: { type: "AX3", electron: "Trigonal Planar", molecular: "Trigonal Planar" },
    1: { type: "AX2E1", electron: "Trigonal Planar", molecular: "Bengkok (V)" },
  },
  4: {
    0: { type: "AX4", electron: "Tetrahedral", molecular: "Tetrahedral" },
    1: { type: "AX3E1", electron: "Tetrahedral", molecular: "Trigonal Piramidal" },
    2: { type: "AX2E2", electron: "Tetrahedral", molecular: "Bengkok (V)" },
  },
  5: {
    0: { type: "AX5", electron: "Trigonal Bipiramidal", molecular: "Trigonal Bipiramidal" },
    1: { type: "AX4E1", electron: "Trigonal Bipiramidal", molecular: "Jungkat-jungkit (Seesaw)" },
    2: { type: "AX3E2", electron: "Trigonal Bipiramidal", molecular: "Bentuk T" },
    3: { type: "AX2E3", electron: "Trigonal Bipiramidal", molecular: "Linear" },
  },
  6: {
    0: { type: "AX6", electron: "Oktahedral", molecular: "Oktahedral" },
    1: { type: "AX5E1", electron: "Oktahedral", molecular: "Piramida Segiempat" },
    2: { type: "AX4E2", electron: "Oktahedral", molecular: "Segiempat Planar" },
  },
};

export function classifyVSEPR(bonding: number, lone: number): VSEPRRow | null {
  return TABLE[bonding + lone]?.[lone] ?? null;
}

/** Pilihan geometri molekuler untuk soal prediksi (distraktor). */
export const GEOMETRY_POOL = [
  "Linear", "Bengkok (V)", "Trigonal Planar", "Trigonal Piramidal",
  "Tetrahedral", "Jungkat-jungkit (Seesaw)", "Bentuk T",
  "Trigonal Bipiramidal", "Oktahedral", "Segiempat Planar",
];
