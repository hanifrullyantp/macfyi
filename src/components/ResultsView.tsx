import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Filter,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  Undo2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, memo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { AiItemContext, CleanFinishDetail, ReviewOrbIntent, ScanResult } from "../types";
import { deletePathsPermanently, movePathsToTrash, openUserTrash, revealInFinder } from "../lib/backend";
import type { DeletionModeSetting } from "../lib/deletion-settings";
import { getDeletionMode } from "../lib/deletion-settings";
import { CleanConfirmSheet } from "./results/CleanConfirmSheet";
import { cn } from "../utils/cn";
import type { EnrichedItem, RiskBand } from "../lib/results-types";
import { enrichScanResults, CATEGORY_LABELS } from "../lib/results-types";
import { filterEnriched } from "../lib/filter-engine";
import type { FilterState } from "../lib/filter-state";
import { cloneFilterState, defaultFilterState, countActiveFilterDimensions, isFilterActive } from "../lib/filter-state";
import { buildScanSessionId, initSelectionFromScan, savePersistedSelection } from "../lib/selection-session";
import { buildAppEnrichedGroups, buildAppFileGroups } from "../lib/app-file-index";
import { privacySafeItemInsight } from "../lib/ai-engine";
import { buildItemContextFromInspector } from "./AiAssistantPanel";
import { DelayedTooltip } from "./results/DelayedTooltip";
import { FilterPopover } from "./results/FilterPopover";
import { TriStateCheckbox, categoryTriState } from "./results/TriStateCheckbox";
import { ScanSummaryDashboard } from "./results/ScanSummaryDashboard";
import { CompactSummaryPanelV2 } from "./SummaryPanel/CompactSummaryPanelV2";
import { ResultCardsGrid } from "./ScanResult/ResultCardsGrid";
import {
  buildCardBucketsFromEnriched,
  cardBucketsToList,
  getSafeCleanItemIds,
  sumBytesForIds,
} from "../lib/scanCategories";
import { useI18n } from "../i18n/context";
import { sendClientTelemetry } from "../lib/telemetry";
import { getIsProEntitled } from "../lib/entitlement";
import { marketingCheckoutUrl } from "../lib/marketingUrl";
import { recordDemoCleanUsage, validateDemoClean } from "../lib/demoLimits";
import { FEATURE_FLAGS } from "../lib/featureFlags";
import { inferSummaryContext, transformToSummaryData } from "../lib/transformSummaryData";

interface ResultsViewProps {
  results: ScanResult[];
  onClean: (detail: CleanFinishDetail) => void;
  /** When false, cleaning is blocked with upgrade CTA (non-Pro / demo scan-only). */
  isProEntitled?: boolean;
  onBack?: () => void;
  onPreview?: (path: string) => void;
  title?: string;
  /** Disk capacity (GB) for post-scan summary charts — optional when unknown */
  diskTotalGb?: number;
  /** Free space (GB) — optional when unknown */
  freeGb?: number;
  /** Sync bottom scan orb “cleaning” state with shell chrome */
  onCleaningPhaseChange?: (cleaning: boolean) => void;
  /** Selection totals for AI assistant (counts only — Issue 13) */
  onSelectionStatsChange?: (summary: { count: number; bytesLabel: string } | null) => void;
  /** Main window orb: rescan (summary) or clean (review) */
  onOrbIntentChange?: (intent: ReviewOrbIntent | null) => void;
  /** Start a new scan (orb + toolbar) */
  onRequestRescan?: () => void;
  onAskAi?: (ctx: AiItemContext) => void;
}

function openUpgradeCheckout() {
  window.open(marketingCheckoutUrl(), "_blank", "noopener,noreferrer");
}

type Stage = "summary" | "review" | "cleaning" | "done";

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

function riskColor(risk: RiskBand): string {
  if (risk === "safe") return "bg-emerald-500/20 text-emerald-300 border-emerald-400/30";
  if (risk === "caution") return "bg-amber-500/20 text-amber-300 border-amber-400/30";
  return "bg-red-500/20 text-red-300 border-red-400/30";
}

function riskIcon(risk: RiskBand) {
  if (risk === "safe") return <ShieldCheck size={12} />;
  if (risk === "caution") return <ShieldAlert size={12} />;
  return <TriangleAlert size={12} />;
}

function translateWhatIs(item: EnrichedItem, t: (key: string) => string): string {
  const path = `results.whatIs.${item.categoryKey}`;
  const v = t(path);
  if (v !== path) return v;
  return t("results.whatIs.other");
}

function groupEnrichedByCategory(items: EnrichedItem[]): [string, EnrichedItem[]][] {
  const m = new Map<string, EnrichedItem[]>();
  for (const x of items) {
    const k = x.categoryKey;
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(x);
  }
  return Array.from(m.entries());
}

function RiskBadge({ risk }: { risk: RiskBand }) {
  const { t } = useI18n();
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase", riskColor(risk))}>
      {riskIcon(risk)}
      {t(`results.riskName.${risk}`)}
    </span>
  );
}

const SIMPLE_ROW = 88;

