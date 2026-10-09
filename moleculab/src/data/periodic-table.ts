import { ElementData, ElementDataSchema } from "@/lib/types";

/**
 * Dataset Tabel Periodik Lengkap (118 Unsur).
 * Berisi data akurat untuk semua unsur kimia dari Hidrogen (1) hingga Oganeson (118).
 */

const GROUP_LABELS: Record<number, string> = {
  1: "IA", 2: "IIA", 3: "IIIB", 4: "IVB", 5: "VB", 6: "VIB", 7: "VIIB",
  8: "VIIIB", 9: "VIIIB", 10: "VIIIB", 11: "IB", 12: "IIB",
  13: "IIIA", 14: "IVA", 15: "VA", 16: "VIA", 17: "VIIA", 18: "VIIIA"
};

const USED_SYMBOLS = new Set([
  "H", "He", "Be", "B", "C", "N", "O", "F", "Ne", "Al", "Si", "P", "S", "Cl", "Xe"
]);

type RawElement = [
  symbol: string, name: string, z: number, g: number, p: number, 
  cat: ElementData["category"], en: number | null, 
  simple: string, why?: string, fun?: string
];

const RAW: RawElement[] = [
  ["H", "Hidrogen", 1, 1, 1, "nonmetal", 2.20, "Unsur paling ringan dan melimpah di alam semesta.", "Hanya butuh 1 elektron lagi (duplet).", "Bahan bakar utama bintang."],
  ["He", "Helium", 2, 18, 1, "noble-gas", null, "Gas mulia teringan, sangat stabil.", "Sudah memiliki konfigurasi penuh.", "Membuat balon terbang dan suara cempreng."],
  ["Li", "Litium", 3, 1, 2, "alkali", 0.98, "Logam alkali paling ringan.", "Melepas 1 elektron valensinya.", "Digunakan sebagai bahan utama baterai."],
  ["Be", "Berilium", 4, 2, 2, "alkaline-earth", 1.57, "Logam alkali tanah yang kuat.", "Membentuk 2 ikatan kovalen (pengecualian oktet).", "Dipakai pada jendela tabung sinar-X."],
  ["B", "Boron", 5, 13, 2, "metalloid", 2.04, "Metaloid keras, penyusun kaca Pyrex.", "Membentuk 3 ikatan (oktet tak lengkap).", "Digunakan dalam deterjen dan pestisida."],
  ["C", "Karbon", 6, 14, 2, "nonmetal", 2.55, "Raja senyawa organik, dasar kehidupan.", "Membentuk 4 ikatan kovalen.", "Berlian dan grafit sama-sama dari karbon."],
  ["N", "Nitrogen", 7, 15, 2, "nonmetal", 3.04, "Penyusun utama udara (78%).", "Biasanya membentuk 3 ikatan dan 1 PEB.", "Nitrogen cair sangat dingin (-196°C)."],
  ["O", "Oksigen", 8, 16, 2, "nonmetal", 3.44, "Zat yang diperlukan untuk pernapasan.", "Membentuk 2 ikatan dan 2 PEB.", "Oksigen cair berwarna biru pucat."],
  ["F", "Fluorin", 9, 17, 2, "halogen", 3.98, "Unsur paling elektronegatif dan reaktif.", "Selalu membentuk 1 ikatan dan 3 PEB.", "Fluorida memperkuat email gigi."],
  ["Ne", "Neon", 10, 18, 2, "noble-gas", null, "Gas mulia penghasil cahaya merah-oranye.", "Stabil dengan 8 elektron valensi.", "Digunakan untuk lampu neon iklan."],
  ["Na", "Natrium", 11, 1, 3, "alkali", 0.93, "Logam alkali yang sangat reaktif.", "Melepas 1 elektron menjadi Na+.", "Garam dapur adalah Natrium Klorida."],
  ["Mg", "Magnesium", 12, 2, 3, "alkaline-earth", 1.31, "Logam ringan yang terbakar terang.", "Melepas 2 elektron menjadi Mg2+.", "Terdapat di pusat molekul klorofil."],
  ["Al", "Aluminium", 13, 13, 3, "post-transition-metal", 1.61, "Logam melimpah, ringan, tahan karat.", "Membentuk 3 ikatan (seperti boron).", "Digunakan untuk bungkus cokelat/foil."],
  ["Si", "Silikon", 14, 14, 3, "metalloid", 1.90, "Dasar teknologi chip komputer.", "Membentuk 4 ikatan (seperti karbon).", "Penyusun utama pasir dan kaca."],
  ["P", "Fosfor", 15, 15, 3, "nonmetal", 2.19, "Penting untuk DNA dan tulang.", "Bisa membentuk 3 atau 5 ikatan (perluasan).", "Fosfor putih menyala di kegelapan."],
  ["S", "Belerang", 16, 16, 3, "nonmetal", 2.58, "Padatan kuning dari gunung berapi.", "Membentuk 2, 4, atau 6 ikatan.", "H2S berbau seperti telur busuk."],
  ["Cl", "Klorin", 17, 17, 3, "halogen", 3.16, "Gas hijau kekuningan beracun.", "Biasanya membentuk 1 ikatan dan 3 PEB.", "Digunakan untuk desinfektan kolam renang."],
  ["Ar", "Argon", 18, 18, 3, "noble-gas", null, "Gas mulia paling banyak di udara.", "Sangat stabil, tidak beraksi.", "Digunakan di dalam bola lampu pijar."],
  ["K", "Kalium", 19, 1, 4, "alkali", 0.82, "Logam alkali esensial bagi saraf.", "Melepas 1 elektron menjadi K+.", "Pisang adalah sumber kalium yang baik."],
  ["Ca", "Kalsium", 20, 2, 4, "alkaline-earth", 1.00, "Unsur utama pembentuk tulang/gigi.", "Melepas 2 elektron menjadi Ca2+.", "Terdapat pada susu dan kapur tulis."],
  ["Sc", "Skandium", 21, 3, 4, "transition-metal", 1.36, "Logam transisi ringan.", undefined, undefined],
  ["Ti", "Titanium", 22, 4, 4, "transition-metal", 1.54, "Logam kuat sekuat baja namun ringan.", undefined, undefined],
  ["V", "Vanadium", 23, 5, 4, "transition-metal", 1.63, "Digunakan untuk paduan baja.", undefined, undefined],
  ["Cr", "Kromium", 24, 6, 4, "transition-metal", 1.66, "Memberi kilau pada krom kendaraan.", undefined, undefined],
  ["Mn", "Mangan", 25, 7, 4, "transition-metal", 1.55, "Penting dalam industri besi/baja.", undefined, undefined],
  ["Fe", "Besi", 26, 8, 4, "transition-metal", 1.83, "Logam paling penting dalam industri.", undefined, undefined],
  ["Co", "Kobalt", 27, 9, 4, "transition-metal", 1.88, "Digunakan dalam baterai dan magnet.", undefined, undefined],
  ["Ni", "Nikel", 28, 10, 4, "transition-metal", 1.91, "Digunakan untuk lapisan anti-karat.", undefined, undefined],
  ["Cu", "Tembaga", 29, 11, 4, "transition-metal", 1.90, "Konduktor listrik yang sangat baik.", undefined, undefined],
  ["Zn", "Seng", 30, 12, 4, "transition-metal", 1.65, "Melindungi besi lewat proses galvanisasi.", undefined, undefined],
  ["Ga", "Galium", 31, 13, 4, "post-transition-metal", 1.81, "Meleleh di tangan (titik lebur rendah).", undefined, undefined],
  ["Ge", "Germanium", 32, 14, 4, "metalloid", 2.01, "Semikonduktor penting.", undefined, undefined],
  ["As", "Arsen", 33, 15, 4, "metalloid", 2.18, "Dikenal sebagai racun mematikan.", undefined, undefined],
  ["Se", "Selenium", 34, 16, 4, "nonmetal", 2.55, "Digunakan dalam sel fotolistrik.", undefined, undefined],
  ["Br", "Bromin", 35, 17, 4, "halogen", 2.96, "Satu-satunya nonlogam berwujud cair.", undefined, undefined],
  ["Kr", "Kripton", 36, 18, 4, "noble-gas", 3.00, "Digunakan dalam lampu kilat kamera.", undefined, undefined],
  ["Rb", "Rubidium", 37, 1, 5, "alkali", 0.82, "Logam sangat reaktif.", undefined, undefined],
  ["Sr", "Stronsium", 38, 2, 5, "alkaline-earth", 0.95, "Memberi warna merah kembang api.", undefined, undefined],
  ["Y", "Itrium", 39, 3, 5, "transition-metal", 1.22, "Digunakan dalam laser dan TV tabung.", undefined, undefined],
  ["Zr", "Zirkonium", 40, 4, 5, "transition-metal", 1.33, "Sangat tahan korosi.", undefined, undefined],
  ["Nb", "Niobium", 41, 5, 5, "transition-metal", 1.60, "Digunakan dalam mesin jet.", undefined, undefined],
  ["Mo", "Molibden", 42, 6, 5, "transition-metal", 2.16, "Meningkatkan kekuatan baja.", undefined, undefined],
  ["Tc", "Teknesium", 43, 7, 5, "transition-metal", 1.90, "Unsur buatan pertama.", undefined, undefined],
  ["Ru", "Rutenium", 44, 8, 5, "transition-metal", 2.20, "Sangat keras, katalis hebat.", undefined, undefined],
  ["Rh", "Rodium", 45, 9, 5, "transition-metal", 2.28, "Logam sangat langka dan berharga.", undefined, undefined],
  ["Pd", "Paladium", 46, 10, 5, "transition-metal", 2.20, "Menyerap hidrogen dalam jumlah besar.", undefined, undefined],
  ["Ag", "Perak", 47, 11, 5, "transition-metal", 1.93, "Logam dengan konduktivitas tertinggi.", undefined, undefined],
  ["Cd", "Kadmium", 48, 12, 5, "transition-metal", 1.69, "Digunakan dalam baterai Ni-Cd.", undefined, undefined],
  ["In", "Indium", 49, 13, 5, "post-transition-metal", 1.78, "Digunakan dalam layar sentuh.", undefined, undefined],
  ["Sn", "Timah", 50, 14, 5, "post-transition-metal", 1.96, "Bahan pembuat kaleng makanan.", undefined, undefined],
  ["Sb", "Antimon", 51, 15, 5, "metalloid", 2.05, "Digunakan dalam bahan tahan api.", undefined, undefined],
  ["Te", "Telurium", 52, 16, 5, "metalloid", 2.10, "Membantu daya tahan logam.", undefined, undefined],
  ["I", "Iodin", 53, 17, 5, "halogen", 2.66, "Padatan ungu, penting untuk tiroid.", undefined, undefined],
  ["Xe", "Xenon", 54, 18, 5, "noble-gas", 2.60, "Gas mulia yang bisa berikatan (XeF2).", "Kulit elektron besar, tarikan inti lemah.", "Dipakai untuk lampu depan mobil xenon."],
  ["Cs", "Sesium", 55, 1, 6, "alkali", 0.79, "Logam paling lunak.", undefined, undefined],
  ["Ba", "Barium", 56, 2, 6, "alkaline-earth", 0.89, "Bahan kontras pemeriksaan medis.", undefined, undefined],
  ["La", "Lantanum", 57, 3, 6, "lanthanide", 1.10, "Awal deret lantanida.", undefined, undefined],
  ["Ce", "Serium", 58, 3, 6, "lanthanide", 1.12, "Lantanida paling melimpah.", undefined, undefined],
  ["Pr", "Praseodimium", 59, 3, 6, "lanthanide", 1.13, "Memberi warna kuning pada kaca.", undefined, undefined],
  ["Nd", "Neodimium", 60, 3, 6, "lanthanide", 1.14, "Magnet permanen terkuat.", undefined, undefined],
  ["Pm", "Prometium", 61, 3, 6, "lanthanide", 1.13, "Radioaktif, bercahaya di gelap.", undefined, undefined],
  ["Sm", "Samarium", 62, 3, 6, "lanthanide", 1.17, "Tahan suhu tinggi.", undefined, undefined],
  ["Eu", "Europium", 63, 3, 6, "lanthanide", 1.20, "Logam paling reaktif di deretnya.", undefined, undefined],
  ["Gd", "Gadolinium", 64, 3, 6, "lanthanide", 1.20, "Digunakan dalam MRI.", undefined, undefined],
  ["Tb", "Terbium", 65, 3, 6, "lanthanide", 1.20, "Digunakan dalam lampu fluoresen.", undefined, undefined],
  ["Dy", "Disprosium", 66, 3, 6, "lanthanide", 1.22, "Penyerap neutron tinggi.", undefined, undefined],
  ["Ho", "Holmium", 67, 3, 6, "lanthanide", 1.23, "Kekuatan magnet tertinggi.", undefined, undefined],
  ["Er", "Erbium", 68, 3, 6, "lanthanide", 1.24, "Pewarna merah jambu keramik.", undefined, undefined],
  ["Tm", "Tulium", 69, 3, 6, "lanthanide", 1.25, "Lantanida paling langka.", undefined, undefined],
  ["Yb", "Iterbium", 70, 3, 6, "lanthanide", 1.10, "Meningkatkan sifat baja.", undefined, undefined],
  ["Lu", "Lutesium", 71, 3, 6, "lanthanide", 1.27, "Terakhir di deret lantanida.", undefined, undefined],
  ["Hf", "Hafnium", 72, 4, 6, "transition-metal", 1.30, "Sangat baik menyerap neutron.", undefined, undefined],
  ["Ta", "Tantalum", 73, 5, 6, "transition-metal", 1.50, "Kapasitor elektronik miniatur.", undefined, undefined],
  ["W", "Wolfram", 74, 6, 6, "transition-metal", 2.36, "Titik lebur logam tertinggi.", undefined, undefined],
  ["Re", "Renium", 75, 7, 6, "transition-metal", 1.90, "Sangat tahan aus.", undefined, undefined],
  ["Os", "Osmium", 76, 8, 6, "transition-metal", 2.20, "Zat paling padat di bumi.", undefined, undefined],
  ["Ir", "Iridium", 77, 9, 6, "transition-metal", 2.20, "Paling tahan korosi.", undefined, undefined],
  ["Pt", "Platina", 78, 10, 6, "transition-metal", 2.28, "Sangat berharga, katalis emisi mobil.", undefined, undefined],
  ["Au", "Emas", 79, 11, 6, "transition-metal", 2.54, "Logam mulia tidak bereaksi.", undefined, undefined],
  ["Hg", "Raksa", 80, 12, 6, "transition-metal", 2.00, "Satu-satunya logam cair suhu ruang.", undefined, undefined],
  ["Tl", "Talium", 81, 13, 6, "post-transition-metal", 1.62, "Sangat beracun.", undefined, undefined],
  ["Pb", "Timbal", 82, 14, 6, "post-transition-metal", 2.33, "Logam berat, pelindung radiasi.", undefined, undefined],
  ["Bi", "Bismut", 83, 15, 6, "post-transition-metal", 2.02, "Kristal berwarna-warni.", undefined, undefined],
  ["Po", "Polonium", 84, 16, 6, "metalloid", 2.00, "Sangat radioaktif.", undefined, undefined],
  ["At", "Astatin", 85, 17, 6, "metalloid", 2.20, "Unsur alami paling langka.", undefined, undefined],
  ["Rn", "Radon", 86, 18, 6, "noble-gas", 2.20, "Gas mulia radioaktif.", undefined, undefined],
  ["Fr", "Fransium", 87, 1, 7, "alkali", 0.70, "Logam alkali sangat radioaktif.", undefined, undefined],
  ["Ra", "Radium", 88, 2, 7, "alkaline-earth", 0.90, "Dulu digunakan untuk cat bercahaya.", undefined, undefined],
  ["Ac", "Aktinium", 89, 3, 7, "actinide", 1.10, "Awal deret aktinida.", undefined, undefined],
  ["Th", "Torium", 90, 3, 7, "actinide", 1.30, "Bahan bakar nuklir potensial.", undefined, undefined],
  ["Pa", "Protaktinium", 91, 3, 7, "actinide", 1.50, "Hasil peluruhan Uranium.", undefined, undefined],
  ["U", "Uranium", 92, 3, 7, "actinide", 1.38, "Bahan utama reaktor nuklir.", undefined, undefined],
  ["Np", "Neptunium", 93, 3, 7, "actinide", 1.36, "Unsur transuranium pertama.", undefined, undefined],
  ["Pu", "Plutonium", 94, 3, 7, "actinide", 1.28, "Bahan bakar bom atom.", undefined, undefined],
  ["Am", "Amerisium", 95, 3, 7, "actinide", 1.13, "Digunakan dalam detektor asap.", undefined, undefined],
  ["Cm", "Kurium", 96, 3, 7, "actinide", 1.28, "Radioaktif tinggi.", undefined, undefined],
  ["Bk", "Berkelium", 97, 3, 7, "actinide", 1.30, "Sangat jarang.", undefined, undefined],
  ["Cf", "Kalifornium", 98, 3, 7, "actinide", 1.30, "Sumber neutron kuat.", undefined, undefined],
  ["Es", "Einsteinium", 99, 3, 7, "actinide", 1.30, "Dinamai dari Einstein.", undefined, undefined],
  ["Fm", "Fermium", 100, 3, 7, "actinide", 1.30, "Terbentuk dari ledakan bom hidrogen.", undefined, undefined],
  ["Md", "Mendelevium", 101, 3, 7, "actinide", 1.30, "Dinamai dari pencetus tabel periodik.", undefined, undefined],
  ["No", "Nobelium", 102, 3, 7, "actinide", 1.30, "Dinamai dari Alfred Nobel.", undefined, undefined],
  ["Lr", "Lawrensium", 103, 3, 7, "actinide", 1.30, "Terakhir di deret aktinida.", undefined, undefined],
  ["Rf", "Raterfordium", 104, 4, 7, "transition-metal", null, "Unsur superberat buatan.", undefined, undefined],
  ["Db", "Dubnium", 105, 5, 7, "transition-metal", null, "Sangat tidak stabil.", undefined, undefined],
  ["Sg", "Seaborgium", 106, 6, 7, "transition-metal", null, "Dinamai dari Glenn Seaborg.", undefined, undefined],
  ["Bh", "Bohrium", 107, 7, 7, "transition-metal", null, "Dinamai dari Niels Bohr.", undefined, undefined],
  ["Hs", "Hasium", 108, 8, 7, "transition-metal", null, "Dinamai dari negara bagian Hesse.", undefined, undefined],
  ["Mt", "Meitnerium", 109, 9, 7, "transition-metal", null, "Dinamai dari Lise Meitner.", undefined, undefined],
  ["Ds", "Darmstadtium", 110, 10, 7, "transition-metal", null, "Dinamai dari kota Darmstadt.", undefined, undefined],
  ["Rg", "Roentgenium", 111, 11, 7, "transition-metal", null, "Dinamai dari penemu Sinar-X.", undefined, undefined],
  ["Cn", "Kopernisium", 112, 12, 7, "transition-metal", null, "Dinamai dari Nicolaus Copernicus.", undefined, undefined],
  ["Nh", "Nihonium", 113, 13, 7, "post-transition-metal", null, "Unsur pertama yang ditemukan di Asia.", undefined, undefined],
  ["Fl", "Flerovium", 114, 14, 7, "post-transition-metal", null, "Dinamai dari Georgy Flyorov.", undefined, undefined],
  ["Mc", "Moskovium", 115, 15, 7, "post-transition-metal", null, "Dinamai dari kota Moskow.", undefined, undefined],
  ["Lv", "Livermorium", 116, 16, 7, "post-transition-metal", null, "Dinamai dari Lab Lawrence Livermore.", undefined, undefined],
  ["Ts", "Tenesin", 117, 17, 7, "halogen", null, "Dinamai dari Tennessee.", undefined, undefined],
  ["Og", "Oganeson", 118, 18, 7, "noble-gas", null, "Unsur terakhir dalam tabel periodik.", undefined, undefined],
];

