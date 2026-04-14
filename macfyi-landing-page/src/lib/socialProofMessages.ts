/** Generator teks toast social proof (bahasa Indonesia). */

const DEFAULT_NAMES = [
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

const DEFAULT_ACTIONS = [
  "melakukan pemesanan",
  "baru menyelesaikan checkout",
  "mengaktifkan lisensi",
  "membeli paket",
  "mendaftar checkout",
];

const DEFAULT_PRODUCTS = [
  "lisensi Macfyi lifetime",
  "lisensi 1 perangkat Mac",
  "paket cleanup premium",
  "addon uninstaller",
  "bundle storage optimizer",
];

const DEFAULT_RELATIVE_TIMES = [
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

function splitLines(raw: string | undefined | null): string[] {
  const s = (raw ?? "").trim();
  if (!s) return [];
  return s
    .split(/\r?\n/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

export type SocialProofConfig = {
  names?: string;
  actions?: string;
  products?: string;
  times?: string;
};

export function buildSocialProofLine(config?: SocialProofConfig): { line: string; timeLabel: string } {
  const names = splitLines(config?.names);
  const actions = splitLines(config?.actions);
  const products = splitLines(config?.products);
  const times = splitLines(config?.times);

  const name = pick(names.length ? names : DEFAULT_NAMES);
  const action = pick(actions.length ? actions : DEFAULT_ACTIONS);
  const product = pick(products.length ? products : DEFAULT_PRODUCTS);
  const timeLabel = pick(times.length ? times : DEFAULT_RELATIVE_TIMES);
  const line = `${name} ${action} ${product}`;
  return { line, timeLabel };
}

export function randomIntervalMs(minSec = 25, maxSec = 45): number {
  const a = minSec * 1000;
  const b = maxSec * 1000;
  return Math.floor(a + Math.random() * (b - a + 1));
}
