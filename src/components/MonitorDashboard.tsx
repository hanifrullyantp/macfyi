import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RefreshCw } from "lucide-react";
import { useI18n } from "../i18n/context";
import type { StorageEntry } from "../types";
import { loadActivities } from "../lib/activity-log";
import {
  getDiskStats,
  getMemorySnapshot,
  getStorageBreakdown,
  getTopProcesses,
  listLaunchAgents,
  openLoginItemsSettings,
  type LaunchAgentInfo,
  type MemorySnapshot,
  type ProcessMemoryInfo,
} from "../lib/backend";

const RAM_HISTORY_MAX = 24;
const AUTO_REFRESH_OPTIONS_MS = [0, 5_000, 15_000, 60_000] as const;

function shortLabel(n: string, max = 12): string {
  const s = n.trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function formatBytesGb(bytes: number): string {
  return `${(bytes / (1024 ** 3)).toFixed(1)} GB`;
}

function memoryPressureHint(total: number, available: number): boolean {
  if (total === 0) return false;
  const availGb = available / (1024 ** 3);
  const pct = (available / total) * 100;
  return availGb < 1.5 || pct < 15;
}

function SectionSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl border border-white/10 bg-white/[0.03] ${className}`}>
      <div className="h-4 bg-white/10 rounded w-1/3 m-4" />
      <div className="h-32 bg-white/5 mx-4 mb-4 rounded-lg" />
    </div>
  );
}

export function MonitorDashboard({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const { t } = useI18n();

  const [freeGb, setFreeGb] = useState(0);
  const [totalGb, setTotalGb] = useState(0);
  const [mountPath, setMountPath] = useState("");
  const [storageEntries, setStorageEntries] = useState<StorageEntry[]>([]);
  const [memory, setMemory] = useState<MemorySnapshot | null>(null);
  const [processes, setProcesses] = useState<ProcessMemoryInfo[]>([]);
  const [agents, setAgents] = useState<LaunchAgentInfo[]>([]);

  const [diskLoading, setDiskLoading] = useState(true);
  const [breakdownLoading, setBreakdownLoading] = useState(true);
  const [memoryLoading, setMemoryLoading] = useState(true);
  const [processLoading, setProcessLoading] = useState(true);
  const [agentsLoading, setAgentsLoading] = useState(true);

  const [diskError, setDiskError] = useState<string | null>(null);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);
  const [agentsError, setAgentsError] = useState<string | null>(null);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activityTick, setActivityTick] = useState(0);
  const [autoRefreshMs, setAutoRefreshMs] = useState<number>(0);
  const [ramHistory, setRamHistory] = useState<{ i: number; usedPct: number }[]>([]);
  const historyIndexRef = useRef(0);
  const refreshLockRef = useRef(false);

  const fetchDisk = useCallback(async () => {
    setDiskLoading(true);
    setDiskError(null);
    try {
      const s = await getDiskStats();
      setFreeGb(s.free_gb);
      setTotalGb(s.total_gb);
      setMountPath(s.mount_path ?? "");
    } catch (e) {
      setDiskError(e instanceof Error ? e.message : String(e));
    } finally {
      setDiskLoading(false);
    }
  }, []);

  const fetchBreakdown = useCallback(async () => {
    setBreakdownLoading(true);
    setBreakdownError(null);
    try {
      const entries = await getStorageBreakdown();
      setStorageEntries(entries);
    } catch (e) {
      setBreakdownError(e instanceof Error ? e.message : String(e));
    } finally {
      setBreakdownLoading(false);
    }
  }, []);

  const fetchMemory = useCallback(async () => {
    setMemoryLoading(true);
    setMemoryError(null);
    try {
      const m = await getMemorySnapshot();
      setMemory(m);
      if (m.totalBytes > 0) {
        const usedPct = Math.round(((m.totalBytes - m.availableBytes) / m.totalBytes) * 100);
        historyIndexRef.current += 1;
        setRamHistory((prev) => {
          const next = [...prev, { i: historyIndexRef.current, usedPct: Math.min(100, usedPct) }];
          return next.slice(-RAM_HISTORY_MAX);
        });
      }
    } catch (e) {
      setMemoryError(e instanceof Error ? e.message : String(e));
    } finally {
      setMemoryLoading(false);
    }
  }, []);

  const fetchProcesses = useCallback(async () => {
    setProcessLoading(true);
    setProcessError(null);
    try {
      const rows = await getTopProcesses(12);
      setProcesses(rows);
    } catch (e) {
      setProcessError(e instanceof Error ? e.message : String(e));
    } finally {
      setProcessLoading(false);
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    setAgentsLoading(true);
    setAgentsError(null);
    try {
      const rows = await listLaunchAgents();
      setAgents(rows);
    } catch (e) {
      setAgentsError(e instanceof Error ? e.message : String(e));
    } finally {
      setAgentsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    if (refreshLockRef.current) return;
    refreshLockRef.current = true;
    setRefreshing(true);
    try {
      await Promise.all([fetchDisk(), fetchBreakdown(), fetchMemory(), fetchProcesses(), fetchAgents()]);
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
      refreshLockRef.current = false;
    }
  }, [fetchDisk, fetchBreakdown, fetchMemory, fetchProcesses, fetchAgents]);

  useEffect(() => {
    void refreshAll();
  }, [refreshSignal, refreshAll]);

  useEffect(() => {
    if (autoRefreshMs <= 0) return;
    const id = window.setInterval(() => void refreshAll(), autoRefreshMs);
    return () => window.clearInterval(id);
  }, [autoRefreshMs, refreshAll]);

  useEffect(() => {
    const id = window.setInterval(() => setActivityTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const usedGb = totalGb > 0 ? Math.max(0, totalGb - freeGb) : 0;
  const usedPctDisk = totalGb > 0 ? Math.min(100, Math.round((usedGb / totalGb) * 100)) : 0;

  const pieData = useMemo(() => {
    if (totalGb <= 0) return [];
    return [
      { name: "used", value: Number(usedGb.toFixed(2)), fill: "var(--color-brand)" },
      { name: "free", value: Number(Math.max(0, freeGb).toFixed(2)), fill: "rgba(255,255,255,0.12)" },
    ];
  }, [totalGb, usedGb, freeGb]);

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

  const processBarData = useMemo(() => {
    return [...processes]
      .sort((a, b) => b.memoryBytes - a.memoryBytes)
      .map((p) => ({
        name: shortLabel(p.name, 18),
        fullName: p.name,
        mb: Math.round(p.memoryBytes / (1024 * 1024)),
        pid: p.pid,
      }));
  }, [processes]);

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

  const memPressure =
    memory && memory.totalBytes > 0
      ? memoryPressureHint(memory.totalBytes, memory.availableBytes)
      : false;
  const memUsedPct =
    memory && memory.totalBytes > 0
      ? Math.min(100, Math.round(((memory.totalBytes - memory.availableBytes) / memory.totalBytes) * 100))
      : 0;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-6 py-6 md:px-8" aria-busy={refreshing}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-[30px] leading-[36px] font-semibold text-white tracking-tight">
              {t("monitor.title")}
            </h2>
            <p className="text-sm text-white/60 mt-1 max-w-xl">{t("monitor.subtitle")}</p>
            {lastUpdated && (
              <p className="text-[11px] text-white/40 mt-2 tabular-nums">
                {t("monitor.lastUpdated", { time: lastUpdated.toLocaleString() })}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <label className="text-[11px] text-white/45 sr-only" htmlFor="monitor-auto-refresh">
              {t("monitor.autoRefresh")}
            </label>
            <select
              id="monitor-auto-refresh"
              value={autoRefreshMs}
              onChange={(e) => setAutoRefreshMs(Number(e.target.value))}
              className="text-xs rounded-lg border border-white/15 bg-white/[0.06] text-white/85 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400/40"
            >
              <option value={AUTO_REFRESH_OPTIONS_MS[0]}>{t("monitor.autoRefreshOff")}</option>
              <option value={AUTO_REFRESH_OPTIONS_MS[1]}>{t("monitor.autoRefresh5s")}</option>
              <option value={AUTO_REFRESH_OPTIONS_MS[2]}>{t("monitor.autoRefresh15s")}</option>
              <option value={AUTO_REFRESH_OPTIONS_MS[3]}>{t("monitor.autoRefresh60s")}</option>
            </select>
            <button
              type="button"
              onClick={() => void refreshAll()}
              className="inline-flex items-center gap-2 text-xs rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-white/85 hover:bg-white/[0.1] transition-colors"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              {t("monitor.refresh")}
            </button>
          </div>
        </div>

        {/* Storage row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {diskError ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/90">
              {t("monitor.diskError", { message: diskError })}
            </div>
          ) : diskLoading ? (
            <SectionSkeleton className="min-h-[200px]" />
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex flex-col sm:flex-row gap-4 items-center">
              <div className="w-full sm:w-[200px] h-[200px] min-w-0 shrink-0">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={2}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => [`${v} GB`, t("monitor.sizeGb")]}
                        contentStyle={{
                          background: "#1a1b20",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
              <div className="flex-1 w-full space-y-3">
                <h3 className="text-sm font-semibold text-white">{t("monitor.sectionStorage")}</h3>
                {mountPath ? (
                  <p className="text-[11px] text-white/40 font-mono truncate" title={mountPath}>
                    {t("monitor.mountPath", { path: mountPath })}
                  </p>
                ) : null}
                <div className="grid grid-cols-3 gap-2 text-center sm:text-left">
                  <div>
                    <p className="text-[10px] text-white/45 uppercase tracking-[0.1em]">{t("monitor.freeSpace")}</p>
                    <p className="text-lg font-semibold text-white tabular-nums">{freeGb.toFixed(1)} GB</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/45 uppercase tracking-[0.1em]">{t("monitor.usedSpace")}</p>
                    <p className="text-lg font-semibold text-white tabular-nums">{usedGb.toFixed(1)} GB</p>
                    <p className="text-[10px] text-white/40">{usedPctDisk}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/45 uppercase tracking-[0.1em]">{t("monitor.totalCapacity")}</p>
                    <p className="text-lg font-semibold text-white tabular-nums">{totalGb.toFixed(0)} GB</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Memory */}
          {memoryLoading && !memory ? (
            <SectionSkeleton className="min-h-[200px]" />
          ) : memoryError ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/90">
              {t("monitor.memoryError", { message: memoryError })}
            </div>
          ) : memory ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">{t("monitor.sectionMemory")}</h3>
              <p className="text-[11px] text-white/45">{t("monitor.memoryHint")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${memPressure ? "bg-amber-400/80" : "bg-emerald-400/80"}`}
                      style={{ width: `${memUsedPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/70 mt-2 tabular-nums">
                    {t("monitor.memoryUsedPct", { pct: memUsedPct })}
                  </p>
                </div>
                <div className="text-xs text-white/65 space-y-1 tabular-nums">
                  <p>
                    {t("monitor.memoryTotal")}: {formatBytesGb(memory.totalBytes)}
                  </p>
                  <p>
                    {t("monitor.memoryAvailable")}: {formatBytesGb(memory.availableBytes)}
                  </p>
                  <p>
                    {t("monitor.memoryUsed")}: {formatBytesGb(memory.usedBytes)}
                  </p>
                </div>
              </div>
              {memPressure ? (
                <p className="text-[11px] text-amber-300/90">{t("monitor.memoryPressure")}</p>
              ) : null}
              {ramHistory.length > 1 ? (
                <div className="h-24 w-full min-w-0 pt-2">
                  <p className="text-[10px] text-white/40 mb-1">{t("monitor.ramSparkHint")}</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ramHistory} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="i" hide />
                      <YAxis domain={[0, 100]} width={28} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 9 }} />
                      <Tooltip
                        contentStyle={{
                          background: "#1a1b20",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 8,
                          fontSize: 11,
                        }}
                        formatter={(v: number) => [`${v}%`, t("monitor.memoryUsedPctShort")]}
                      />
                      <Line
                        type="monotone"
                        dataKey="usedPct"
                        stroke="var(--color-brand-glow)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Folder breakdown */}
        {breakdownLoading && storageEntries.length === 0 && !breakdownError ? (
          <SectionSkeleton className="min-h-[280px]" />
        ) : breakdownError ? (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/90">
            {t("monitor.breakdownError", { message: breakdownError })}
          </div>
        ) : barData.length > 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <h3 className="text-sm font-semibold text-white mb-1">{t("monitor.storageChart")}</h3>
            <p className="text-[11px] text-white/40 mb-3">{t("monitor.storageChartHint")}</p>
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
          <p className="text-sm text-white/45 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
            {t("monitor.noFolderData")}
          </p>
        )}

        {/* Top processes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {processLoading && processes.length === 0 && !processError ? (
            <SectionSkeleton className="min-h-[280px]" />
          ) : processError ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/90">
              {t("monitor.processError", { message: processError })}
            </div>
          ) : processBarData.length > 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="text-sm font-semibold text-white mb-1">{t("monitor.sectionProcesses")}</h3>
              <p className="text-[11px] text-white/40 mb-3">{t("monitor.processesHint")}</p>
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={processBarData}
                    margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#1a1b20",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value: number, _n, item) => {
                        const pid = (item?.payload as { pid?: number })?.pid;
                        return [`${value} MB`, pid != null ? `PID ${pid}` : t("monitor.ramMb")];
                      }}
                    />
                    <Bar dataKey="mb" fill="var(--color-brand)" radius={[0, 4, 4, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 border-t border-white/10 pt-3">
                <p className="text-[10px] text-white/40 uppercase tracking-[0.08em] mb-2">{t("monitor.processListTitle")}</p>
                <ul className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar text-xs tabular-nums">
                  {processBarData.map((row) => (
                    <li key={`${row.pid}-${row.fullName}`} className="flex justify-between gap-3 text-white/70">
                      <span className="truncate min-w-0" title={row.fullName}>
                        {row.fullName}
                      </span>
                      <span className="shrink-0 text-white/50">
                        {row.mb} MB · PID {row.pid}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/45">
              {t("monitor.noProcessData")}
            </div>
          )}

          {/* Launch agents */}
          {agentsLoading && agents.length === 0 && !agentsError ? (
            <SectionSkeleton className="min-h-[280px]" />
          ) : agentsError ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/90">
              {t("monitor.agentsError", { message: agentsError })}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex flex-col max-h-[420px]">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">{t("monitor.sectionAgents")}</h3>
                  <p className="text-[11px] text-white/40 mt-1">{t("monitor.agentsHint")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void openLoginItemsSettings()}
                  className="text-[11px] text-emerald-300/90 hover:text-emerald-200 shrink-0"
                >
                  {t("perf.openLoginSettings")}
                </button>
              </div>
              <p className="text-xs text-white/55 mb-2 tabular-nums">
                {t("monitor.agentsCount", { n: agents.length })}
              </p>
              {agents.length === 0 ? (
                <p className="text-sm text-white/45 py-4">{t("monitor.noAgents")}</p>
              ) : (
                <ul className="overflow-y-auto custom-scrollbar space-y-2 pr-1 flex-1 min-h-0">
                  {agents.map((a) => (
                    <li
                      key={a.fileName}
                      className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs"
                    >
                      <p className="text-white/85 font-medium truncate">{a.label ?? a.fileName}</p>
                      <p className="text-[10px] text-white/40 truncate mt-0.5">{a.fileName}</p>
                      {a.program ? (
                        <p className="text-[10px] text-white/35 truncate mt-1 font-mono">{a.program}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

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
