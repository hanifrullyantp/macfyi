export function formatIdrShort(amount: number): string {
  const n = Math.round(amount);
  if (!Number.isFinite(n) || n <= 0) return "Rp 0";
  if (n >= 1_000_000) {
    const jt = n / 1_000_000;
    return `Rp ${jt % 1 === 0 ? jt.toFixed(0) : jt.toFixed(1)}jt`;
  }
  if (n >= 1000) return `Rp ${Math.round(n / 1000)}rb`;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}
