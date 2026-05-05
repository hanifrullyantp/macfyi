import { Folder, FileText, FolderOpen } from "lucide-react";
import type { DiskExplorerRiskLevel, DiskNode } from "../../lib/types/diskExplorer";
import { useI18n } from "../../i18n/context";

function fmtSize(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

function riskClass(r: DiskExplorerRiskLevel): string {
  if (r === "Safe") return "text-emerald-300 bg-emerald-500/15 border-emerald-500/25";
  if (r === "Caution") return "text-amber-200 bg-amber-500/15 border-amber-500/25";
  if (r === "Risky") return "text-rose-200 bg-rose-500/15 border-rose-500/25";
  return "text-white/45 bg-white/5 border-white/10";
}

export function DiskNodeTable({
  nodes,
  selectedPaths,
  onToggle,
  onOpenDir,
  onTopFiles,
  onRevealPath,
  blockDeepNavigation,
}: {
  nodes: DiskNode[];
  selectedPaths: string[];
  onToggle: (path: string) => void;
  onOpenDir: (node: DiskNode) => void;
  onTopFiles: (path: string) => void;
  onRevealPath: (path: string) => void;
  blockDeepNavigation?: boolean;
}) {
  const { t } = useI18n();

  const riskLabel = (r: DiskExplorerRiskLevel) => {
    if (r === "Safe") return t("diskExplorer.riskSafe");
    if (r === "Caution") return t("diskExplorer.riskCaution");
    if (r === "Risky") return t("diskExplorer.riskRisky");
    return t("diskExplorer.riskLocked");
  };

  if (nodes.length === 0) {
    return <p className="text-sm text-white/45 py-10 text-center">{t("diskExplorer.empty")}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full text-left text-xs sm:text-sm">
        <thead className="bg-white/[0.04] text-white/50 uppercase tracking-wide text-[10px]">
          <tr>
            <th className="w-10 px-3 py-2" />
            <th className="px-3 py-2">{t("diskExplorer.colName")}</th>
            <th className="px-3 py-2 whitespace-nowrap">{t("diskExplorer.colSize")}</th>
            <th className="px-3 py-2 whitespace-nowrap hidden sm:table-cell">{t("diskExplorer.colItems")}</th>
            <th className="px-3 py-2 hidden md:table-cell">{t("diskExplorer.colType")}</th>
            <th className="px-3 py-2">{t("diskExplorer.colRisk")}</th>
            <th className="px-3 py-2 text-right">{t("diskExplorer.colActions")}</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((n) => {
            const checked = selectedPaths.includes(n.path);
            const locked = n.riskLevel === "Locked" || !n.isAccessible;
            const depthBlocked = !!blockDeepNavigation && n.isExpandable;
            return (
              <tr
                key={n.path}
                className={`border-t border-white/5 hover:bg-white/[0.03] ${
                  depthBlocked ? "opacity-70 blur-[1px]" : ""
                }`}
              >
                <td className="px-3 py-2 align-middle">
                  <input
                    type="checkbox"
                    className="rounded border-white/20 bg-transparent"
                    checked={checked}
                    disabled={locked || depthBlocked}
                    onChange={() => onToggle(n.path)}
                  />
                </td>
                <td className="px-3 py-2 align-middle">
                  <button
                    type="button"
                    disabled={!n.isExpandable || depthBlocked}
                    onClick={() => {
                      if (n.isExpandable && !depthBlocked) onOpenDir(n);
                    }}
                    className={`inline-flex items-center gap-2 text-left ${
                      n.isExpandable && !depthBlocked
                        ? "text-white hover:text-emerald-300"
                        : "text-white/70 cursor-default"
                    }`}
                  >
                    <span className="text-white/35">{n.isExpandable ? <Folder className="w-4 h-4" /> : <FileText className="w-4 h-4" />}</span>
                    <span className="font-medium">{n.displayName}</span>
                  </button>
                  <p className="text-[10px] text-white/35 mt-0.5 truncate max-w-[220px] sm:max-w-xs">{n.redactedPath}</p>
                </td>
                <td className="px-3 py-2 align-middle tabular-nums text-white/75 whitespace-nowrap">{fmtSize(n.sizeBytes)}</td>
                <td className="px-3 py-2 align-middle text-white/55 hidden sm:table-cell">{n.itemCount}</td>
                <td className="px-3 py-2 align-middle text-white/55 hidden md:table-cell">{n.nodeType}</td>
                <td className="px-3 py-2 align-middle">
                  <span className={`inline-flex px-2 py-0.5 rounded-md border text-[10px] font-medium ${riskClass(n.riskLevel)}`}>
                    {riskLabel(n.riskLevel)}
                  </span>
                </td>
                <td className="px-3 py-2 align-middle text-right whitespace-nowrap">
                  <div className="inline-flex items-center justify-end gap-1">
                    <button
                      type="button"
                      title={t("diskExplorer.openInFinder")}
                      aria-label={t("diskExplorer.openInFinder")}
                      onClick={() => onRevealPath(n.path)}
                      disabled={locked}
                      className={`rounded-md p-1.5 transition-colors ${
                        locked
                          ? "text-white/25 cursor-not-allowed"
                          : "text-white/55 hover:text-white hover:bg-white/[0.1] cursor-pointer"
                      }`}
                    >
                      <FolderOpen className="w-4 h-4" />
                    </button>
                    {n.isExpandable ? (
                      <button
                        type="button"
                        disabled={depthBlocked}
                        onClick={() => onTopFiles(n.path)}
                        className={`text-[10px] sm:text-xs px-1.5 py-1 rounded-md transition-colors ${
                          depthBlocked
                            ? "text-white/25 cursor-not-allowed"
                            : "text-emerald-300/90 hover:text-emerald-200 hover:bg-white/[0.06]"
                        }`}
                      >
                        {t("diskExplorer.topFiles")}
                      </button>
                    ) : (
                      <span className="text-white/25 text-[10px] px-1">—</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
