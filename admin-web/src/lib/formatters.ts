export function formatIdr(n: number | null | undefined): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `Rp ${Math.round(v).toLocaleString("id-ID")}`;
}

export function maskFingerprint(fp: string | null | undefined, head = 10, tail = 4): string {
  if (!fp) return "—";
  if (fp.length <= head + tail) return `${fp.slice(0, 6)}…`;
  return `${fp.slice(0, head)}…${fp.slice(-tail)}`;
}

export function licenseHashDisplay(hash: string | null | undefined, prefixLen = 12): string {
  if (!hash) return "—";
  return `${hash.slice(0, prefixLen)}…`;
}