function getValence(symbol: string, group: number): number | undefined {
  if (symbol === "He") return 2;
  if (group >= 1 && group <= 2) return group;
  if (group >= 13 && group <= 18) return group - 10;
  return undefined;
}

export const ELEMENTS: ElementData[] = RAW.map((r) => {
  const z = r[2];
  const isLanthanide = z >= 57 && z <= 71;
  const isActinide = z >= 89 && z <= 103;
  return ElementDataSchema.parse({
    symbol: r[0],
    name: r[1],
    atomicNumber: z,
    group: r[3],
    groupLabel: GROUP_LABELS[r[3]] || `Grup ${r[3]}`,
    period: r[4],
    valenceElectrons: getValence(r[0], r[3]),
    category: r[5],
    electronegativity: r[6] ?? undefined,
    simpleExplanation: r[7],
    whyItBonds: r[8],
    funFact: r[9],
    usedInApp: USED_SYMBOLS.has(r[0]),
    isLanthanide,
    isActinide,
  });
});

const BY_SYMBOL = new Map(ELEMENTS.map((e) => [e.symbol, e]));

export function getElement(symbol: string): ElementData {
  const el = BY_SYMBOL.get(symbol);
  if (!el) throw new Error(`Unsur tidak dikenal: ${symbol}`);
  return el;
}

export function getValenceElectrons(symbol: string): number | undefined {
  return getElement(symbol).valenceElectrons;
}

export const CATEGORY_LABEL: Record<ElementData["category"], string> = {
  alkali: "Logam Alkali",
  "alkaline-earth": "Logam Alkali Tanah",
  metalloid: "Metaloid",
  nonmetal: "Nonlogam",
  halogen: "Halogen",
  "noble-gas": "Gas Mulia",
  "post-transition-metal": "Logam Pasca-Transisi",
  "transition-metal": "Logam Transisi",
  lanthanide: "Lantanida",
  actinide: "Aktinida",
  other: "Lainnya",
};

export const OUT_OF_SCOPE_NOTE =
  "Di luar cakupan materi VSEPR SMA — unsur golongan transisi dan deret dalam memiliki konfigurasi elektron yang lebih kompleks.";
