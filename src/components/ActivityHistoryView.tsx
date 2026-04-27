import { useCallback, useEffect, useState } from "react";
import {
  clearAllActivities,
  loadActivities,
  removeActivity,
  formatGb,
  type ActivityEntry,
} from "../lib/activity-log";
import { useI18n } from "../i18n/context";
import { getIsProEntitled } from "../lib/entitlement";
import { marketingCheckoutUrl } from "../lib/marketingUrl";

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
  const [rows, setRows] = useState<ActivityEntry[]>(() => loadActivities());

  const refresh = useCallback(() => {
    setRows(loadActivities());
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  const onDeleteOne = (id: string) => {
    if (!getIsProEntitled()) {
      window.alert(t("history.proOnlyDelete"));
      window.open(marketingCheckoutUrl(), "_blank", "noopener,noreferrer");
      return;
    }
    if (!window.confirm(t("history.deleteOneConfirm"))) return;
    removeActivity(id);
    refresh();
  };

  const onClearAll = () => {
    if (!getIsProEntitled()) {
      window.alert(t("history.proOnlyDelete"));
      window.open(marketingCheckoutUrl(), "_blank", "noopener,noreferrer");
      return;
    }
    if (!window.confirm(t("history.clearAllConfirm", { n: rows.length }))) return;
    clearAllActivities();
    refresh();
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-6 py-6 md:px-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[30px] leading-[36px] font-semibold text-white tracking-tight">{t("history.title")}</h2>
            <p className="text-sm text-white/60">{t("history.subtitle")}</p>
          </div>
          {rows.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="shrink-0 text-sm font-medium text-rose-300/90 hover:text-rose-200 underline-offset-4 hover:underline self-start sm:self-auto"
            >
              {t("history.clearAll")}
            </button>
          )}
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-white/45 py-8">{t("history.empty")}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((e) => (
              <li
                key={e.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80 flex gap-3 justify-between items-start"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-white/40 uppercase tracking-wide">
                    {new Date(e.at).toLocaleString()}
                  </div>
                  <p className="mt-1">{line(e, t)}</p>
                  {e.sampleNames && e.sampleNames.length > 0 && (
                    <p className="text-[11px] text-white/45 mt-2 line-clamp-3">{e.sampleNames.join(", ")}</p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={t("history.deleteOneAria")}
                  onClick={() => onDeleteOne(e.id)}
                  className="shrink-0 text-xs font-medium text-white/45 hover:text-rose-300/90 px-2 py-1 rounded-lg hover:bg-white/5"
                >
                  {t("history.deleteOne")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
