import { useCallback, useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, RefreshCw, Ban } from "lucide-react";
import { useI18n } from "../i18n/context";
import {
  getMemorySnapshot,
  getTopProcesses,
  listLaunchAgents,
  openLoginItemsSettings,
  runMaintenance,
  forceCloseProcess,
  type LaunchAgentInfo,
  type MemorySnapshot,
  type ProcessMemoryInfo,
} from "../lib/backend";

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(0)} MB`;
  return `${Math.round(n / 1024)} KB`;
}

type SectionKey = "ram" | "proc" | "agents" | "maint";

export function PerformanceView({
  refreshSignal,
  onLoadingChange,
}: {
  refreshSignal: number;
  onLoadingChange?: (loading: boolean) => void;
}) {
  const { t } = useI18n();
  const [mem, setMem] = useState<MemorySnapshot | null>(null);
  const [procs, setProcs] = useState<ProcessMemoryInfo[]>([]);
  const [agents, setAgents] = useState<LaunchAgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    ram: true,
    proc: true,
    agents: true,
    maint: true,
  });
  const [maintMsg, setMaintMsg] = useState<string | null>(null);
  const [killingPid, setKillingPid] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    onLoadingChange?.(true);
    setErr(null);
    setMaintMsg(null);
    try {
      const [m, p, a] = await Promise.all([
        getMemorySnapshot(),
        getTopProcesses(12),
        listLaunchAgents(),
      ]);
      setMem(m);
      setProcs(p);
      setAgents(a);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }, [onLoadingChange]);

  useEffect(() => {
    void load();
  }, [load, refreshSignal]);

  const toggle = (k: SectionKey) =>
    setOpenSections((s) => ({ ...s, [k]: !s[k] }));

  const onMaint = async (kind: "dns" | "verify" | "spotlight") => {
    setMaintMsg(null);
    try {
      const out = await runMaintenance(kind);
      setMaintMsg(out);
    } catch (e) {
      setMaintMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const onForceClose = async (p: ProcessMemoryInfo) => {
    if (
      !window.confirm(
        t("perf.forceConfirm", { name: p.name, pid: p.pid })
      )
    ) {
      return;
    }
    setKillingPid(p.pid);
    try {
      await forceCloseProcess(p.pid);
      await load();
    } catch (e) {
      window.alert(t("perf.forceFailed") + (e instanceof Error ? `\n${e.message}` : ""));
    } finally {
      setKillingPid(null);
    }
  };

  const usedPct =
    mem && mem.totalBytes > 0
      ? Math.min(100, Math.round((mem.usedBytes / mem.totalBytes) * 100))
      : 0;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-6 py-6 md:px-8 pb-28">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[26px] leading-tight font-semibold text-white tracking-tight">{t("perf.title")}</h2>
            <p className="text-sm text-white/55 mt-1">{t("perf.subtitle")}</p>
            <p className="text-[11px] text-white/40 mt-2">{t("perf.macOnly")}</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-medium text-white/85 hover:bg-white/[0.07] disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {t("perf.refresh")}
          </button>
        </div>

        {err && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100/90">{err}</div>
        )}

        {loading && !mem && (
          <p className="text-sm text-white/45">{t("perf.analyzing")}</p>
        )}

        <Collapsible
          title={t("perf.sectionRam")}
          open={openSections.ram}
          onToggle={() => toggle("ram")}
        >
          {mem && (
            <div className="space-y-3">
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--color-brand)] to-[var(--color-brand-glow)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${usedPct}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <p className="text-white/45">{t("perf.totalMem")}</p>
                  <p className="text-white font-semibold tabular-nums">{formatBytes(mem.totalBytes)}</p>
                </div>
                <div>
                  <p className="text-white/45">{t("perf.usedMem")}</p>
                  <p className="text-white font-semibold tabular-nums">{formatBytes(mem.usedBytes)}</p>
                </div>
                <div>
                  <p className="text-white/45">{t("perf.availableMem")}</p>
                  <p className="text-white font-semibold tabular-nums">{formatBytes(mem.availableBytes)}</p>
                </div>
              </div>
            </div>
          )}
        </Collapsible>

        <Collapsible
          title={t("perf.sectionProcesses")}
          open={openSections.proc}
          onToggle={() => toggle("proc")}
        >
          <p className="text-[10px] text-white/45 mb-2 leading-relaxed">{t("perf.memoryExplain")}</p>
          <p className="text-[10px] text-white/45 mb-3 leading-relaxed">{t("perf.forceHint")}</p>
          <ul className="space-y-3">
            {procs.map((p) => {
              const ramPct =
                mem && mem.totalBytes > 0
                  ? Math.min(100, (p.memoryBytes / mem.totalBytes) * 100)
                  : 0;
              return (
                <li
                  key={p.pid}
                  className="text-xs py-2 border-b border-white/[0.06] last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-white/88 truncate font-medium">{p.name}</p>
                      <p className="text-[10px] text-white/35 tabular-nums">PID {p.pid}</p>
                    </div>
                    <span className="text-white/55 tabular-nums shrink-0">{formatBytes(p.memoryBytes)}</span>
                    <button
                      type="button"
                      disabled={killingPid !== null}
                      onClick={() => void onForceClose(p)}
                      className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-red-500/35 bg-red-500/10 text-[10px] font-medium text-red-200/95 hover:bg-red-500/20 disabled:opacity-40"
                      title={t("perf.forceClose")}
                    >
                      <Ban size={12} />
                      {t("perf.forceClose")}
                    </button>
                  </div>
                  {mem && mem.totalBytes > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500/80 to-orange-400/70"
                          style={{ width: `${ramPct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-white/40 tabular-nums">
                        {t("perf.ramOfTotal", { pct: ramPct.toFixed(1) })}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Collapsible>

        <Collapsible
          title={t("perf.sectionAgents")}
          open={openSections.agents}
          onToggle={() => toggle("agents")}
        >
          {agents.length === 0 ? (
            <p className="text-xs text-white/45">{t("perf.noAgents")}</p>
          ) : (
            <ul className="space-y-2">
              {agents.map((a) => (
                <li key={a.fileName} className="text-xs rounded-lg bg-white/[0.03] border border-white/10 px-3 py-2">
                  <p className="font-medium text-white/90">{a.label ?? a.fileName}</p>
                  <p className="text-white/45 truncate mt-0.5">{a.program ?? a.fileName}</p>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => void openLoginItemsSettings()}
            className="mt-3 text-xs text-[var(--color-accent)] hover:underline"
          >
            {t("perf.openLoginSettings")}
          </button>
          <p className="text-[10px] text-white/35 mt-1">{t("perf.loginHint")}</p>
        </Collapsible>

        <Collapsible
          title={t("perf.sectionMaint")}
          open={openSections.maint}
          onToggle={() => toggle("maint")}
        >
          <div className="space-y-2">
            <MaintRow
              label={t("perf.maintDns")}
              hint={t("perf.maintDnsHint")}
              onRun={() => void onMaint("dns")}
            />
            <MaintRow
              label={t("perf.maintVerify")}
              hint={t("perf.maintVerifyHint")}
              onRun={() => void onMaint("verify")}
            />
            <MaintRow
              label={t("perf.maintSpotlight")}
              hint={t("perf.maintSpotlightHint")}
              onRun={() => void onMaint("spotlight")}
            />
          </div>
          {maintMsg && <p className="text-[11px] text-white/55 mt-2 whitespace-pre-wrap">{maintMsg}</p>}
        </Collapsible>
      </div>
    </div>
  );
}

function Collapsible({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
      >
        <span className="text-sm font-semibold text-white/90">{title}</span>
        {open ? <ChevronDown size={16} className="text-white/45" /> : <ChevronRight size={16} className="text-white/45" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3 border-t border-white/[0.06] text-left">{children}</div>
      )}
    </div>
  );
}

function MaintRow({ label, hint, onRun }: { label: string; hint: string; onRun: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-white/[0.06] last:border-0">
      <div>
        <p className="text-xs font-medium text-white/88">{label}</p>
        <p className="text-[10px] text-white/40 mt-0.5">{hint}</p>
      </div>
      <button type="button" onClick={onRun} className="btn-primary text-[11px] px-3 py-1.5 shrink-0">
        {t("perf.run")}
      </button>
    </div>
  );
}
