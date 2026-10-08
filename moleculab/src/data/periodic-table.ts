import { ElementData, ElementDataSchema } from "@/lib/types";

/**
 * Dataset tabel periodik — unsur golongan utama periode 1–5 (lengkap,
 * dengan penjelasan sederhana) + golongan transisi periode 4 (data dasar,
 * di luar cakupan materi VSEPR SMA).
 *
 * PRINSIP DATA: jumlah elektron valensi di SELURUH aplikasi selalu
 * di-lookup dari sini berdasarkan simbol — tidak pernah diduplikasi.
 */

type Raw = [
  symbol: string,
  name: string,
  z: number,
  group: number,
  period: number,
  category: ElementData["category"],
  en: number | null,
  usedInApp: boolean,
  simple: string,
  why?: string,
  fun?: string,
];

const RAW: Raw[] = [
  // ---------- Periode 1 ----------
  ["H", "Hidrogen", 1, 1, 1, "nonmetal", 2.2, true,
    "Unsur paling ringan dan paling banyak di alam semesta. Atomnya sangat kecil dan hanya punya 1 elektron.",
    "Hidrogen hanya butuh 1 elektron lagi agar kulitnya penuh (aturan duplet), jadi ia selalu membentuk tepat 1 ikatan kovalen.",
    "Hidrogen adalah bahan bakar bintang — matahari bersinar karena menggabungkan hidrogen menjadi helium."],
  ["He", "Helium", 2, 18, 1, "noble-gas", null, false,
    "Gas mulia paling ringan. Sudah stabil dengan 2 elektron sehingga hampir tidak pernah berikatan.",
    undefined,
    "Helium dipakai mengisi balon dan membuat suara menjadi cempreng saat dihirup sesaat."],

  // ---------- Periode 2 ----------
  ["Li", "Litium", 3, 1, 2, "alkali", 0.98, false,
    "Logam alkali yang sangat ringan dan reaktif terhadap air.",
    "Punya 1 elektron valensi yang mudah dilepas, sehingga cenderung membentuk ikatan ion (+1).",
    "Baterai ponselmu kemungkinan besar memakai litium."],
  ["Be", "Berilium", 4, 2, 2, "alkaline-earth", 1.57, true,
    "Logam ringan namun keras. Unik: dengan hanya 2 elektron valensi, Be puas tanpa harus mencapai oktet.",
    "Be memakai kedua elektronnya untuk 2 ikatan kovalen (pengecualian aturan oktet), seperti pada BeCl₂.",
    "Berilium dipakai pada jendela tabung sinar-X karena tembus radiasi."],
  ["B", "Boron", 5, 13, 2, "metalloid", 2.04, true,
    "Metaloid di perbatasan logam-nonlogam. Hanya punya 3 elektron valensi.",
    "Boron membentuk 3 ikatan dan tetap stabil walau hanya punya 6 elektron (oktet tidak lengkap), misalnya BF₃.",
    "Boron dipakai pada kaca tahan panas (pyrex) dan deterjen."],
  ["C", "Karbon", 6, 14, 2, "nonmetal", 2.55, true,
    "Raja senyawa! Hampir semua molekul makhluk hidup berisi karbon. Punya 4 elektron valensi.",
    "Karbon hampir selalu membentuk 4 ikatan (bisa tunggal, rangkap dua, atau rangkap tiga) untuk mencapai oktet.",
    "Berlian dan pensil sama-sama karbon murni — bedanya hanya susunan atomnya."],
  ["N", "Nitrogen", 7, 15, 2, "nonmetal", 3.04, true,
    "Gas yang mengisi 78% udara yang kamu hirup. Punya 5 elektron valensi.",
    "Nitrogen biasanya membentuk 3 ikatan dan menyisakan 1 pasangan elektron bebas, seperti pada NH₃.",
    "Nitrogen cair suhunya −196°C, dipakai untuk membuat es krim instan."],
  ["O", "Oksigen", 8, 16, 2, "nonmetal", 3.44, true,
    "Gas yang kamu butuhkan untuk bernapas. Punya 6 elektron valensi dan sangat elektronegatif.",
    "Oksigen membentuk 2 ikatan dan menyisakan 2 pasangan elektron bebas — inilah kunci bentuk bengkok molekul air.",
    "Oksigen cair berwarna biru pucat dan bersifat paramagnetik (menempel pada magnet)."],
  ["F", "Fluorin", 9, 17, 2, "halogen", 3.98, true,
    "Unsur paling reaktif dan paling elektronegatif di seluruh tabel periodik. Punya 7 elektron valensi.",
    "Fluorin hanya butuh 1 elektron untuk oktet, jadi selalu membentuk tepat 1 ikatan dan menyisakan 3 pasangan bebas.",
    "Fluorida dalam pasta gigi membantu menguatkan email gigi."],
  ["Ne", "Neon", 10, 18, 2, "noble-gas", null, false,
    "Gas mulia yang sangat stabil — elektron valensinya sudah penuh 8.",
    undefined,
    "Lampu 'neon' merah-oranye asli memakai gas neon sungguhan."],

  // ---------- Periode 3 ----------
  ["Na", "Natrium", 11, 1, 3, "alkali", 0.93, false,
    "Logam lunak yang meledak hebat jika menyentuh air.",
    "Mudah melepas 1 elektron valensinya membentuk ion Na⁺ — itulah garam dapur NaCl.",
    "Lampu jalan kuning tua memakai uap natrium."],
  ["Mg", "Magnesium", 12, 2, 3, "alkaline-earth", 1.31, false,
    "Logam ringan yang terbakar dengan cahaya putih menyilaukan.",
    "Melepas 2 elektron valensinya membentuk ion Mg²⁺.",
    "Magnesium ada di pusat molekul klorofil — tumbuhan tidak bisa berfotosintesis tanpanya."],
  ["Al", "Aluminium", 13, 13, 3, "post-transition-metal", 1.61, true,
    "Logam paling melimpah di kerak bumi — ringan dan tidak mudah berkarat.",
    "Seperti boron, aluminium dapat membentuk 3 ikatan dengan oktet tidak lengkap, misalnya AlCl₃.",
    "Aluminium foil rumah tangga mengalir listrik dengan sangat baik."],
  ["Si", "Silikon", 14, 14, 3, "metalloid", 1.9, true,
    "Bahan dasar chip komputer dan pasir pantai. Satu golongan dengan karbon.",
    "Seperti karbon, silikon membentuk 4 ikatan untuk oktet, misalnya SiH₄ dan SiCl₄.",
    "Hampir semua kaca dan semen di dunia mengandung silikon."],
  ["P", "Fosfor", 15, 15, 3, "nonmetal", 2.19, true,
    "Unsur penting tulang, DNA, dan energi sel (ATP). Punya 5 elektron valensi.",
    "Fosfor bisa membentuk 3 ikatan + 1 PEB (PH₃), atau 'memperluas oktet' menjadi 5 ikatan (PCl₅).",
    "Fosfor putih menyala sendiri di udara dan pernah dipakai korek api awal."],
  ["S", "Belerang", 16, 16, 3, "nonmetal", 2.58, true,
    "Bubuk kuning berbau khas dekat kawah gunung berapi. Punya 6 elektron valensi.",
    "Seperti oksigen, belerang membentuk 2 ikatan + 2 PEB (H₂S), dan bisa memperluas oktet hingga 6 ikatan (SF₆).",
    "Bau 'telur busuk' berasal dari gas H₂S yang mengandung belerang."],
  ["Cl", "Klorin", 17, 17, 3, "halogen", 3.16, true,
    "Gas hijau kekuningan yang dipakai memurnikan air minum. Punya 7 elektron valensi.",
    "Butuh 1 elektron untuk oktet, jadi biasanya 1 ikatan + 3 PEB; pada ClF₃ ia memperluas oktet menjadi 3 ikatan + 2 PEB.",
    "Garam dapur adalah NaCl — gabungan logam reaktif dan gas beracun yang jadi aman."],
  ["Ar", "Argon", 18, 18, 3, "noble-gas", null, false,
    "Gas mulia paling umum di udara (~1%). Sangat stabil, tidak bereaksi.",
    undefined,
    "Argon diisi ke dalam bola lampu pijar agar filamen tidak cepat putus."],

  // ---------- Periode 4 ----------
  ["K", "Kalium", 19, 1, 4, "alkali", 0.82, false,
    "Logam alkali yang penting untuk fungsi saraf dan otot.",
    "Melepas 1 elektron membentuk K⁺.", "Pisang kaya akan kalium."],
  ["Ca", "Kalsium", 20, 2, 4, "alkaline-earth", 1.0, false,
    "Tulang dan gigimu tersusun dari senyawa kalsium.",
    "Melepas 2 elektron membentuk Ca²⁺.", "Kapur tulis dan cangkang telur sama-sama kalsium karbonat."],

  // Transisi periode 4 — data dasar saja (di luar cakupan VSEPR SMA)
  ["Sc", "Skandium", 21, 3, 4, "transition-metal", 1.36, false, "Logam transisi ringan.", undefined, undefined],
  ["Ti", "Titanium", 22, 4, 4, "transition-metal", 1.54, false, "Logam kuat seringan aluminium.", undefined, undefined],
  ["V", "Vanadium", 23, 5, 4, "transition-metal", 1.63, false, "Dipakai membuat baja super kuat.", undefined, undefined],
  ["Cr", "Kromium", 24, 6, 4, "transition-metal", 1.66, false, "Memberi kilau pada baja anti karat.", undefined, undefined],
  ["Mn", "Mangan", 25, 7, 4, "transition-metal", 1.55, false, "Bahan penting baterai dan baja.", undefined, undefined],
  ["Fe", "Besi", 26, 8, 4, "transition-metal", 1.83, false, "Logam paling banyak dipakai manusia.", undefined, undefined],
  ["Co", "Kobalt", 27, 9, 4, "transition-metal", 1.88, false, "Memberi warna biru pada keramik.", undefined, undefined],
  ["Ni", "Nikel", 28, 10, 4, "transition-metal", 1.91, false, "Bahan koin dan baterai isi ulang.", undefined, undefined],
  ["Cu", "Tembaga", 29, 11, 4, "transition-metal", 1.9, false, "Kabel listrik di rumahmu memakai tembaga.", undefined, undefined],
  ["Zn", "Seng", 30, 12, 4, "transition-metal", 1.65, false, "Melindungi besi dari karat (galvanis).", undefined, undefined],

  ["Ga", "Galium", 31, 13, 4, "post-transition-metal", 1.81, false,
    "Logam yang bisa meleleh di genggaman tangan (titik leleh 29,8°C).",
    "Seperti boron, galium membentuk 3 ikatan.", "Galium dipakai pada LED biru penemu lampu hemat energi."],
  ["Ge", "Germanium", 32, 14, 4, "metalloid", 2.01, false,
    "Metaloid semikonduktor generasi awal transistor.",
    "Membentuk 4 ikatan seperti karbon dan silikon.", "Germanium dipakai pada lensa kamera inframerah."],
  ["As", "Arsen", 33, 15, 4, "metalloid", 2.18, false,
    "Terkenal sebagai racun, tapi senyawanya berguna di elektronik.",
    "Seperti nitrogen, arsen punya 5 elektron valensi.", "Arsenik pernah dipakai sebagai pigmen hijau cat tembok (dan meracuni penghuninya)."],
  ["Se", "Selenium", 34, 16, 4, "nonmetal", 2.55, false,
    "Mikronutrien penting dalam jumlah sangat kecil.",
    "Seperti oksigen, selenium punya 6 elektron valensi.", "Selenium dipakai pada mesin fotokopi generasi pertama."],
  ["Br", "Bromin", 35, 17, 4, "halogen", 2.96, false,
    "Satu-satunya nonlogam yang cair pada suhu kamar.",
    "Seperti halogen lain, bromin butuh 1 elektron untuk oktet.", "Bromin dipakai pada cairan pemadam kebakaran."],
  ["Kr", "Kripton", 36, 18, 4, "noble-gas", null, false,
    "Gas mulia langka yang memancarkan cahaya putih terang.",
    undefined, "Kripton memberi nama planet asal Superman (fiksi)."],

  // ---------- Periode 5 (golongan utama) ----------
  ["Rb", "Rubidium", 37, 1, 5, "alkali", 0.82, false,
    "Logam alkali yang menyala ungu kemerahan saat dibakar.",
    "Melepas 1 elektron.", "Rubidium dipakai pada jam atom super akurat."],
  ["Sr", "Stronsium", 38, 2, 5, "alkaline-earth", 0.95, false,
    "Memberi warna merah menyala pada kembang api.",
    "Melepas 2 elektron.", "Kembang api merah di malam tahun baru memakai stronsium."],
  ["In", "Indium", 49, 13, 5, "post-transition-metal", 1.78, false,
    "Logam lunak yang 'menjerit' saat ditekuk.",
    "Membentuk 3 ikatan.", "Layar sentuh ponsel dilapisi indium timah oksida."],
  ["Sn", "Timah", 50, 14, 5, "post-transition-metal", 1.96, false,
    "Logam kaleng dan patri sejak zaman perunggu.",
    "Dapat membentuk 2 atau 4 ikatan.", "Perunggu = tembaga + timah, paduan pertama manusia."],
  ["Sb", "Antimon", 51, 15, 5, "metalloid", 2.05, false,
    "Metaloid yang dipakai pengisi tinta kuno.",
    "Seperti nitrogen, punya 5 elektron valensi.", "Antimon dipakai pada bahan tahan api."],
  ["Te", "Telurium", 52, 16, 5, "metalloid", 2.1, false,
    "Metaloid langka pengisi panel surya tipis.",
    "Seperti oksigen, punya 6 elektron valensi.", "Telurium lebih langka dari emas di kerak bumi."],
  ["I", "Iodin", 53, 17, 5, "halogen", 2.66, false,
    "Zat antiseptik kecoklatan di kotak P3K.",
    "Seperti halogen lain, butuh 1 elektron untuk oktet.", "Garam ber-iodin mencegah penyakit gondok."],
  ["Xe", "Xenon", 54, 18, 5, "noble-gas", 2.6, true,
    "Gas mulia 'pemberontak' — meski golongan VIII A, elektronnya cukup jauh dari inti sehingga BISA berikatan dengan fluorin.",
    "Xenon dapat 'memperluas oktet': melepas pasangan elektronnya untuk berikatan, misal XeF₂ (2 ikatan + 3 PEB) dan XeF₄ (4 ikatan + 2 PEB).",
    "Lampu kilat kamera dan pendorong satelit ion memakai xenon."],
];

