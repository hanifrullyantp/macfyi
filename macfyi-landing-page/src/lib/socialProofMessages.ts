/** Generator teks toast social proof (bahasa Indonesia). */

const NAMES = [
  "Hanif",
  "Rina",
  "Budi",
  "Sari",
  "Andi",
  "Dewi",
  "Eko",
  "Fitri",
  "Gilang",
  "Hana",
  "Indra",
  "Jihan",
];

const ACTIONS = [
  "melakukan pemesanan",
  "baru menyelesaikan checkout",
  "mengaktifkan lisensi",
  "membeli paket",
  "mendaftar checkout",
];

const PRODUCTS = [
  "kitchen set anti air",
  "lisensi Macfyi lifetime",
  "paket cleanup premium",
  "addon uninstaller",
  "bundle storage optimizer",
  "lisensi 1 perangkat Mac",
];

const RELATIVE_TIMES = [
  "barusan",
  "1 menit lalu",
  "2 menit lalu",
  "3 menit lalu",
  "5 menit lalu",
  "beberapa menit lalu",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function buildSocialProofLine(): { line: string; timeLabel: string } {
  const name = pick(NAMES);
  const action = pick(ACTIONS);
  const product = pick(PRODUCTS);
  const timeLabel = pick(RELATIVE_TIMES);
  const line = `${name} ${action} ${product}`;
  return { line, timeLabel };
}

export function randomIntervalMs(minSec = 25, maxSec = 45): number {
  const a = minSec * 1000;
  const b = maxSec * 1000;
  return Math.floor(a + Math.random() * (b - a + 1));
}
