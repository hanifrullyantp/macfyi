import { useI18n } from "../../i18n/context";

function fmtGb(bytes: number): string {
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export function DiskUsageBar({
  totalBytes,
  usedBytes,
  freeBytes,
}: {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
}) {
  const { t } = useI18n();
  const pct = totalBytes > 0 ? Math.min(100, (usedBytes / totalBytes) * 100) : 0;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="flex justify-between text-xs text-white/55 mb-2">
        <span>{t("diskExplorer.used")}</span>
        <span>{t("diskExplorer.free")}</span>
      </div>
      <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500/80 to-cyan-500/70"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/60 tabular-nums">
        <span>
          {fmtGb(usedBytes)} / {fmtGb(totalBytes)}
        </span>
        <span className="text-white/45">{fmtGb(freeBytes)} free</span>
      </div>
    </div>
  );
}
