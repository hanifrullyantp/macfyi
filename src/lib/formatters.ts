/** Human-readable byte and count labels for UI and tests. */

export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes)) return "0 B";
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  const mb = bytes / 1024 ** 2;
  if (mb < 1024) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  const gb = bytes / 1024 ** 3;
  if (gb < 1024) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  return `${(bytes / 1024 ** 4).toFixed(1)} TB`;
}

export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return "0 item";
  const rounded = Math.round(n);
  const body = new Intl.NumberFormat("id-ID").format(rounded);
  return `${body} item`;
}

export function formatDate(d: Date): string {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  const value = bytes / Math.pow(k, i);
  const body = value.toFixed(decimals).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
  return `${body} ${sizes[i]}`;
}

export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  if (days < 7) return `${days} hari lalu`;
  return d.toLocaleDateString("id-ID");
}