type ResultRowProps = {
  x: EnrichedItem;
  checked: boolean;
  inspectorActive: boolean;
  selectable: boolean;
  onToggle: () => void;
  onInspect: () => void;
  onPreview?: () => void;
  onExclude: () => void;
  showPreview: boolean;
};

const ResultRow = memo(function ResultRow({
  x,
  checked,
  inspectorActive,
  selectable,
  onToggle,
  onInspect,
  onPreview,
  onExclude,
  showPreview,
}: ResultRowProps) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        "group rounded-xl border transition-all duration-200 px-3 py-2.5",
        !selectable && "opacity-50",
        inspectorActive ? "border-blue-400/40 bg-white/10" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={!selectable}
          className={cn(
            "w-4 h-4 rounded border flex items-center justify-center shrink-0",
            checked ? "bg-blue-500 border-blue-500" : "border-white/30 hover:border-white/60"
          )}
        >
          {checked && <CheckCircle2 size={11} className="text-white" fill="currentColor" />}
        </button>
        <button type="button" onClick={onInspect} className="flex-1 text-left min-w-0">
          <DelayedTooltip text={x.item.path}>
            <div className="min-w-0">
              <p className="text-sm text-white font-medium truncate">{x.item.name}</p>
              <p className="text-[11px] text-white/45 truncate">
                {x.categoryLabel} • {translateWhatIs(x, t)}
              </p>
            </div>
          </DelayedTooltip>
        </button>
        <div className="text-right">
          <p className="text-xs text-white/70 tabular-nums">{formatBytes(x.item.size)}</p>
          <p className="text-[10px] text-white/35">{x.item.lastAccessed.toLocaleDateString()}</p>
        </div>
        <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {showPreview && onPreview && (
            <button
              type="button"
              onClick={onPreview}
              className="text-[10px] px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 text-white/80"
            >
              {t("results.preview")}
            </button>
          )}
          <button
            type="button"
            onClick={() => revealInFinder(x.item.path)}
            className="text-[10px] px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 text-white/80 inline-flex items-center gap-1"
          >
            {t("results.revealShort")} <ExternalLink size={10} />
          </button>
          <button
            type="button"
            onClick={onExclude}
            className="text-[10px] px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 text-white/80"
          >
            {t("results.exclude")}
          </button>
        </div>
      </div>
    </div>
  );
});