const GROUP_VALENCE: Record<number, number> = {
  1: 1, 2: 2, 13: 3, 14: 4, 15: 5, 16: 6, 17: 7, 18: 8,
};

function valenceOf(symbol: string, group: number, category: string): number {
  if (symbol === "He") return 2;
  if (category === "transition-metal") return 0;
  return GROUP_VALENCE[group] ?? 0;
}

export const ELEMENTS: ElementData[] = RAW.map((r) =>
  ElementDataSchema.parse({
    symbol: r[0],
    name: r[1],
    atomicNumber: r[2],
    group: r[3],
    period: r[4],
    category: r[5],
    electronegativity: r[6] ?? undefined,
    usedInApp: r[7],
    simpleExplanation: r[8],
    whyItBonds: r[9],
    funFact: r[10],
    valenceElectrons: valenceOf(r[0], r[3], r[5]),
  }),
);

const BY_SYMBOL = new Map(ELEMENTS.map((e) => [e.symbol, e]));

export function getElement(symbol: string): ElementData {
  const el = BY_SYMBOL.get(symbol);
  if (!el) throw new Error(`Unsur tidak dikenal: ${symbol}`);
  return el;
}

export function getValenceElectrons(symbol: string): number {
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
  other: "Lainnya",
};

export const OUT_OF_SCOPE_NOTE =
  "Di luar cakupan materi VSEPR SMA — unsur golongan transisi punya aturan valensi berbeda karena melibatkan orbital d.";
