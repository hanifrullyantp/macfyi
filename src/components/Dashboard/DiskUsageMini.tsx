import { HardDrive } from "lucide-react";

export function DiskUsageMini({
  freeGb,
  totalGb,
}: {
  freeGb: number;
  totalGb: number;
}) {
  const pct =
    totalGb > 0 ? Math.min(100, Math.max(0, ((totalGb - freeGb) / totalGb) * 100)) : 0;
  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left">
      <div className="flex items-center gap-2 text-xs text-white/50 mb-2">
        <HardDrive size={14} className="text-white/40" />
        <span>Pakai penyimpanan</span>
        {totalGb > 0 ? (
          <span className="ml-auto font-mono tabular-nums text-white/70">
            {pct.toFixed(0)}% terpakai
          </span>
        ) : null}
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-red-600/90 to-red-500/90 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      {totalGb > 0 && freeGb > 0 ? (
        <p className="text-[11px] text-white/40 mt-2">
          Bebas ~<span className="text-white/70 font-medium">{freeGb.toFixed(1)} GB</span> dari{" "}
          {totalGb.toFixed(0)} GB
        </p>
      ) : (
        <p className="text-[11px] text-white/40 mt-2">Memuat info disk…</p>
      )}
    </div>
  );
}
