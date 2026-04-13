import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { FileType } from "../../types";
import type { RiskBand } from "../../lib/results-types";
import type { FilterState, SortKey } from "../../lib/filter-state";
import { defaultFilterState } from "../../lib/filter-state";
import { cn } from "../../utils/cn";

const FILE_TYPE_CHIPS: { key: FileType; label: string }[] = [
  { key: "image", label: "Image" },
  { key: "video", label: "Video" },
  { key: "audio", label: "Audio" },
  { key: "document", label: "Document" },
  { key: "archive", label: "Archive" },
  { key: "code", label: "Code" },
  { key: "other", label: "Other" },
];

const RISK_CHIPS: { key: RiskBand; label: string; className: string }[] = [
  { key: "safe", label: "Safe", className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200" },
  { key: "caution", label: "Caution", className: "border-amber-500/40 bg-amber-500/15 text-amber-200" },
  { key: "risky", label: "Risky", className: "border-red-500/40 bg-red-500/15 text-red-200" },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "size-desc", label: "Largest first" },
  { key: "size-asc", label: "Smallest first" },
  { key: "date-desc", label: "Recent first" },
  { key: "date-asc", label: "Oldest first" },
  { key: "name", label: "Name A–Z" },
];

function toggleInList<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export function FilterPopover({
  draft,
  onChangeDraft,
  folderOptions,
  appOptions,
  onApply,
  onReset,
  onClose,
}: {
  draft: FilterState;
  onChangeDraft: (next: FilterState) => void;
  folderOptions: string[];
  appOptions: string[];
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const [folderQ, setFolderQ] = useState("");

  const filteredFolders = useMemo(() => {
    const q = folderQ.trim().toLowerCase();
    const base = ["__all__", ...folderOptions];
    if (!q) return base;
    return base.filter((f) => f === "__all__" || f.toLowerCase().includes(q));
  }, [folderOptions, folderQ]);

  const toggleFileType = (k: FileType) => {
    onChangeDraft({ ...draft, fileTypes: toggleInList(draft.fileTypes, k) });
  };
  const toggleRisk = (k: RiskBand) => {
    onChangeDraft({ ...draft, risks: toggleInList(draft.risks, k) });
  };
  const toggleFolder = (f: string) => {
    if (f === "__all__") {
      onChangeDraft({ ...draft, folders: [] });
      return;
    }
    onChangeDraft({ ...draft, folders: toggleInList(draft.folders, f) });
  };
  const toggleApp = (a: string) => {
    if (a === "__all_app__") {
      onChangeDraft({ ...draft, appKeys: [] });
      return;
    }
    onChangeDraft({ ...draft, appKeys: toggleInList(draft.appKeys, a) });
  };

  return (
    <div className="absolute left-0 top-full mt-2 z-[80] w-[min(100vw-2rem,280px)] rounded-xl border border-white/10 bg-[#1b1d22] shadow-2xl flex flex-col max-h-[min(70vh,520px)]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">Filter options</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-[11px] text-[var(--color-accent-text)] hover:opacity-90"
            onClick={() => {
              onChangeDraft(defaultFilterState());
              onReset();
            }}
          >
            Reset
          </button>
          <button type="button" className="p-1 text-white/40 hover:text-white" aria-label="Close" onClick={onClose}>
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto custom-scrollbar p-3 space-y-4 text-xs">
        <section>
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/45 mb-2">File type</p>
          <div className="flex flex-wrap gap-1.5">
            {FILE_TYPE_CHIPS.map(({ key, label }) => {
              const on = draft.fileTypes.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleFileType(key)}
                  className={cn(
                    "px-2.5 py-1 rounded-full border text-[11px] transition-colors",
                    on ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-white" : "border-white/15 bg-white/[0.04] text-white/70 hover:bg-white/10"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/45 mb-2">Risk level</p>
          <div className="flex flex-wrap gap-1.5">
            {RISK_CHIPS.map(({ key, label, className }) => {
              const on = draft.risks.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleRisk(key)}
                  className={cn("px-2.5 py-1 rounded-full border text-[11px]", on ? className : "border-white/15 bg-white/[0.04] text-white/60 hover:bg-white/10")}
                >
                  {on ? "✓ " : ""}
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/45 mb-2">App / folder</p>
          <input
            value={folderQ}
            onChange={(e) => setFolderQ(e.target.value)}
            placeholder="Search folder or app…"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-white/30 mb-2"
          />
          <div className="max-h-28 overflow-y-auto custom-scrollbar space-y-0.5 rounded-lg border border-white/5 p-1">
            {filteredFolders.includes("__all__") && (
              <button
                type="button"
                className={cn(
                  "w-full text-left px-2 py-1 rounded-md text-[11px]",
                  draft.folders.length === 0 ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5"
                )}
                onClick={() => toggleFolder("__all__")}
              >
                • All folders
              </button>
            )}
            {folderOptions
              .filter((f) => filteredFolders.includes(f))
              .map((f) => (
                <button
                  key={f}
                  type="button"
                  className={cn(
                    "w-full text-left px-2 py-1 rounded-md text-[11px] truncate",
                    draft.folders.includes(f) ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5"
                  )}
                  onClick={() => toggleFolder(f)}
                >
                  • {f}
                </button>
              ))}
            {appOptions.length > 0 && <p className="text-[10px] text-white/35 px-2 pt-1">Apps</p>}
            <button
              type="button"
              className={cn(
                "w-full text-left px-2 py-1 rounded-md text-[11px]",
                draft.appKeys.length === 0 ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5"
              )}
              onClick={() => toggleApp("__all_app__")}
            >
              • All apps
            </button>
            {appOptions.map((a) => (
              <button
                key={a}
                type="button"
                className={cn(
                  "w-full text-left px-2 py-1 rounded-md text-[11px] truncate",
                  draft.appKeys.includes(a) ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5"
                )}
                onClick={() => toggleApp(a)}
              >
                • {a}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="text-[10px] uppercase tracking-[0.12em] text-white/45 mb-2">Sort by</p>
          <div className="flex flex-wrap gap-2">
            <select
              value={draft.primarySort}
              onChange={(e) => onChangeDraft({ ...draft, primarySort: e.target.value as SortKey })}
              className="flex-1 min-w-[120px] bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white/85"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={draft.secondarySort ?? ""}
              onChange={(e) =>
                onChangeDraft({
                  ...draft,
                  secondarySort: e.target.value === "" ? null : (e.target.value as SortKey),
                })
              }
              className="flex-1 min-w-[120px] bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white/85"
            >
              <option value="">Tie-break: none</option>
              {SORT_OPTIONS.map((o) => (
                <option key={`sec-${o.key}`} value={o.key}>
                  Then {o.label}
                </option>
              ))}
            </select>
          </div>
        </section>
      </div>

      <div className="flex items-center justify-end gap-2 px-3 py-2 border-t border-white/10 shrink-0">
        <button type="button" className="btn-secondary px-3 py-1.5 text-[11px]" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary px-3 py-1.5 text-[11px]"
          onClick={() => {
            onApply();
            onClose();
          }}
        >
          Apply filter
        </button>
      </div>
    </div>
  );
}

export function filterStateSummary(state: FilterState): string {
  return JSON.stringify({
    s: state.search,
    ft: [...state.fileTypes].sort(),
    r: [...state.risks].sort(),
    fd: [...state.folders].sort(),
    ak: [...state.appKeys].sort(),
    p: state.primarySort,
    sec: state.secondarySort,
  });
}
