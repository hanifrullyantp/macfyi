import { Molecule, MoleculeSchema } from "@/lib/types";

/**
 * 25 molekul dengan struktur Lewis akurat (aturan oktet / perluasan oktet).
 * Elektron valensi TIDAK disimpan di sini — selalu lookup dari
 * periodic-table.ts berdasarkan simbol atom.
 */

const RAW: Molecule[] = [
  // ============ GRUP AX2 — Linear — difficulty 1 ============
  {
    formula: "CO2", name: "Karbon Dioksida", centralAtom: "C",
    ligands: [
      { symbol: "O", bondType: "double", lonePairsOnLigand: 2 },
      { symbol: "O", bondType: "double", lonePairsOnLigand: 2 },
    ],
    bondingPairs: 2, lonePairs: 0, stericNumber: 2,
    electronGeometry: "Linear", molecularGeometry: "Linear",
    bondAngle: "180°", vseprType: "AX2", polarity: "nonpolar", difficultyLevel: 1,
    category: "Gas Rumah Kaca",
    realWorldExample: "Gas yang kamu embuskan saat bernapas dan yang 'dimakan' tumbuhan saat fotosintesis.",
    simpleAnalogy: "Seperti dua anak menarik tali dengan kekuatan sama persis dari dua arah berlawanan — tali lurus sempurna.",
  },
  {
    formula: "BeCl2", name: "Berilium Klorida", centralAtom: "Be",
    ligands: [
      { symbol: "Cl", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "Cl", bondType: "single", lonePairsOnLigand: 3 },
    ],
    bondingPairs: 2, lonePairs: 0, stericNumber: 2,
    electronGeometry: "Linear", molecularGeometry: "Linear",
    bondAngle: "180°", vseprType: "AX2", polarity: "nonpolar", difficultyLevel: 1,
    category: "Pengecualian Oktet",
    realWorldExample: "Senyawa reaktif yang dipakai sebagai katalis dalam industri kimia.",
    simpleAnalogy: "Berilium itu santai — tidak wajib punya 8 elektron, cukup 4 saja sudah stabil dengan 2 ikatan lurus.",
  },
  {
    formula: "BeF2", name: "Berilium Fluorida", centralAtom: "Be",
    ligands: [
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
    ],
    bondingPairs: 2, lonePairs: 0, stericNumber: 2,
    electronGeometry: "Linear", molecularGeometry: "Linear",
    bondAngle: "180°", vseprType: "AX2", polarity: "nonpolar", difficultyLevel: 1,
    category: "Pengecualian Oktet",
    realWorldExample: "Dipakai dalam pengolahan bahan bakar reaktor nuklir jenis molten-salt.",
    simpleAnalogy: "Sama seperti BeCl₂, dua fluorin duduk di sisi berlawanan agar sejauh mungkin satu sama lain.",
  },

  // ============ GRUP AX3 — Trigonal Planar — difficulty 1 ============
  {
    formula: "BF3", name: "Boron Trifluorida", centralAtom: "B",
    ligands: [
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
    ],
    bondingPairs: 3, lonePairs: 0, stericNumber: 3,
    electronGeometry: "Trigonal Planar", molecularGeometry: "Trigonal Planar",
    bondAngle: "120°", vseprType: "AX3", polarity: "nonpolar", difficultyLevel: 1,
    category: "Oktet Tidak Lengkap",
    realWorldExample: "Katalis penting di laboratorium kimia organik.",
    simpleAnalogy: "Tiga kipas angin diletakkan di satu meja bundar — posisi paling adil adalah segitiga sama sisi.",
  },
  {
    formula: "BCl3", name: "Boron Triklorida", centralAtom: "B",
    ligands: [
      { symbol: "Cl", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "Cl", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "Cl", bondType: "single", lonePairsOnLigand: 3 },
    ],
    bondingPairs: 3, lonePairs: 0, stericNumber: 3,
    electronGeometry: "Trigonal Planar", molecularGeometry: "Trigonal Planar",
    bondAngle: "120°", vseprType: "AX3", polarity: "nonpolar", difficultyLevel: 1,
    category: "Oktet Tidak Lengkap",
    realWorldExample: "Bahan baku pembuatan serat boron untuk bahan komposit ringan.",
    simpleAnalogy: "Seperti jangkar tiga kaki — tiga klorin menyebar rata membentuk segitiga datar.",
  },
  {
    formula: "SO3", name: "Belerang Trioksida", centralAtom: "S",
    ligands: [
      { symbol: "O", bondType: "double", lonePairsOnLigand: 2 },
      { symbol: "O", bondType: "double", lonePairsOnLigand: 2 },
      { symbol: "O", bondType: "double", lonePairsOnLigand: 2 },
    ],
    bondingPairs: 3, lonePairs: 0, stericNumber: 3,
    electronGeometry: "Trigonal Planar", molecularGeometry: "Trigonal Planar",
    bondAngle: "120°", vseprType: "AX3", polarity: "nonpolar", difficultyLevel: 1,
    category: "Oksida Asam",
    resonanceNote: "Struktur disederhanakan — SO₃ sebenarnya memiliki resonansi; ketiga ikatan S–O setara.",
    realWorldExample: "Bahan antara pembuatan asam sulfat, asam terpenting di industri dunia.",
    simpleAnalogy: "Tiga oksigen memeluk belerang dari tiga arah segitiga — semua mendapat jatah ruang sama besar.",
  },
  {
    formula: "AlCl3", name: "Aluminium Klorida", centralAtom: "Al",
    ligands: [
      { symbol: "Cl", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "Cl", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "Cl", bondType: "single", lonePairsOnLigand: 3 },
    ],
    bondingPairs: 3, lonePairs: 0, stericNumber: 3,
    electronGeometry: "Trigonal Planar", molecularGeometry: "Trigonal Planar",
    bondAngle: "120°", vseprType: "AX3", polarity: "nonpolar", difficultyLevel: 1,
    category: "Oktet Tidak Lengkap",
    realWorldExample: "Bahan aktif pada deodoran antiperspiran.",
    simpleAnalogy: "Aluminium meniru boron: tiga ikatan datar membentuk segitiga, tanpa pasangan bebas di pusat.",
  },

  // ============ GRUP AX4 — Tetrahedral — difficulty 1 ============
  {
    formula: "CH4", name: "Metana", centralAtom: "C",
    ligands: [
      { symbol: "H", bondType: "single", lonePairsOnLigand: 0 },
      { symbol: "H", bondType: "single", lonePairsOnLigand: 0 },
      { symbol: "H", bondType: "single", lonePairsOnLigand: 0 },
      { symbol: "H", bondType: "single", lonePairsOnLigand: 0 },
    ],
    bondingPairs: 4, lonePairs: 0, stericNumber: 4,
    electronGeometry: "Tetrahedral", molecularGeometry: "Tetrahedral",
    bondAngle: "109,5°", vseprType: "AX4", polarity: "nonpolar", difficultyLevel: 1,
    category: "Hidrokarbon",
    realWorldExample: "Gas alam untuk memasak di kompor rumahmu.",
    simpleAnalogy: "Seperti balon berkaki empat simetris sempurna — sudut 109,5° adalah posisi paling longgar di ruang 3D.",
  },
  {
    formula: "CCl4", name: "Karbon Tetraklorida", centralAtom: "C",
    ligands: [
      { symbol: "Cl", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "Cl", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "Cl", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "Cl", bondType: "single", lonePairsOnLigand: 3 },
    ],
    bondingPairs: 4, lonePairs: 0, stericNumber: 4,
    electronGeometry: "Tetrahedral", molecularGeometry: "Tetrahedral",
    bondAngle: "109,5°", vseprType: "AX4", polarity: "nonpolar", difficultyLevel: 1,
    category: "Pelarut",
    realWorldExample: "Dulu dipakai sebagai pelarut dry-cleaning (kini dibatasi karena beracun).",
    simpleAnalogy: "Metana yang keempat hidrogennya diganti klorin besar — bentuknya tetap tetrahedral sempurna.",
  },
  {
    formula: "SiCl4", name: "Silikon Tetraklorida", centralAtom: "Si",
    ligands: [
      { symbol: "Cl", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "Cl", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "Cl", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "Cl", bondType: "single", lonePairsOnLigand: 3 },
    ],
    bondingPairs: 4, lonePairs: 0, stericNumber: 4,
    electronGeometry: "Tetrahedral", molecularGeometry: "Tetrahedral",
    bondAngle: "109,5°", vseprType: "AX4", polarity: "nonpolar", difficultyLevel: 1,
    category: "Bahan Semikonduktor",
    realWorldExample: "Bahan antara pemurnian silikon ultra-murni untuk chip komputer.",
    simpleAnalogy: "Kembaran CCl₄ satu periode ke bawah — silikon duduk di tengah tetrahedron empat klorin.",
  },
  {
    formula: "SiH4", name: "Silana", centralAtom: "Si",
    ligands: [
      { symbol: "H", bondType: "single", lonePairsOnLigand: 0 },
      { symbol: "H", bondType: "single", lonePairsOnLigand: 0 },
      { symbol: "H", bondType: "single", lonePairsOnLigand: 0 },
      { symbol: "H", bondType: "single", lonePairsOnLigand: 0 },
    ],
    bondingPairs: 4, lonePairs: 0, stericNumber: 4,
    electronGeometry: "Tetrahedral", molecularGeometry: "Tetrahedral",
    bondAngle: "109,5°", vseprType: "AX4", polarity: "nonpolar", difficultyLevel: 1,
    category: "Bahan Solar",
    realWorldExample: "Gas yang dipakai untuk melapisi panel surya film tipis.",
    simpleAnalogy: "Seperti metana, tapi pusatnya silikon — tetap tetrahedral karena 4 domain merata.",
  },

  // ============ GRUP AX3E1 — Trigonal Piramidal — difficulty 2 ============
  {
    formula: "NH3", name: "Amonia", centralAtom: "N",
    ligands: [
      { symbol: "H", bondType: "single", lonePairsOnLigand: 0 },
      { symbol: "H", bondType: "single", lonePairsOnLigand: 0 },
      { symbol: "H", bondType: "single", lonePairsOnLigand: 0 },
    ],
    bondingPairs: 3, lonePairs: 1, stericNumber: 4,
    electronGeometry: "Tetrahedral", molecularGeometry: "Trigonal Piramidal",
    bondAngle: "≈107°", vseprType: "AX3E1", polarity: "polar", difficultyLevel: 2,
    category: "Basa Lemah",
    realWorldExample: "Bahan pupuk dan cairan pembersih kaca berbau menyengat.",
    simpleAnalogy: "Seperti payung: satu pasangan elektron bebas jadi 'tangkai' di atas, tiga hidrogen jadi 'tepi payung' di bawah.",
  },
  {
    formula: "PH3", name: "Fosfina", centralAtom: "P",
    ligands: [
      { symbol: "H", bondType: "single", lonePairsOnLigand: 0 },
      { symbol: "H", bondType: "single", lonePairsOnLigand: 0 },
      { symbol: "H", bondType: "single", lonePairsOnLigand: 0 },
    ],
    bondingPairs: 3, lonePairs: 1, stericNumber: 4,
    electronGeometry: "Tetrahedral", molecularGeometry: "Trigonal Piramidal",
    bondAngle: "≈93,6°", vseprType: "AX3E1", polarity: "polar", difficultyLevel: 2,
    category: "Gas Beracun",
    realWorldExample: "Gas fumigan untuk mengawetkan gabah di gudang beras.",
    simpleAnalogy: "Amonia versi fosfor — pasangan bebasnya bahkan 'lebih serakah' sehingga sudutnya lebih kecil.",
  },
  {
    formula: "NF3", name: "Nitrogen Trifluorida", centralAtom: "N",
    ligands: [
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
    ],
    bondingPairs: 3, lonePairs: 1, stericNumber: 4,
    electronGeometry: "Tetrahedral", molecularGeometry: "Trigonal Piramidal",
    bondAngle: "≈102,4°", vseprType: "AX3E1", polarity: "polar", difficultyLevel: 2,
    category: "Gas Industri",
    realWorldExample: "Gas pembersih ruang produksi layar sentuh (clean-etch chamber).",
    simpleAnalogy: "Tiga fluorin rakus menarik elektron ikatan menjauh dari N, sehingga sudutnya menyempit.",
  },

  // ============ GRUP AX2E2 — Bengkok (V) — difficulty 2 ============
  {
    formula: "H2O", name: "Air", centralAtom: "O",
    ligands: [
      { symbol: "H", bondType: "single", lonePairsOnLigand: 0 },
      { symbol: "H", bondType: "single", lonePairsOnLigand: 0 },
    ],
    bondingPairs: 2, lonePairs: 2, stericNumber: 4,
    electronGeometry: "Tetrahedral", molecularGeometry: "Bengkok (V)",
    bondAngle: "104,5°", vseprType: "AX2E2", polarity: "polar", difficultyLevel: 2,
    category: "Pelarut Universal",
    realWorldExample: "Ya, ini air — molekul yang membuat bumi bisa ditinggali makhluk hidup.",
    simpleAnalogy: "Dua pasangan elektron bebas bertingkah seperti dua tangan tak terlihat yang menekan kedua hidrogen ke bawah.",
  },
  {
    formula: "H2S", name: "Hidrogen Sulfida", centralAtom: "S",
    ligands: [
      { symbol: "H", bondType: "single", lonePairsOnLigand: 0 },
      { symbol: "H", bondType: "single", lonePairsOnLigand: 0 },
    ],
    bondingPairs: 2, lonePairs: 2, stericNumber: 4,
    electronGeometry: "Tetrahedral", molecularGeometry: "Bengkok (V)",
    bondAngle: "≈92,1°", vseprType: "AX2E2", polarity: "polar", difficultyLevel: 2,
    category: "Gas Beracun",
    realWorldExample: "Gas 'bau telur busuk' yang keluar dari kawah gunung berapi.",
    simpleAnalogy: "Air versi belerang — dua PEB menekan lebih kuat sehingga sudutnya lebih sempit dari air.",
  },
  {
    formula: "OF2", name: "Oksigen Difluorida", centralAtom: "O",
    ligands: [
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
    ],
    bondingPairs: 2, lonePairs: 2, stericNumber: 4,
    electronGeometry: "Tetrahedral", molecularGeometry: "Bengkok (V)",
    bondAngle: "≈103,1°", vseprType: "AX2E2", polarity: "polar", difficultyLevel: 2,
    category: "Oksidator Kuat",
    realWorldExample: "Oksidator roket yang sangat reaktif.",
    simpleAnalogy: "Air dengan hidrogen diganti fluorin — tetap huruf V karena dua PEB di oksigen.",
  },

  // ============ GRUP AX2E1 — Bengkok (V) steric 3 — difficulty 2 ============
  {
    formula: "SO2", name: "Belerang Dioksida", centralAtom: "S",
    ligands: [
      { symbol: "O", bondType: "double", lonePairsOnLigand: 2 },
      { symbol: "O", bondType: "double", lonePairsOnLigand: 2 },
    ],
    bondingPairs: 2, lonePairs: 1, stericNumber: 3,
    electronGeometry: "Trigonal Planar", molecularGeometry: "Bengkok (V)",
    bondAngle: "≈119°", vseprType: "AX2E1", polarity: "polar", difficultyLevel: 2,
    category: "Polutan Udara",
    resonanceNote: "SO₂ beresonansi — salah satu O pada struktur sebenarnya berikatan tunggal dengan muatan formal; di sini disederhanakan sebagai dua ikatan rangkap.",
    realWorldExample: "Gas penyebab hujan asam dari letusan gunung dan pembakaran batu bara.",
    simpleAnalogy: "Satu PEB menyita tempat duduk ketiga di 'meja segitiga', sehingga dua oksigen terdorong membentuk huruf V.",
  },
  {
    formula: "O3", name: "Ozon", centralAtom: "O",
    ligands: [
      { symbol: "O", bondType: "double", lonePairsOnLigand: 2 },
      { symbol: "O", bondType: "single", lonePairsOnLigand: 3 },
    ],
    bondingPairs: 2, lonePairs: 1, stericNumber: 3,
    electronGeometry: "Trigonal Planar", molecularGeometry: "Bengkok (V)",
    bondAngle: "≈116,8°", vseprType: "AX2E1", polarity: "polar", difficultyLevel: 2,
    category: "Pelindung Bumi",
    resonanceNote: "Ozon beresonansi — kedua ikatan O–O sebenarnya identik (panjangnya di antara tunggal dan rangkap).",
    realWorldExample: "Lapisan ozon di stratosfer menyerap sinar UV berbahaya dari matahari.",
    simpleAnalogy: "Tiga oksigen berbaris dengan satu PEB di tengah — lintasannya melengkung seperti boomerang.",
  },

  // ============ STERIC 5 — difficulty 3 ============
  {
    formula: "PCl5", name: "Fosfor Pentaklorida", centralAtom: "P",
    ligands: [
      { symbol: "Cl", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "Cl", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "Cl", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "Cl", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "Cl", bondType: "single", lonePairsOnLigand: 3 },
    ],
    bondingPairs: 5, lonePairs: 0, stericNumber: 5,
    electronGeometry: "Trigonal Bipiramidal", molecularGeometry: "Trigonal Bipiramidal",
    bondAngle: "90° & 120°", vseprType: "AX5", polarity: "nonpolar", difficultyLevel: 3,
    category: "Perluasan Oktet",
    realWorldExample: "Reagen pengklorinasi di laboratorium sintesis.",
    simpleAnalogy: "Tiga klorin duduk di 'khatulistiwa' dan dua di 'kutub' — dua jenis sudut sekaligus dalam satu molekul.",
  },
  {
    formula: "SF4", name: "Belerang Tetrafluorida", centralAtom: "S",
    ligands: [
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
    ],
    bondingPairs: 4, lonePairs: 1, stericNumber: 5,
    electronGeometry: "Trigonal Bipiramidal", molecularGeometry: "Jungkat-jungkit (Seesaw)",
    bondAngle: "≈101,6° & ≈173,1°", vseprType: "AX4E1", polarity: "polar", difficultyLevel: 3,
    category: "Perluasan Oktet",
    realWorldExample: "Reagen untuk memasukkan atom F ke molekul obat.",
    simpleAnalogy: "Pasangan bebas mengambil kursi khatulistiwa, sisanya jadi papan jungkat-jungkit miring.",
  },
  {
    formula: "ClF3", name: "Klorin Trifluorida", centralAtom: "Cl",
    ligands: [
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
    ],
    bondingPairs: 3, lonePairs: 2, stericNumber: 5,
    electronGeometry: "Trigonal Bipiramidal", molecularGeometry: "Bentuk T",
    bondAngle: "≈87,5°", vseprType: "AX3E2", polarity: "polar", difficultyLevel: 3,
    category: "Perluasan Oktet",
    realWorldExample: "Oksidator roket yang sangat agresif — bisa membakar beton basah!",
    simpleAnalogy: "Dua PEB duduk di khatulistiwa dan mendorong tiga fluorin membentuk huruf T sempurna.",
  },
  {
    formula: "XeF2", name: "Xenon Difluorida", centralAtom: "Xe",
    ligands: [
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
    ],
    bondingPairs: 2, lonePairs: 3, stericNumber: 5,
    electronGeometry: "Trigonal Bipiramidal", molecularGeometry: "Linear",
    bondAngle: "180°", vseprType: "AX2E3", polarity: "nonpolar", difficultyLevel: 3,
    category: "Senyawa Gas Mulia",
    realWorldExample: "Bahan etsa presisi untuk memahat chip MEMS berukuran mikro.",
    simpleAnalogy: "Tiga PEB berebut semua kursi khatulistiwa, dua fluorin terpental ke kutub — hasilnya garis lurus.",
  },

  // ============ STERIC 6 — difficulty 3 ============
  {
    formula: "SF6", name: "Belerang Heksafluorida", centralAtom: "S",
    ligands: [
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
    ],
    bondingPairs: 6, lonePairs: 0, stericNumber: 6,
    electronGeometry: "Oktahedral", molecularGeometry: "Oktahedral",
    bondAngle: "90°", vseprType: "AX6", polarity: "nonpolar", difficultyLevel: 3,
    category: "Gas Isolasi",
    realWorldExample: "Gas isolator pada gardu listrik tegangan tinggi.",
    simpleAnalogy: "Enam fluorin jaga jarak paling adil — ke enam arah mata angin, semua sudut tepat 90°.",
  },
  {
    formula: "XeF4", name: "Xenon Tetrafluorida", centralAtom: "Xe",
    ligands: [
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
      { symbol: "F", bondType: "single", lonePairsOnLigand: 3 },
    ],
    bondingPairs: 4, lonePairs: 2, stericNumber: 6,
    electronGeometry: "Oktahedral", molecularGeometry: "Segiempat Planar",
    bondAngle: "90°", vseprType: "AX4E2", polarity: "nonpolar", difficultyLevel: 3,
    category: "Senyawa Gas Mulia",
    realWorldExample: "Senyawa gas mulia pertama yang pernah disintesis manusia (1962).",
    simpleAnalogy: "Dua PEB kabur ke kutub atas dan bawah berjauhan, empat fluorin membentuk bujur sangkar datar.",
  },
];

export const MOLECULES: Molecule[] = RAW.map((m) => MoleculeSchema.parse(m));

const BY_FORMULA = new Map(MOLECULES.map((m) => [m.formula.toUpperCase(), m]));

export function getMolecule(formula: string): Molecule | undefined {
  if (!formula) return undefined;
  
  // Normalisasi input: Huruf besar, hapus spasi, 
  // dan tangani kasus typo umum (I besar vs L kecil pada Chlorine)
  let normalized = formula.toUpperCase().trim();
  
  // Jika user mengetik CIF3 (Iodine) padahal yang dimaksud CLF3 (Chlorine)
  if (normalized === "CIF3") normalized = "CLF3";
  
  return BY_FORMULA.get(normalized);
}

export function moleculesUsingElement(symbol: string): Molecule[] {
  return MOLECULES.filter(
    (m) => m.centralAtom === symbol || m.ligands.some((l) => l.symbol === symbol),
  );
}

export const DIFFICULTY_LABEL: Record<Molecule["difficultyLevel"], string> = {
  1: "Dasar",
  2: "Menengah",
  3: "Mahir",
};
