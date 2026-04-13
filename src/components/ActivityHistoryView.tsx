import { loadActivities, formatGb, type ActivityEntry } from "../lib/activity-log";
import { useI18n } from "../i18n/context";

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  return `${(n / 1024 ** 2).toFixed(0)} MB`;
}

function line(e: ActivityEntry, t: (k: string, v?: Record<string, string | number>) => string): string {
  if (e.kind === "scan_complete") {
    let base = t("history.scan", { items: e.itemsAnalyzed ?? 0 });
    if (e.freeGbBefore !== undefined && e.freeGbAfter !== undefined) {
      base += ` · ${t("history.freeSpace", { before: formatGb(e.freeGbBefore), after: formatGb(e.freeGbAfter) })}`;
    }
    return base;
  }
  const size = formatBytes(e.bytesFreed ?? 0);
  let base = t("history.clean", { files: e.filesRemoved ?? 0, size });
  if (e.failedCount && e.failedCount > 0) {
    base += ` · ${t("history.cleanFailed", { n: e.failedCount })}`;
  }
  if (e.freeGbBefore !== undefined && e.freeGbAfter !== undefined) {
    base += ` · ${t("history.freeSpace", { before: formatGb(e.freeGbBefore), after: formatGb(e.freeGbAfter) })}`;
  }
  return base;
}

export function ActivityHistoryView() {
  const { t } = useI18n();
  const rows = loadActivities();

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-6 py-6 md:px-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <h2 className="text-[30px] leading-[36px] font-semibold text-white tracking-tight">{t("history.title")}</h2>
        <p className="text-sm text-white/60">{t("history.subtitle")}</p>
        {rows.length === 0 ? (
          <p className="text-sm text-white/45 py-8">{t("history.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((e) => (
              <li
                key={e.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80"
              >
                <div className="text-[10px] text-white/40 uppercase tracking-wide">
                  {new Date(e.at).toLocaleString()}
                </div>
                <p className="mt-1">{line(e, t)}</p>
                {e.sampleNames && e.sampleNames.length > 0 && (
                  <p className="text-[11px] text-white/45 mt-2 line-clamp-3">{e.sampleNames.join(", ")}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