function VirtualSimpleItemList({
  items,
  selectedIds,
  selectedInspectorId,
  toggleSelected,
  setSelectedInspectorId,
  removeFromSelection,
  onPreview,
  rowSelectable,
}: {
  items: EnrichedItem[];
  selectedIds: Set<string>;
  selectedInspectorId: string | null;
  toggleSelected: (id: string) => void;
  setSelectedInspectorId: (id: string) => void;
  removeFromSelection: (id: string) => void;
  onPreview?: (path: string) => void;
  rowSelectable: (x: EnrichedItem) => boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => SIMPLE_ROW,
    overscan: 12,
    gap: 8,
  });

  return (
    <div
      ref={scrollRef}
      className="max-h-[min(55vh,520px)] overflow-y-auto px-3 pb-3 pt-0 border-t border-white/5 custom-scrollbar"
    >
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const x = items[vi.index];
          const checked = selectedIds.has(x.item.id);
          const sel = rowSelectable(x);
          return (
            <div
              key={x.item.id}
              className="absolute left-0 top-0 w-full px-0"
              style={{
                height: vi.size,
                transform: `translateY(${vi.start}px)`,
              }}
            >
              <ResultRow
                x={x}
                checked={checked}
                selectable={sel}
                inspectorActive={selectedInspectorId === x.item.id}
                onToggle={() => toggleSelected(x.item.id)}
                onInspect={() => setSelectedInspectorId(x.item.id)}
                onPreview={onPreview ? () => onPreview(x.item.path) : undefined}
                onExclude={() => removeFromSelection(x.item.id)}
                showPreview={!!onPreview}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ResultsView = ({
  results,
  onClean,
  onBack,
  onPreview,
  title = "Review Items",
  diskTotalGb,
  freeGb,
  onCleaningPhaseChange,
  onSelectionStatsChange,
  onOrbIntentChange,
  onRequestRescan,
  onAskAi,
  isProEntitled: isProEntitledProp,
}: ResultsViewProps) => {
  const { t } = useI18n();
  const isProEntitled = isProEntitledProp !== undefined ? isProEntitledProp : getIsProEntitled();
  const [stage, setStage] = useState<Stage>("summary");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [recommendedIds, setRecommendedIds] = useState<Set<string>>(() => new Set());
  const [selectedInspectorId, setSelectedInspectorId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<RiskBand, boolean>>({
    safe: true,
    caution: true,
    risky: true,
  });
  const [showWhy, setShowWhy] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [cleaningStep, setCleaningStep] = useState(0);
  const [cleanNote, setCleanNote] = useState<string | null>(null);
  const [cleanedBytes, setCleanedBytes] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [filterBannerDismissed, setFilterBannerDismissed] = useState(false);
  const [cleanSheetOpen, setCleanSheetOpen] = useState(false);
  const [cleanPendingIds, setCleanPendingIds] = useState<Set<string>>(() => new Set());
  const [reviewSafetyMode, setReviewSafetyMode] = useState<"safe" | "advanced">("safe");
  const cleanDebounceRef = useRef(0);
  const [listGroupMode, setListGroupMode] = useState<"risk" | "app">("risk");
  const [inspectorAiText, setInspectorAiText] = useState<string | null>(null);
  const [inspectorAiLoading, setInspectorAiLoading] = useState(false);
  /** When set, review list is limited to items from a result card (Tinjau). */
  const [reviewCardScopeIds, setReviewCardScopeIds] = useState<Set<string> | null>(null);
  const [reviewCardLabel, setReviewCardLabel] = useState<string | null>(null);

  const [appliedFilter, setAppliedFilter] = useState<FilterState>(() => defaultFilterState());
  const [draftFilter, setDraftFilter] = useState<FilterState>(() => defaultFilterState());

  const scanSessionId = useMemo(() => buildScanSessionId(results), [results]);
  const selectedKey = useMemo(() => [...selectedIds].sort().join(","), [selectedIds]);
  const recommendedKey = useMemo(() => [...recommendedIds].sort().join(","), [recommendedIds]);

  const enriched = useMemo<EnrichedItem[]>(() => enrichScanResults(results), [results]);

  const cardBuckets = useMemo(
    () => cardBucketsToList(buildCardBucketsFromEnriched(enriched)),
    [enriched]
  );
  const compactSummaryContext = useMemo(
    () => inferSummaryContext(title, results.map((r) => r.category)),
    [title, results]
  );
  const compactSummaryData = useMemo(
    () =>
      transformToSummaryData(enriched, {
        diskTotalGb,
        freeGb,
        context: compactSummaryContext,
      }),
    [enriched, diskTotalGb, freeGb, compactSummaryContext]
  );
  const safeCleanAllIds = useMemo(() => getSafeCleanItemIds(cardBuckets), [cardBuckets]);
  const safeCleanAllBytes = useMemo(
    () => sumBytesForIds(enriched, safeCleanAllIds),
    [enriched, safeCleanAllIds]
  );

  useEffect(() => {
    const init = initSelectionFromScan(results);
    setRecommendedIds(init.recommendedIds);
    setSelectedIds(init.selectedIds);
  }, [scanSessionId]);

  useEffect(() => {
    setReviewCardScopeIds(null);
    setReviewCardLabel(null);
  }, [scanSessionId]);

  useEffect(() => {
    setSelectedInspectorId((prev) => {
      if (prev && enriched.some((e) => e.item.id === prev)) return prev;
      return enriched[0]?.item.id ?? null;
    });
  }, [enriched]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      savePersistedSelection({
        scanSessionId,
        recommendedIds: [...recommendedIds],
        selectedIds: [...selectedIds],
        savedAt: Date.now(),
      });
    }, 400);
    return () => clearTimeout(t);
  }, [scanSessionId, selectedKey, recommendedKey]);

  const folders = useMemo(() => {
    return Array.from(new Set(enriched.map((x) => x.item.rootFolder).filter(Boolean) as string[])).sort();
  }, [enriched]);

  const appOptions = useMemo(() => buildAppFileGroups(enriched).map((g) => g.appName).filter((n) => n !== "Other"), [enriched]);

  const filtered = useMemo(() => {
    let base = filterEnriched(enriched, appliedFilter);
    if (reviewCardScopeIds && reviewCardScopeIds.size > 0) {
      base = base.filter((x) => reviewCardScopeIds.has(x.item.id));
    }
    return base;
  }, [enriched, appliedFilter, reviewCardScopeIds]);

  const filterActive = isFilterActive(appliedFilter);
  const activeFilterCount = countActiveFilterDimensions(appliedFilter);

  useEffect(() => {
    setFilterBannerDismissed(false);
  }, [appliedFilter]);

  const totalSelectedStats = useMemo(() => {
    let count = 0;
    let bytes = 0;
    for (const x of enriched) {
      if (selectedIds.has(x.item.id)) {
        count++;
        bytes += x.item.size;
      }
    }
    return { count, bytes };
  }, [enriched, selectedKey]);

  const visibleSelectedStats = useMemo(() => {
    let count = 0;
    let bytes = 0;
    for (const x of filtered) {
      if (selectedIds.has(x.item.id)) {
        count++;
        bytes += x.item.size;
      }
    }
    return { count, bytes };
  }, [filtered, selectedKey]);

  const headerSubtitle = filterActive
    ? `${visibleSelectedStats.count} visible selected • ${totalSelectedStats.count} total selected • ${formatBytes(totalSelectedStats.bytes)}`
    : `${totalSelectedStats.count} selected • ${formatBytes(totalSelectedStats.bytes)}`;

  const hasUserModifiedSelection = !setsEqual(selectedIds, recommendedIds);
  const recommendedBytes = useMemo(() => enriched.reduce((acc, x) => acc + (x.item.recommended ? x.item.size : 0), 0), [enriched]);

  const removeFilterChip = useCallback((patch: Partial<FilterState>) => {
    setAppliedFilter((prev) => ({ ...prev, ...patch }));
  }, []);

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    const st = appliedFilter;
    if (st.search.trim())
      chips.push({
        key: "search",
        label: `Search: ${st.search.slice(0, 24)}${st.search.length > 24 ? "…" : ""}`,
        onRemove: () => removeFilterChip({ search: "" }),
      });
    for (const ft of st.fileTypes) {
      chips.push({
        key: `ft-${ft}`,
        label: `Type: ${ft}`,
        onRemove: () =>
          removeFilterChip({ fileTypes: st.fileTypes.filter((x) => x !== ft) }),
      });
    }
    for (const r of st.risks) {
      chips.push({
        key: `risk-${r}`,
        label: `Risk: ${r}`,
        onRemove: () => removeFilterChip({ risks: st.risks.filter((x) => x !== r) }),
      });
    }
    for (const f of st.folders) {
      chips.push({
        key: `fd-${f}`,
        label: `Folder: ${f}`,
        onRemove: () => removeFilterChip({ folders: st.folders.filter((x) => x !== f) }),
      });
    }
    for (const a of st.appKeys) {
      chips.push({
        key: `app-${a}`,
        label: `App: ${a}`,
        onRemove: () => removeFilterChip({ appKeys: st.appKeys.filter((x) => x !== a) }),
      });
    }
    return chips;
  }, [appliedFilter, removeFilterChip]);

  const groupedByRisk = useMemo(() => {
    return {
      safe: filtered.filter((x) => x.risk === "safe"),
      caution: filtered.filter((x) => x.risk === "caution"),
      risky: filtered.filter((x) => x.risk === "risky"),
    };
  }, [filtered]);

  const toggleCategory = useCallback(
    (risk: RiskBand) => {
      if (reviewSafetyMode === "safe" && risk !== "safe") return;
      const ids = groupedByRisk[risk].map((x) => x.item.id);
      const st = categoryTriState(ids, selectedIds);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (st === "checked") {
          for (const id of ids) next.delete(id);
        } else {
          for (const id of ids) next.add(id);
        }
        return next;
      });
    },
    [groupedByRisk, selectedIds, reviewSafetyMode]
  );

  const inspectorItem = useMemo(
    () => enriched.find((x) => x.item.id === selectedInspectorId) ?? null,
    [enriched, selectedInspectorId]
  );

  useEffect(() => {
    if (!inspectorItem) {
      setInspectorAiText(null);
      setInspectorAiLoading(false);
      return;
    }
    setInspectorAiLoading(true);
    const id = window.setTimeout(() => {
      setInspectorAiText(
        privacySafeItemInsight({
          name: inspectorItem.item.name,
          categoryKey: inspectorItem.categoryKey,
          fileType: inspectorItem.item.fileType,
          risk: inspectorItem.risk,
          recommended: inspectorItem.item.recommended,
        })
      );
      setInspectorAiLoading(false);
    }, 400);
    return () => clearTimeout(id);
  }, [inspectorItem]);

  useEffect(() => {
    onSelectionStatsChange?.({
      count: totalSelectedStats.count,
      bytesLabel: formatBytes(totalSelectedStats.bytes),
    });
  }, [totalSelectedStats.count, totalSelectedStats.bytes, onSelectionStatsChange]);

  useEffect(
    () => () => {
      onSelectionStatsChange?.(null);
    },
    [onSelectionStatsChange]
  );

  useEffect(() => {
    if (stage !== "cleaning") return;
    setCleaningStep(0);
    const t = setInterval(() => {
      setCleaningStep((s) => (s >= 2 ? 2 : s + 1));
    }, 900);
    return () => clearInterval(t);
  }, [stage]);

  useEffect(() => {
    onCleaningPhaseChange?.(stage === "cleaning");
  }, [stage, onCleaningPhaseChange]);

  useEffect(
    () => () => {
      onCleaningPhaseChange?.(false);
    },
    [onCleaningPhaseChange]
  );

  const selectRecommended = () => {
    setSelectedIds(new Set(recommendedIds));
    setToast("Restored to AI recommendations");
    window.setTimeout(() => setToast(null), 2800);
  };

  const resetToNone = () => setSelectedIds(new Set());

  const toggleSelected = (id: string) => {
    const row = enriched.find((x) => x.item.id === id);
    if (row && reviewSafetyMode === "safe" && row.risk !== "safe") return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeFromSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const openCleanSheet = useCallback(
    (ids: Set<string>) => {
      if (ids.size === 0) return;
      if (!isProEntitled) {
        void sendClientTelemetry("CleanBlockedNonPro", { where: "sheet" });
        setToast(t("profile.upgradeToClean"));
        window.setTimeout(() => setToast(null), 5000);
        openUpgradeCheckout();
        return;
      }
      const now = Date.now();
      if (now - cleanDebounceRef.current < 400) return;
      cleanDebounceRef.current = now;
      setCleanPendingIds(new Set(ids));
      setCleanSheetOpen(true);
    },
    [isProEntitled, t]
  );

  useEffect(() => {
    if (!onOrbIntentChange) return;
    if (stage === "cleaning" || stage === "done") {
      onOrbIntentChange(null);
      return;
    }
    if (stage === "summary") {
      onOrbIntentChange({ kind: "rescan", onPress: () => onRequestRescan?.() });
      return;
    }
    if (stage === "review") {
      onOrbIntentChange({
        kind: "clean",
        disabled: totalSelectedStats.count === 0 || !isProEntitled,
        onPress: () => openCleanSheet(new Set(selectedIds)),
      });
      return;
    }
    onOrbIntentChange(null);
  }, [
    stage,
    onOrbIntentChange,
    onRequestRescan,
    totalSelectedStats.count,
    selectedKey,
    openCleanSheet,
    selectedIds,
    isProEntitled,
  ]);

  const runClean = async (mode: DeletionModeSetting) => {
    const selected = enriched.filter((x) => cleanPendingIds.has(x.item.id));
    if (selected.length === 0) return;
    const demoGate = validateDemoClean(selected.map((x) => ({ risk: x.risk, size: x.item.size })));
    if (!demoGate.ok) {
      setCleanSheetOpen(false);
      if (!isProEntitled) void sendClientTelemetry("CleanBlockedNonPro", {});
      setToast(demoGate.message);
      window.setTimeout(() => setToast(null), 6500);
      return;
    }
    setCleanSheetOpen(false);
    setStage("cleaning");
    setCleanNote(null);
    try {
      const paths = selected.map((x) => x.item.path);
      const out = mode === "trash" ? await movePathsToTrash(paths) : await deletePathsPermanently(paths);
      if (out.failed.length > 0) {
        setCleanNote(t("done.failedSome", { n: out.failed.length }));
      }
      setCleanedBytes(out.freed_bytes);
      recordDemoCleanUsage(out.succeeded.length, out.freed_bytes);
      const succeededPathSet = new Set(out.succeeded);
      const removedItemIds = selected
        .filter((x) => succeededPathSet.has(x.item.path))
        .map((x) => x.item.id);
      onClean({
        freedBytes: out.freed_bytes,
        succeededCount: out.succeeded.length,
        failedCount: out.failed.length,
        mode,
        sampleNames: selected.slice(0, 50).map((x) => x.item.name),
        removedItemIds,
      });
      setStage("done");
    } catch (err) {
      setCleanNote(err instanceof Error ? err.message : "Cleanup failed.");
      setStage("review");
    }
  };

  const handleSingleBackupAndRemove = () => {
    if (!inspectorItem) return;
    openCleanSheet(new Set([inspectorItem.item.id]));
  };

  if (enriched.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center px-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">No results yet</h2>
          <p className="text-sm text-white/50 mt-2">Run a Smart Scan to generate AI recommendations.</p>
        </div>
      </div>
    );
  }

  if (stage === "cleaning") {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <div className="w-full max-w-xl surface-card p-6">
          <h2 className="text-2xl font-semibold text-white">Cleaning in progress</h2>
          <p className="text-sm text-white/50 mt-1">Backup then remove (to Trash) with verification.</p>
          <div className="mt-5 space-y-2">
            {["Backup snapshot", "Move selected items to Trash", "Verify completion"].map((s, idx) => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", cleaningStep >= idx ? "bg-blue-400" : "bg-white/20")} />
                <p className={cn("text-sm", cleaningStep >= idx ? "text-white/85" : "text-white/40")}>{s}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-700" style={{ width: `${(cleaningStep + 1) * 33}%` }} />
          </div>
        </div>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <div className="w-full max-w-xl surface-card p-7 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/25 border border-emerald-400/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="text-emerald-300" size={34} />
          </div>
          <h2 className="text-3xl font-semibold text-white">{t("done.title")}</h2>
          <p className="text-sm text-white/60 mt-2">
            {t("done.recovered", { size: formatBytes(cleanedBytes || totalSelectedStats.bytes) })}
          </p>
          {cleanNote && <p className="text-xs text-amber-300 mt-3">{cleanNote}</p>}
          <div className="mt-5 flex items-center justify-center gap-2">
          <button 
              type="button"
              onClick={() => openUserTrash()}
              className="btn-secondary"
          >
              <Undo2 size={14} /> {t("done.openTrash")}
          </button>
            {onBack && (
          <button 
                type="button"
            onClick={onBack}
                className="btn-primary"
          >
                {t("common.done")}
          </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (stage === "summary") {
    return (
      <div className="h-full min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar border-b border-white/10 px-4 py-4">
          <div
            className={
              FEATURE_FLAGS.USE_COMPACT_SUMMARY_PANEL
                ? "block shrink-0"
                : "hidden shrink-0"
            }
          >
            <CompactSummaryPanelV2
              data={compactSummaryData}
              context={compactSummaryContext}
            />
          </div>
          <ResultCardsGrid
            buckets={cardBuckets}
            onReviewCard={(b) => {
              setReviewCardScopeIds(new Set(b.itemIds));
              setReviewCardLabel(b.def.label);
              setStage("review");
            }}
            onClean={(ids) => openCleanSheet(new Set(ids))}
            onRescan={onRequestRescan}
            safeCleanAllIds={safeCleanAllIds}
            safeCleanAllBytes={safeCleanAllBytes}
          />
          <div
            className={
              FEATURE_FLAGS.USE_COMPACT_SUMMARY_PANEL
                ? "hidden"
                : "block"
            }
          >
            <ScanSummaryDashboard
              title={title}
              enriched={enriched}
              results={results}
              recommendedBytes={recommendedBytes}
              diskTotalGb={diskTotalGb}
              freeGb={freeGb}
              showWhy={showWhy}
              onToggleWhy={() => setShowWhy((v) => !v)}
              onReview={() => {
                setReviewCardScopeIds(null);
                setReviewCardLabel(null);
                setStage("review");
              }}
              onCleanSafely={() =>
                openCleanSheet(new Set(enriched.filter((x) => x.item.recommended).map((x) => x.item.id)))
              }
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex relative">
      {toast && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-sm text-white shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="relative z-10 px-4 py-3 border-b border-white/10 bg-[#0b0c10]/95 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white drop-shadow-sm">{t("results.title")}</h2>
              <p className="text-[11px] text-white/60">{headerSubtitle}</p>
              {hasUserModifiedSelection && (
                <p className="text-[10px] text-amber-300/90 mt-1">↩ Modified — tap &quot;Select Recommended&quot; to restore AI picks</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={selectRecommended}
                className="btn-secondary px-3 py-1.5 text-xs bg-blue-500/20 border-blue-500/30 text-blue-300"
              >
                Select Recommended
              </button>
              <button type="button" onClick={resetToNone} className="btn-secondary px-3 py-1.5 text-xs">
                Reset to None
              </button>
              <button
                type="button"
                onClick={() => setShowWhy((v) => !v)}
                className="btn-secondary px-3 py-1.5 text-xs"
              >
                {t("results.why")}
              </button>
              {onRequestRescan && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(t("results.rescanConfirm"))) onRequestRescan();
                  }}
                  className="btn-secondary px-3 py-1.5 text-xs"
                >
                  {t("results.rescanToolbar")}
                </button>
              )}
            </div>
          </div>
          {reviewCardLabel && (
            <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/15 bg-cyan-500/5 text-[11px]">
              <span className="text-cyan-100/90">
                {t("results.cardReviewBanner", { name: reviewCardLabel })}
              </span>
              <button
                type="button"
                onClick={() => {
                  setReviewCardScopeIds(null);
                  setReviewCardLabel(null);
                }}
                className="shrink-0 text-cyan-300 hover:text-cyan-200 underline font-medium"
              >
                {t("results.showAllCategories")}
              </button>
            </div>
          )}
          <div className="px-4 pb-2 flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.12em] text-white/40">Cleaning mode</span>
            <div className="bg-white/5 p-0.5 rounded-lg inline-flex">
              <button
                type="button"
                onClick={() => setReviewSafetyMode("safe")}
                className={cn(
                  "px-3 py-1 text-[11px] rounded-md",
                  reviewSafetyMode === "safe" ? "bg-emerald-500/25 text-emerald-200 border border-emerald-500/30" : "text-white/45"
                )}
              >
                Safe clean
              </button>
              <button
                type="button"
                onClick={() => setReviewSafetyMode("advanced")}
          className={cn(
                  "px-3 py-1 text-[11px] rounded-md",
                  reviewSafetyMode === "advanced" ? "bg-orange-500/20 text-orange-200 border border-orange-500/35" : "text-white/45"
                )}
              >
                Advanced
              </button>
            </div>
            {reviewSafetyMode === "safe" && (
              <span className="text-[10px] text-emerald-300/80">Only SAFE items can be selected</span>
            )}
          </div>
          {reviewSafetyMode === "advanced" && (
            <div className="px-4 pb-2 text-[11px] text-amber-200/85 bg-amber-500/5 border border-amber-500/15 rounded-lg mx-4 mb-2 py-2">
              Advanced mode: caution and risky items can be selected. Review carefully before cleaning.
            </div>
          )}
          {showWhy && (
            <div className="mt-2 text-xs text-white/55">
              AI picks items that are safe to remove based on usage age, duplicate confidence, and known temporary locations.
            </div>
          )}
      </div>

        {filterActive && !filterBannerDismissed && (
          <div className="px-4 py-2 flex items-start justify-between gap-2 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-100/90">
            <span>
              Filter active: showing {filtered.length} of {enriched.length} items. {totalSelectedStats.count} total selected (all items, not
              only visible).
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="text-amber-200 underline"
                onClick={() => {
                  setAppliedFilter(defaultFilterState());
                  setDraftFilter(defaultFilterState());
                }}
              >
                Clear filter
              </button>
            <button 
                type="button"
                className="p-0.5 text-amber-200/80 hover:text-white"
                aria-label="Dismiss banner"
                onClick={() => setFilterBannerDismissed(true)}
              >
                <X size={14} />
              </button>
                  </div>
                </div>
        )}

        <div className="px-4 py-2 border-b border-white/5 bg-black/10">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <input
                value={appliedFilter.search}
                onChange={(e) => setAppliedFilter((p) => ({ ...p, search: e.target.value }))}
                placeholder="Search by name or path"
                className="w-64 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none"
              />
              {appliedFilter.search && (
                <button
                  type="button"
                  onClick={() => setAppliedFilter((p) => ({ ...p, search: "" }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/80"
                >
                  <X size={12} />
                </button>
              )}
              </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setDraftFilter(cloneFilterState(appliedFilter));
                  setShowFilters((v) => !v);
                }}
                className="btn-secondary px-3 py-1.5 text-xs"
              >
                <Filter size={12} /> Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
              {showFilters && (
                <FilterPopover
                  draft={draftFilter}
                  onChangeDraft={setDraftFilter}
                  folderOptions={folders}
                  appOptions={appOptions}
                  onApply={() => setAppliedFilter(cloneFilterState(draftFilter))}
                  onReset={() => {
                    const empty = defaultFilterState();
                    setDraftFilter(empty);
                    setAppliedFilter(empty);
                  }}
                  onClose={() => setShowFilters(false)}
                />
              )}
                </div>
              </div>
          {activeChips.length > 0 && (
            <div className="flex gap-1.5 mt-2 overflow-x-auto custom-scrollbar pb-0.5">
              {activeChips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={c.onRemove}
                  className="inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] text-white/80 hover:bg-white/15"
                >
                  {c.label}
                  <X size={10} />
            </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 p-4 pb-28 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="mb-3 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-[0.12em] text-white/40">Group list</span>
              <div className="bg-white/5 p-0.5 rounded-lg inline-flex">
                <button
                  type="button"
                  onClick={() => setListGroupMode("risk")}
                  className={cn(
                    "px-3 py-1 text-[11px] rounded-md",
                    listGroupMode === "risk" ? "bg-white/15 text-white" : "text-white/45"
                  )}
                >
                  By risk
                </button>
                <button
                  type="button"
                  onClick={() => setListGroupMode("app")}
                        className={cn(
                    "px-3 py-1 text-[11px] rounded-md",
                    listGroupMode === "app" ? "bg-white/15 text-white" : "text-white/45"
                  )}
                >
                  By app
                </button>
                          </div>
                        </div>
          {listGroupMode === "risk" ? (
              <div className="space-y-3">
                {(["safe", "caution", "risky"] as const).map((risk) => {
                  const list = groupedByRisk[risk];
                  if (list.length === 0) return null;
                  const ids = list.map((x) => x.item.id);
                  const selN = ids.filter((id) => selectedIds.has(id)).length;
                  const groupBytes = list.reduce((a, x) => a + x.item.size, 0);
                  const selBytes = list.filter((x) => selectedIds.has(x.item.id)).reduce((a, x) => a + x.item.size, 0);
                  return (
                    <div key={risk} className="surface-card overflow-hidden">
                      <div className="w-full px-3 py-2.5 flex items-center gap-2 border-b border-white/5 hover:bg-white/[0.03]">
                        <TriStateCheckbox
                          state={categoryTriState(ids, selectedIds)}
                          onClick={() => toggleCategory(risk)}
                          disabled={reviewSafetyMode === "safe" && risk !== "safe"}
                          aria-label={`Select category ${risk}`}
                        />
                        <button
                          type="button"
                          className="flex-1 flex items-center gap-2 min-w-0 text-left"
                          onClick={() => setExpanded((prev) => ({ ...prev, [risk]: !prev[risk] }))}
                        >
                          <RiskBadge risk={risk} />
                          <span className="text-xs text-white/70">
                            {list.length} items • {selN} selected • {formatBytes(selBytes)} / {formatBytes(groupBytes)}
                            </span>
                        </button>
                        <button
                          type="button"
                          className="p-1 text-white/45 shrink-0"
                          aria-label={expanded[risk] ? "Collapse" : "Expand"}
                          onClick={() => setExpanded((prev) => ({ ...prev, [risk]: !prev[risk] }))}
                        >
                          {expanded[risk] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </div>
                      {expanded[risk] && (
                        <VirtualSimpleItemList
                          items={list}
                          selectedIds={selectedIds}
                          selectedInspectorId={selectedInspectorId}
                          toggleSelected={toggleSelected}
                          setSelectedInspectorId={setSelectedInspectorId}
                          removeFromSelection={removeFromSelection}
                          onPreview={onPreview}
                          rowSelectable={(x) => reviewSafetyMode === "advanced" || x.risk === "safe"}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {buildAppEnrichedGroups(filtered).map((app) => (
                  <div key={app.appName} className="surface-card overflow-hidden">
                    <div className="px-3 py-2.5 border-b border-white/10 bg-white/[0.03] flex justify-between gap-2 items-baseline">
                      <span className="text-sm font-semibold text-white">{app.appName}</span>
                      <span className="text-[11px] text-white/45 tabular-nums shrink-0">{formatBytes(app.totalSize)}</span>
                    </div>
                    {groupEnrichedByCategory(app.items).map(([catKey, items]) => (
                      <div key={`${app.appName}-${catKey}`}>
                        <div className="px-3 pt-2.5 pb-0.5 text-[10px] uppercase tracking-wide text-white/40">
                          {CATEGORY_LABELS[catKey] ?? catKey}
                        </div>
                        <VirtualSimpleItemList
                          items={items}
                          selectedIds={selectedIds}
                          selectedInspectorId={selectedInspectorId}
                          toggleSelected={toggleSelected}
                          setSelectedInspectorId={setSelectedInspectorId}
                          removeFromSelection={removeFromSelection}
                          onPreview={onPreview}
                          rowSelectable={(x) => reviewSafetyMode === "advanced" || x.risk === "safe"}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
        </div>

      </div>

      <CleanConfirmSheet
        open={cleanSheetOpen}
        onClose={() => setCleanSheetOpen(false)}
        onConfirm={runClean}
        items={enriched.filter((x) => cleanPendingIds.has(x.item.id))}
        defaultDeletionMode={getDeletionMode()}
        filterActive={filterActive}
        filteredCount={filtered.length}
        totalCount={enriched.length}
      />

      <aside className="w-[320px] border-l border-white/10 bg-black/20 p-4 overflow-y-auto custom-scrollbar">
        {!inspectorItem ? (
          <p className="text-sm text-white/45">{t("results.inspectorEmpty")}</p>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-white leading-tight">{inspectorItem.item.name}</h3>
              <div className="mt-1">
                <RiskBadge risk={inspectorItem.risk} />
              </div>
            </div>
            <div className="surface-card-soft p-3 space-y-2">
              <p className="text-[11px] text-white/50 uppercase tracking-[0.12em]">{t("results.inspectorDetails")}</p>
              <p className="text-xs text-white/70 break-all">{inspectorItem.item.path}</p>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(inspectorItem.item.path).catch(() => {})}
                className="text-xs text-blue-300 hover:text-blue-200"
              >
                {t("results.copyPath")}
              </button>
              <p className="text-xs text-white/55">{t("results.sizeLabel", { size: formatBytes(inspectorItem.item.size) })}</p>
              <p className="text-xs text-white/55">
                {t("results.lastUsedLabel", { date: inspectorItem.item.lastAccessed.toLocaleString() })}
              </p>
            </div>
            <div className="surface-card-soft p-3 space-y-2">
              <p className="text-[11px] text-white/50 uppercase tracking-[0.12em]">{t("results.inspectorWhatIs")}</p>
              <p className="text-xs text-white/70">{translateWhatIs(inspectorItem, t)}</p>
                    </div>
            <div className="surface-card-soft p-3 space-y-2">
              <p className="text-[11px] text-white/50 uppercase tracking-[0.12em]">{t("results.inspectorWhy")}</p>
              <p className="text-xs text-white/70">{inspectorItem.item.reason ?? inspectorItem.categoryRecommendation}</p>
              <p className="text-[11px] text-white/45">
                {t("results.confidencePct", { pct: (inspectorItem.categoryConfidence * 100).toFixed(0) })}
                    </p>
                  </div>
            <div className="surface-card-soft p-3 space-y-2">
              <p className="text-[11px] text-white/50 uppercase tracking-[0.12em]">{t("results.inspectorRiskImpact")}</p>
              <p className="text-xs text-white/70">{t(`results.riskImpact.${inspectorItem.risk}`)}</p>
            </div>
            <div className="surface-card-soft p-3 space-y-2 border border-blue-500/15">
              <p className="text-[11px] text-white/50 uppercase tracking-[0.12em]">{t("results.inspectorAi")}</p>
              {inspectorAiLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-3 bg-white/10 rounded w-full" />
                  <div className="h-3 bg-white/10 rounded w-4/5" />
                </div>
              ) : (
                <p className="text-xs text-white/70 leading-relaxed">{inspectorAiText}</p>
              )}
              <p className="text-[10px] text-white/35 leading-snug">
                {t("results.inspectorAiNote")}
              </p>
              {onAskAi && (
                <button
                  type="button"
                  onClick={() => {
                    if (!inspectorItem) return;
                    onAskAi(
                      buildItemContextFromInspector({
                        category: inspectorItem.categoryKey,
                        appHint: inspectorItem.item.associatedApp,
                        sizeBytes: inspectorItem.item.size,
                        riskBand: inspectorItem.risk,
                        shortExplanation: inspectorItem.item.reason ?? inspectorItem.categoryRecommendation,
                        basenameHint: inspectorItem.item.name,
                      })
                    );
                  }}
                  className="w-full btn-secondary text-xs mt-2"
                >
                  Tanya AI (lokal)
                </button>
              )}
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => revealInFinder(inspectorItem.item.path)}
                className="w-full btn-secondary text-xs"
              >
                {t("results.revealFinder")}
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds((prev) => {
                  const next = new Set(prev);
                  next.delete(inspectorItem.item.id);
                  return next;
                })}
                className="w-full btn-secondary text-xs"
              >
                {t("results.exclude")}
              </button>
              <button
                type="button"
                onClick={handleSingleBackupAndRemove}
                className="w-full btn-primary text-xs"
              >
                {t("results.backupRemove")}
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};
