import { getDemoRules, isDemoMode } from "./demoSession";
import type { RiskBand } from "./results-types";

const CLEAN_USAGE_KEY = "macfyi.demo.clean_usage_v1";
const UNINSTALL_USAGE_KEY = "macfyi.demo.uninstall_usage_v1";

type DayUsage = { day: string; items: number; bytes: number };

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function readDayUsage(key: string): DayUsage {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { day: todayUtc(), items: 0, bytes: 0 };
    const j = JSON.parse(raw) as DayUsage;
    if (j.day !== todayUtc()) return { day: todayUtc(), items: 0, bytes: 0 };
    return { day: j.day, items: Number(j.items) || 0, bytes: Number(j.bytes) || 0 };
  } catch {
    return { day: todayUtc(), items: 0, bytes: 0 };
  }
}

function writeDayUsage(key: string, u: DayUsage) {
  try {
    localStorage.setItem(key, JSON.stringify(u));
  } catch {
    /* */
  }
}

function numRule(key: string, fallback: number): number {
  const r = getDemoRules();
  const v = r[key];
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

function boolRule(key: string, fallback: boolean): boolean {
  const r = getDemoRules();
  const v = r[key];
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  return fallback;
}

export type DemoCleanSelection = { risk: RiskBand; size: number };

export function validateDemoClean(selection: DemoCleanSelection[]): { ok: true } | { ok: false; message: string } {
  if (!isDemoMode()) return { ok: true };

  const maxItems = numRule("clean_daily_items_cap", 30);
  const maxGb = numRule("clean_daily_gb_cap", 2);
  const safeOnly = boolRule("clean_safe_risk_only", true);

  if (maxItems <= 0 || maxGb <= 0) {
    return {
      ok: false,
      message:
        "Demo: penghapusan dinonaktifkan (batas admin = 0). Anda tetap bisa memindai; upgrade ke Pro untuk membersihkan.",
    };
  }

  if (safeOnly) {
    const hasNonSafe = selection.some((i) => i.risk !== "safe");
    if (hasNonSafe) {
      return {
        ok: false,
        message:
          "Demo: hanya item bertanda Aman yang boleh dibersihkan. Kurangi seleksi ke Safe saja, atau upgrade ke Pro.",
      };
    }
  }

  const usage = readDayUsage(CLEAN_USAGE_KEY);
  const addItems = selection.length;
  const addBytes = selection.reduce((s, i) => s + Math.max(0, i.size), 0);
  const maxBytes = Math.max(0, maxGb) * 1024 ** 3;

  if (usage.items + addItems > maxItems) {
    const left = Math.max(0, maxItems - usage.items);
    return {
      ok: false,
      message: `Demo: batas item/hari tercapai (${maxItems}). Tersisa ±${left} item untuk hari ini.`,
    };
  }

  if (usage.bytes + addBytes > maxBytes) {
    return {
      ok: false,
      message: `Demo: batas volume/hari tercapai (~${maxGb} GB). Coba besok atau upgrade ke Pro.`,
    };
  }

  return { ok: true };
}

export function recordDemoCleanUsage(itemsCleaned: number, bytesFreed: number) {
  if (!isDemoMode()) return;
  const u = readDayUsage(CLEAN_USAGE_KEY);
  const day = todayUtc();
  if (u.day !== day) {
    writeDayUsage(CLEAN_USAGE_KEY, { day, items: itemsCleaned, bytes: bytesFreed });
  } else {
    writeDayUsage(CLEAN_USAGE_KEY, {
      day: u.day,
      items: u.items + itemsCleaned,
      bytes: u.bytes + bytesFreed,
    });
  }
}

export function validateDemoUninstall(actions = 1): { ok: true } | { ok: false; message: string } {
  if (!isDemoMode()) return { ok: true };
  const max = numRule("uninstall_actions_per_day", 1);
  if (max <= 0) {
    return { ok: false, message: "Demo: uninstall dinonaktifkan untuk akun demo (atur di admin)." };
  }
  const delta = Math.max(1, actions);
  const u = readDayUsage(UNINSTALL_USAGE_KEY);
  if (u.items + delta > max) {
    return {
      ok: false,
      message: `Demo: batas tindakan uninstall/bersih sisa per hari tercapai (${max}). Anda mencoba ${delta} aksi; tersisa ${Math.max(0, max - u.items)}.`,
    };
  }
  return { ok: true };
}

export function recordDemoUninstallUsage(actions = 1) {
  if (!isDemoMode()) return;
  const delta = Math.max(1, actions);
  const u = readDayUsage(UNINSTALL_USAGE_KEY);
  const day = todayUtc();
  if (u.day !== day) {
    writeDayUsage(UNINSTALL_USAGE_KEY, { day, items: delta, bytes: 0 });
  } else {
    writeDayUsage(UNINSTALL_USAGE_KEY, { day: u.day, items: u.items + delta, bytes: u.bytes });
  }
}
