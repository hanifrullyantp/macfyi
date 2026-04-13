import { useMemo, useState, useEffect } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useI18n } from "../i18n/context";
import type { StorageEntry } from "../types";
import { loadActivities } from "../lib/activity-log";

function shortLabel(n: string, max = 12): string {
  const t = n.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function MonitorDashboard({
  freeGb,
  totalGb,
  storageEntries,
}: {
  freeGb: number;
  totalGb: number;
  storageEntries: StorageEntry[];
}) {
  const { t } = useI18n();
  const [activityTick, setActivityTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setActivityTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const used = totalGb > 0 ? Math.max(0, totalGb - freeGb) : 0;
  const usedPct = totalGb > 0 ? Math.min(100, Math.round((used / totalGb) * 100)) : 0;

  const barData = useMemo(
    () =>
      [...storageEntries]
        .sort((a, b) => b.sizeBytes - a.sizeBytes)
        .slice(0, 14)
        .map((e) => ({
          name: shortLabel(e.name || e.path.split("/").pop() || "?"),
          gb: Number((e.sizeBytes / (1024 * 1024 * 1024)).toFixed(2)),
        })),
    [storageEntries]
  );

  const freeTrend = useMemo(() => {
    void activityTick;
    const acts = loadActivities()
      .filter((a) => a.kind === "scan_complete" && typeof a.freeGbAfter === "number")
      .slice(0, 14)
      .reverse();
    return acts.map((a, i) => ({
      i: i + 1,
      free: Number((a.freeGbAfter ?? 0).toFixed(2)),
    }));
  }, [activityTick]);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-6 py-6 md:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h2 className="text-[30px] leading-[36px] font-semibold text-white tracking-tight">{t("monitor.title")}</h2>
          <p className="text-sm text-white/60 mt-1">{t("monitor.subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs text-white/45 uppercase tracking-[0.12em]">{t("monitor.freeSpace")}</p>
            <p className="text-2xl font-semibold text-white mt-1 tabular-nums">{freeGb.toFixed(1)} GB</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs text-white/45 uppercase tracking-[0.12em]">{t("monitor.usedSpace")}</p>
            <p className="text-2xl font-semibold text-white mt-1 tabular-nums">{used.toFixed(1)} GB</p>
            <p className="text-[11px] text-white/40 mt-1">{usedPct}%</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs text-white/45 uppercase tracking-[0.12em]">{t("monitor.totalCapacity")}</p>
            <p className="text-2xl font-semibold text-white mt-1 tabular-nums">{totalGb.toFixed(0)} GB</p>
          </div>
        </div>

        {barData.length > 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="text-sm font-semibold text-white mb-3">{t("monitor.storageChart")}</h3>
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={48}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }}
                    tickFormatter={(v) => `${v}`}
                    width={40}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      background: "#1a1b20",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [`${value} GB`, t("monitor.sizeGb")]}
                  />
                  <Bar dataKey="gb" fill="var(--color-brand)" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/45 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">{t("monitor.noFolderData")}</p>
        )}

        {freeTrend.length > 1 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="text-sm font-semibold text-white mb-1">{t("monitor.freeTrend")}</h3>
            <p className="text-[11px] text-white/40 mb-3">{t("monitor.freeTrendHint")}</p>
            <div className="h-52 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={freeTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="i" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }} />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }}
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => `${v}`}
                    width={44}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1a1b20",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [`${value} GB`, t("monitor.freeSpace")]}
                  />
                  <Line type="monotone" dataKey="free" stroke="var(--color-brand-glow)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
