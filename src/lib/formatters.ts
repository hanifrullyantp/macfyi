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
