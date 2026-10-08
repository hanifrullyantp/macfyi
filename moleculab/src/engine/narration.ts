import { BOND_ORDER, BOND_LABEL, Molecule } from "@/lib/types";
import { getElement } from "@/data/periodic-table";
import { groupLabel, formatFormula } from "@/lib/utils";
import { buildLewisPlan, uniqueAtomSummary } from "./lewis";

/**
 * narrationEngine — teks narasi DINAMIS untuk 10 stage × 2 mode bahasa
 * (sederhana / teknis), dibangun dari data molekul + lookup tabel periodik.
 */

export type LangMode = "simple" | "technical";

const NUM_ID = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan"];
function num(n: number) {
  return NUM_ID[n] ?? String(n);
}

/** Rumus kimia yang enak dibacakan TTS: H2O -> "H dua O" */
export function spokenFormula(formula: string) {
  return formula.replace(/([0-9])/g, (d) => " " + num(Number(d))).replace(/([A-Z])/g, "$1 ").replace(/\s+/g, " ").trim();
}

function ligandParts(mol: Molecule, mode: LangMode): string {
  const summary = uniqueAtomSummary(mol).filter((a) => a.role === "ligand");
  return summary
    .map((a) => {
      const el = getElement(a.symbol);
      const word = mode === "simple" ? "elektron terluar" : "elektron valensi";
      return `${el.name} (${a.symbol}) di golongan ${groupLabel(el.group)} dengan ${num(el.valenceElectrons)} ${word}`;
    })
    .join("; ");
}

function bondDescriptor(mol: Molecule): string {
  const kinds = new Set(mol.ligands.map((l) => l.bondType));
  if (kinds.size === 1) {
    const k = [...kinds][0];
    return k === "single"
      ? "ikatan tunggal"
      : `ikatan ${BOND_LABEL[k]} (${BOND_ORDER[k]} pasangan elektron di setiap sisinya)`;
  }
  return "ikatan campuran tunggal dan rangkap";
}

