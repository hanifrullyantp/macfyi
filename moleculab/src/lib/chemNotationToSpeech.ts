/**
 * Utilitas untuk mengubah notasi kimia menjadi teks yang ramah TTS.
 * Contoh: "Golongan VIA" -> "Golongan enam A", "PEB" -> "P, E, B"
 */

const ROMAN_MAP: Record<string, string> = {
  VIII: "delapan",
  VII: "tujuh",
  VI: "enam",
  IV: "empat",
  V: "lima",
  III: "tiga",
  II: "dua",
  I: "satu",
};

const SUBSCRIPT_MAP: Record<string, string> = {
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
  "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
};

export function toSpeechFriendly(text: string): string {
  let s = text;

  // 1. Konversi Derajat
  s = s.replace(/°/g, " derajat");

  // 2. Konversi Golongan Romawi (misal: VIA -> enam A)
  // Mencari "Golongan " diikuti I-VIII lalu A atau B
  Object.entries(ROMAN_MAP).forEach(([roman, word]) => {
    const regex = new RegExp(`\\b(Golongan\\s+)${roman}([AB])\\b`, "gi");
    s = s.replace(regex, `$1${word} $2`);
  });

  // 3. Eja Huruf untuk Singkatan Kimia
  // PEB, PEI, VSEPR, AXE, AX
  const acronyms = ["PEB", "PEI", "VSEPR", "AXE"];
  acronyms.forEach((acr) => {
    const regex = new RegExp(`\\b${acr}\\b`, "g");
    // Menggunakan koma untuk memberikan jeda antar huruf
    s = s.replace(regex, acr.split("").join(", "));
  });

  // 4. Konversi Notasi VSEPR (AX2E2 -> A, X dua, E dua)
  s = s.replace(/\bA([X])(\d+)(E(\d+))?\b/g, (match, x, nX, ePart, nE) => {
    let res = `A, X ${nX}`;
    if (nE) res += `, E ${nE}`;
    return res;
  });

  // 5. Konversi Subscript Unicode (H₂O -> H dua O)
  Object.entries(SUBSCRIPT_MAP).forEach(([sub, num]) => {
    s = s.replace(new RegExp(sub, "g"), ` ${num} `);
  });

  // Bersihkan spasi ganda
  return s.replace(/\s+/g, " ").trim();
}
