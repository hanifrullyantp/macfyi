import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, PackageOpen, RefreshCw } from "lucide-react";
import { LoadingButton } from "./common/LoadingButton";
import type { FileItem, UninstallAppEntry } from "../types";
import { listUninstallApps, orphanDetect, revealInFinder } from "../lib/backend";
import { useI18n } from "../i18n/context";

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(0)} MB`;
  return `${(n / 1024).toFixed(0)} KB`;
}

export function AppUninstallerView() {
  const { t } = useI18n();
  const [apps, setApps] = useState<UninstallAppEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [orphans, setOrphans] = useState<FileItem[]>([]);
  const [orphanLoading, setOrphanLoading] = useState(false);

  const loadApps = useCallback(() => {
    setRefreshing(true);
    setError(null);
    listUninstallApps()
      .then((rows) => {
        setApps(rows);
        if (rows[0]) setSelectedId(`${rows[0].bundleId}|${rows[0].appPath}`);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  const loadOrphans = useCallback(() => {
    setOrphanLoading(true);
    orphanDetect()
      .then(setOrphans)
      .catch(() => setOrphans([]))
      .finally(() => setOrphanLoading(false));
  }, []);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  useEffect(() => {
    loadOrphans();
  }, [loadOrphans]);

  const selected = useMemo(() => {
    if (!selectedId) return apps[0] ?? null;
    return apps.find((a) => `${a.bundleId}|${a.appPath}` === selectedId) ?? apps[0] ?? null;
  }, [apps, selectedId]);

  const totalRelated = selected?.related.reduce((s, r) => s + r.sizeBytes, 0) ?? 0;

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="shrink-0 border-b border-white/10 px-4 py-3 bg-black/30">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="text-sm font-semibold text-white">{t("uninstallerPanel.leftoversTitle")}</h3>
          <LoadingButton
            loading={orphanLoading}
            loadingLabel="…"
            onClick={loadOrphans}
            className="btn-secondary px-2 py-1 text-[11px] min-w-0 shrink-0"
          >
            <RefreshCw size={12} /> {t("uninstallerPanel.refresh")}
          </LoadingButton>
        </div>
        <p className="text-[11px] text-white/45 mb-2">{t("uninstallerPanel.leftoversHint")}</p>
        <div className="max-h-[min(28vh,200px)] overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
          {orphanLoading && orphans.length === 0 && (
            <div className="flex items-center gap-2 text-white/40 text-xs py-2">
              <Loader2 size={14} className="animate-spin" /> …
            </div>
          )}
          {!orphanLoading && orphans.length === 0 && (
            <p className="text-xs text-white/40 py-1">{t("uninstallerPanel.noLeftovers")}</p>
          )}
          {orphans.map((o) => (
            <div
              key={o.id}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/90 truncate">{o.name}</p>
                <p className="text-[10px] text-white/35 truncate font-mono">{o.path}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-white/50 tabular-nums">{formatBytes(o.size)}</span>
                <button
                  type="button"
                  onClick={() => revealInFinder(o.path)}
                  className="text-[11px] text-blue-300 hover:text-blue-200"
                >
                  {t("uninstallerPanel.reveal")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
      <div className="w-[min(100%,380px)] border-r border-white/10 flex flex-col min-h-0 bg-black/20">
        <div className="p-4 border-b border-white/10 shrink-0 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <PackageOpen size={18} className="text-violet-400" />
              Uninstaller
            </h2>
            <p className="text-[11px] text-white/45 mt-1">Apps in /Applications and ~/Applications with related Library data.</p>
          </div>
          <LoadingButton
            loading={refreshing}
            loadingLabel="Refreshing"
            onClick={loadApps}
            className="btn-secondary px-3 py-1.5 text-xs min-w-0 shrink-0"
          >
            <RefreshCw size={14} /> Refresh
          </LoadingButton>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {loading && (
            <div className="flex items-center justify-center py-16 text-white/40 gap-2 text-sm">
              <Loader2 size={18} className="animate-spin" /> Loading…
            </div>
          )}
          {error && <p className="p-4 text-sm text-red-400">{error}</p>}
          {!loading &&
            !error &&
            apps.map((a) => {
              const key = `${a.bundleId}|${a.appPath}`;
              const footprint = a.appSizeBytes + a.related.reduce((s, r) => s + r.sizeBytes, 0);
              const active = selected && `${selected.bundleId}|${selected.appPath}` === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedId(key)}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors ${
                    active ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
                  }`}
                >
                  <p className="text-sm font-medium text-white truncate">{a.name}</p>
                  <p className="text-[10px] text-white/40 truncate mt-0.5">{a.bundleId || "—"}</p>
                  <p className="text-[11px] text-white/50 tabular-nums mt-1">{formatBytes(footprint)} total</p>
                </button>
              );
            })}
          {!loading && !error && apps.length === 0 && (
            <p className="p-4 text-sm text-white/45">No applications found. Open the desktop app with Full Disk Access for best results.</p>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 min-h-0 overflow-y-auto custom-scrollbar p-6">
        {!selected ? (
          <p className="text-white/45 text-sm">Select an application.</p>
        ) : (
          <div className="max-w-2xl space-y-5">
            <div>
              <h3 className="text-2xl font-semibold text-white">{selected.name}</h3>
              {selected.bundleId && <p className="text-xs text-white/45 font-mono mt-1">{selected.bundleId}</p>}
              {selected.lastUsed && <p className="text-[11px] text-white/40 mt-2">Last used: {selected.lastUsed}</p>}
            </div>

            <div className="surface-card p-4 space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-white/45 font-semibold">Application bundle</p>
              <p className="text-sm text-white/80 break-all">{selected.appPath}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-xs text-white/55 tabular-nums">{formatBytes(selected.appSizeBytes)}</span>
                <button
                  type="button"
                  onClick={() => revealInFinder(selected.appPath)}
                  className="text-xs text-blue-300 hover:text-blue-200 inline-flex items-center gap-1"
                >
                  Reveal <ExternalLink size={12} />
                </button>
              </div>
            </div>

            <div className="surface-card p-4 space-y-3">
              <div className="flex justify-between items-baseline gap-2">
                <p className="text-[11px] uppercase tracking-wide text-white/45 font-semibold">Related data</p>
                <span className="text-xs text-white/55 tabular-nums">{formatBytes(totalRelated)}</span>
              </div>
              {selected.related.length === 0 ? (
                <p className="text-sm text-white/40">No standard Library folders found for this bundle ID.</p>
              ) : (
                <ul className="space-y-2">
                  {selected.related.map((r) => (
                    <li
                      key={r.path}
                      className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 flex flex-col gap-1"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="text-xs font-semibold text-white/85">{r.label}</span>
                        <span className="text-[11px] text-white/45 tabular-nums shrink-0">{formatBytes(r.sizeBytes)}</span>
                      </div>
                      <p className="text-[10px] text-white/35 break-all font-mono leading-snug">{r.path}</p>
                      <button
                        type="button"
                        onClick={() => revealInFinder(r.path)}
                        className="self-start text-[11px] text-blue-300 hover:text-blue-200 inline-flex items-center gap-1"
                      >
                        Reveal in Finder <ExternalLink size={10} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-[11px] text-white/35 leading-relaxed">
              Removal of apps and support files is not automated here — use this list to review locations, then delete in Finder or move to
              Trash from Smart Care when those paths appear in a scan.
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
