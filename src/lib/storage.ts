const KEY_LAST_SCAN = "macfyi_last_scan_at";
const KEY_MONTH_BYTES = "macfyi_saved_bytes_month";
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export function getLastScanLabel(): string | null {
  const raw = localStorage.getItem(KEY_LAST_SCAN);
  if (!raw) return null;
  const t = parseInt(raw, 10);
  if (Number.isNaN(t)) return null;
  const diff = Date.now() - t;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  return `${Math.floor(days / 7)} weeks ago`;
}

export function recordScanComplete(): void {
  localStorage.setItem(KEY_LAST_SCAN, String(Date.now()));
}

export function addSavedThisMonth(bytes: number): void {
  const now = Date.now();
  const raw = localStorage.getItem(KEY_MONTH_BYTES);
  let monthStart = now;
  let prevBytes = 0;
  if (raw) {
    try {
      const p = JSON.parse(raw) as { monthStart: number; bytes: number };
      if (now - p.monthStart < MONTH_MS) {
        monthStart = p.monthStart;
        prevBytes = p.bytes;
      }
    } catch {
      /* reset month */
    }
  }
  localStorage.setItem(
    KEY_MONTH_BYTES,
    JSON.stringify({ monthStart, bytes: prevBytes + bytes })
  );
}

export function getSavedThisMonthLabel(): string {
  const raw = localStorage.getItem(KEY_MONTH_BYTES);
  if (!raw) return "0 MB";
  try {
    const p = JSON.parse(raw) as { monthStart: number; bytes: number };
    if (Date.now() - p.monthStart >= MONTH_MS) return "0 MB";
    const gb = p.bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    return `${(p.bytes / (1024 * 1024)).toFixed(1)} MB`;
  } catch {
    return "0 MB";
  }
}