export function getNarration(stageId: string, mol: Molecule, mode: LangMode): string {
  const central = getElement(mol.centralAtom);
  const plan = buildLewisPlan(mol);
  const name = mol.name;
  const formulaSpoken = spokenFormula(mol.formula);
  const simple = mode === "simple";

  switch (stageId) {
    case "periodic-table": {
      const lig = ligandParts(mol, mode);
      const ve = simple ? "elektron terluar" : "elektron valensi";
      const base = `Mari kenali atom-atom penyusun ${name}, ${formulaSpoken}. Atom pusatnya, ${central.name} (${mol.centralAtom}), berada di golongan ${groupLabel(central.group)}, yang berarti punya ${num(central.valenceElectrons)} ${ve}. Sedangkan ${lig}.`;
      const extra = simple
        ? " Klik atomnya kalau mau tahu lebih banyak. Siap? Ayo kita mulai!"
        : " Elektron valensi inilah yang menentukan bagaimana atom-atom ini berikatan.";
      return base + extra;
    }

    case "valence-electrons": {
      const counts = plan.dotCountByOwner
        .filter((d, i, arr) => d.owner === "central" || arr.findIndex((x) => x.symbol === d.symbol) === i)
        .map((d) => `${d.symbol} membawa ${num(d.count)} titik`)
        .join(", dan setiap ");
      const base = `Perhatikan titik-titik yang muncul mengelilingi setiap atom — itulah elektron valensinya. ${plan.dotCountByOwner[0].symbol === mol.centralAtom ? "" : ""}${counts}.`;
      const extra = simple
        ? " Titik berisi solid adalah milik atom pusat, titik bercincin milik atom ligan. Ingat: warna hanya menandai ASAL elektron, bukan jenis elektron yang berbeda."
        : " Representasi ini mengikuti konfigurasi elektron kulit terluar masing-masing unsur.";
      return base + extra;
    }

    case "electron-pairing": {
      const ligLone = mol.ligands[0];
      const base = `Elektron-elektron itu sekarang saling mendekat dan berpasangan dua-dua — elektron jauh lebih stabil saat berpasangan.`;
      const detail = ligLone
        ? ` Setiap ${ligLone.symbol} menyisakan ${num(ligLone.lonePairsOnLigand)} pasangan untuk dirinya sendiri, sementara ${mol.centralAtom} ${mol.lonePairs > 0 ? `menyisakan ${num(mol.lonePairs)} pasangan bebas dan ` : ""}menyiapkan elektronnya untuk berikatan.`
        : "";
      return simple
        ? base + detail
        : base + " Pemasangan ini mengikuti prinsip pengisian orbital menuju konfigurasi stabil." + detail;
    }

    case "identify-pei-peb": {
      const hasMulti = mol.ligands.some((l) => BOND_ORDER[l.bondType] > 1);
      const multi = hasMulti
        ? ` Karena ${name} punya ${bondDescriptor(mol)}, kamu bisa melihat lebih dari satu pasangan PEI berdampingan di sisi yang sama.`
        : "";
      const centralLp = mol.lonePairs > 0
        ? ` Atom pusat ${mol.centralAtom} sendiri punya ${num(mol.lonePairs)} PEB — ingat baik-baik, nanti ia sangat menentukan bentuk molekul.`
        : ` Atom pusat ${mol.centralAtom} tidak punya PEB — semua pasangannya dipakai berikatan.`;
      const base = `Ini momen kuncinya. Pasangan yang bergerak ke tengah, di antara dua atom, dan dilingkari garis hijau disebut PEI, pasangan elektron ikatan — dipakai bersama. Pasangan yang tetap tinggal di satu atom, dilingkari garis oranye, disebut PEB, pasangan elektron bebas — milik sendiri.`;
      return base + multi + centralLp;
    }

    case "lewis-transition": {
      const base = `Perhatikan baik-baik: setiap pasangan PEI menyusut dan berubah menjadi garis ikatan. Satu garis mewakili satu pasangan elektron yang dipakai bersama. PEB tetap digambar sebagai pasangan titik di dekat atomnya.`;
      const close = simple
        ? ` Inilah Struktur Lewis ${name} — peta elektron lengkap molekulnya.`
        : ` Inilah struktur Lewis ${name} sesuai konvensi notasi Lewis.`;
      return base + close;
    }

    case "domain-repulsion": {
      const base = `Sekarang fokus hanya ke atom pusat, ${mol.centralAtom}. PEB milik atom ligan kita redupkan, karena menurut teori VSEPR, yang menentukan bentuk molekul hanyalah domain elektron di sekitar atom pusat.`;
      const action = ` Ada ${num(mol.stericNumber)} domain di sana, dan semuanya bermuatan negatif — mereka saling tolak-menolak, bergerak mencari posisi yang paling berjauhan. Lihat!`;
      return base + action;
    }

    case "stable-geometry": {
      return `Stabil! ${num(mol.stericNumber)} domain sudah saling berjauhan maksimal. Bilangan sterik ${name} adalah ${num(mol.stericNumber)}, yaitu ${num(mol.bondingPairs)} domain ikatan ${mol.lonePairs > 0 ? `ditambah ${num(mol.lonePairs)} pasangan elektron bebas` : "tanpa pasangan bebas"}. Kerangka ini membentuk geometri elektron ${mol.electronGeometry}.`;
    }

    case "lone-pair-effect": {
      const ideal = mol.stericNumber === 3 ? "120 derajat"
        : mol.stericNumber === 4 ? "109,5 derajat"
        : mol.stericNumber === 5 ? "sudut ideal bipiramidal" : "90 derajat";
      return `Tapi ada satu hal penting: pasangan elektron bebas itu lebih rakus tempat daripada pasangan ikatan, karena hanya dipegang oleh satu atom. Ia menolak lebih kuat, sehingga sudut ikatan menyempit dari ${ideal} menjadi sekitar ${mol.bondAngle.replace("°", " derajat")}. Inilah efek PEB terhadap bentuk molekul.`;
    }

    case "molecular-shape-3d": {
      return `Sekarang, bayangkan pasangan bebasnya tidak terlihat — yang tersisa hanya atom-atomnya. Bentuk molekul ${name} adalah ${mol.molecularGeometry}, dengan sudut ikatan sekitar ${mol.bondAngle.replace("°", " derajat")}. Silakan putar dan jelajahi molekulnya sesukamu!`;
    }

    case "conclusion": {
      return `Jadi, ${name}, dengan rumus ${formatFormula(mol.formula)}, memiliki atom pusat ${central.name} dengan ${num(mol.bondingPairs)} pasangan elektron ikatan dan ${num(mol.lonePairs)} pasangan elektron bebas, menghasilkan bentuk molekul ${mol.molecularGeometry} dengan sudut ikatan sekitar ${mol.bondAngle.replace("°", " derajat")}. Hebat — kamu sudah menempuh seluruh proses dari elektron valensi sampai bentuk molekul!`;
    }

    default:
      return "";
  }
}
