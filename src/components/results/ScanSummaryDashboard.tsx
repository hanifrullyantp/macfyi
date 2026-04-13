import { AnimatePresence, animate, motion } from "framer-motion";
import {
  CheckCircle2,
  Info,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ScanResult } from "../../types";
import { useI18n } from "../../i18n/context";
import {
  aggregateByCategory,
  aggregateRiskBuckets,
  byteSharePct,
  countRecommendedItems,
  countSharePct,
  estimateCleanMinutesRecommended,
  totalScanBytes,
} from "../../lib/scan-summary-stats";
import { CATEGORY_LABELS, type EnrichedItem, type RiskBand } from "../../lib/results-types";
import { cn } from "../../utils/cn";

const GB = 1024 ** 3;
const CATEGORY_CHART_COLORS = [
  "#5b8def",
  "#3ecf8e",
  "#e6c84d",
  "#e89b5e",
  "#e76b7a",
  "#a78bfa",
  "#67e8f9",
  "#f472b6",
  "#94a3b8",
];

function formatBytes(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function riskBadgeClass(risk: RiskBand): string {
  if (risk === "safe") return "bg-emerald-500/15 text-emerald-300/95 border-emerald-400/25";
  if (risk === "caution") return "bg-amber-500/15 text-amber-300/95 border-amber-400/25";
  return "bg-red-500/12 text-red-300/90 border-red-400/22";
}

function riskIconSmall(risk: RiskBand) {
  if (risk === "safe") return <ShieldCheck size={12} />;
  if (risk === "caution") return <ShieldAlert size={12} />;
  return <TriangleAlert size={12} />;
}

function useCountUp(to: number, duration = 1.1) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const c = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setV(latest),
    });
    return () => c.stop();
  }, [to, duration]);
  return v;
}

function AnimatedByteBar({
  value,
  className,
  delay = 0,
  style,
}: {
  value: number;
  className?: string;
  delay?: number;
  style?: CSSProperties;
}) {
  return (
    <motion.div
      className={cn("h-2 rounded-full", className)}
      style={style}
      initial={{ width: 0 }}
      animate={{ width: `${value}%` }}
      transition={{ duration: 0.85, delay, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}

function SummaryRiskBadge({ risk }: { risk: RiskBand }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide",
        riskBadgeClass(risk)
      )}
    >
      {riskIconSmall(risk)}
      {t(`results.riskName.${risk}`)}
    </span>
  );
}

export interface ScanSummaryDashboardProps {
  title: string;
  enriched: EnrichedItem[];
  results: ScanResult[];
  recommendedBytes: number;
  diskTotalGb?: number;
  freeGb?: number;
  showWhy: boolean;
  onToggleWhy: () => void;
  onReview: () => void;
  onCleanSafely: () => void;
}

export function ScanSummaryDashboard({
  title,
  enriched,
  results,
  recommendedBytes,
  diskTotalGb = 0,
  freeGb = 0,
  showWhy,
  onToggleWhy,
  onReview,
  onCleanSafely,
}: ScanSummaryDashboardProps) {
  const { t } = useI18n();
  const riskAgg = useMemo(() => aggregateRiskBuckets(enriched), [enriched]);
  const scanTotalBytes = useMemo(() => totalScanBytes(enriched), [enriched]);
  const categorySlices = useMemo(
    () => aggregateByCategory(enriched, CATEGORY_LABELS),
    [enriched]
  );
  const recommendedGb = recommendedBytes / GB;
  const diskOk = diskTotalGb > 0;
  const usedGb = diskOk ? Math.max(0, diskTotalGb - freeGb) : 0;
  const afterUsedGb = diskOk ? Math.max(0, usedGb - recommendedGb) : 0;
  const usedDiskPct = diskOk ? Math.min(100, (usedGb / diskTotalGb) * 100) : 0;
  const afterDiskPct = diskOk ? Math.min(100, (afterUsedGb / diskTotalGb) * 100) : 0;
  const totalItems = enriched.length;
  const recommendedCount = useMemo(() => countRecommendedItems(enriched), [enriched]);
  const estMinutes = estimateCleanMinutesRecommended(recommendedCount);
  const pctOfDiskFromRecommended =
    diskOk && diskTotalGb > 0 ? Math.min(100, (recommendedGb / diskTotalGb) * 100) : 0;

  const donutData = useMemo(() => {
    const other = Math.max(0, scanTotalBytes - recommendedBytes);
    if (recommendedBytes <= 0 && other <= 0) {
      return [{ name: "empty", value: 1, fill: "rgba(255,255,255,0.08)" }];
    }
    if (recommendedBytes <= 0) {
      return [{ name: "other", value: other, fill: "rgba(148,163,184,0.45)" }];
    }
    if (other <= 0) {
      return [{ name: "rec", value: recommendedBytes, fill: "rgba(94,234,212,0.85)" }];
    }
    return [
      { name: "rec", value: recommendedBytes, fill: "rgba(94,234,212,0.9)" },
      { name: "other", value: other, fill: "rgba(148,163,184,0.35)" },
    ];
  }, [recommendedBytes, scanTotalBytes]);

  const categoryPieData = useMemo(
    () =>
      categorySlices.map((s, i) => ({
        name: s.label,
        value: s.bytes,
        fill: CATEGORY_CHART_COLORS[i % CATEGORY_CHART_COLORS.length],
      })),
    [categorySlices]
  );

  const countSafe = riskAgg.safe.count;
  const countCaution = riskAgg.caution.count;
  const countRisky = riskAgg.risky.count;
  const safeItemPct = countSharePct(countSafe, totalItems);
  const cautionItemPct = countSharePct(countCaution, totalItems);
  const riskyItemPct = countSharePct(countRisky, totalItems);

  const animatedRecommendedGb = useCountUp(recommendedGb, 1.05);
  const animatedPctDisk = useCountUp(pctOfDiskFromRecommended, 1.2);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-6 py-6 md:px-8 pb-32">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h2 className="text-[30px] leading-[36px] font-semibold text-white tracking-tight">{title}</h2>
          <p className="text-sm text-white/50 mt-1">{t("results.summary.scanSubtitle")}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-5 md:p-6 border-white/[0.08] hover:border-white/12 transition-colors"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40 flex items-center gap-2">
            <Sparkles className="text-cyan-400/90" size={14} />
            {t("results.summary.aiRecommendation")}
          </p>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-center">
            <div className="relative h-[220px] w-full max-w-[300px] mx-auto lg:mx-0">
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 text-center px-4">
                <p className="text-3xl font-bold text-white tabular-nums tracking-tight">
                  {formatBytes(animatedRecommendedGb * GB)}
                </p>
                <p className="text-[11px] text-white/45 mt-1 max-w-[9rem] leading-snug">
                  {t("results.summary.canFree")}
                </p>
                {diskOk && (
                  <p className="text-[10px] text-white/35 mt-1 tabular-nums">
                    {t("results.summary.pctOfDisk", { pct: animatedPctDisk.toFixed(1) })}
                  </p>
                )}
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="62%"
                    outerRadius="88%"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={1}
                    paddingAngle={donutData.length > 1 ? 2 : 0}
                    isAnimationActive
                    animationDuration={900}
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "rgba(20,21,28,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      fontSize: 11,
                    }}
                    formatter={(value: number) => formatBytes(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
                {t("results.summary.storageOverview")}
              </p>
              <dl className="space-y-2.5">
                <div className="flex justify-between gap-3 text-sm">
                  <dt className="text-white/50">{t("results.summary.totalStorage")}</dt>
                  <dd className="font-semibold text-white tabular-nums">
                    {diskOk ? `${diskTotalGb.toFixed(0)} GB` : t("results.summary.diskUnknown")}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <dt className="text-white/50">{t("results.summary.usedNow")}</dt>
                  <dd className="font-semibold text-white tabular-nums">
                    {diskOk ? `${usedGb.toFixed(1)} GB` : t("results.summary.diskUnknown")}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <dt className="text-white/50">{t("results.summary.canFree")}</dt>
                  <dd className="font-semibold text-cyan-300/95 tabular-nums">{formatBytes(recommendedBytes)}</dd>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <dt className="text-white/50">{t("results.summary.afterClean")}</dt>
                  <dd className="font-semibold text-white tabular-nums">
                    {diskOk ? `${afterUsedGb.toFixed(1)} GB` : t("results.summary.diskUnknown")}
                  </dd>
                </div>
              </dl>

              {diskOk && (
                <div className="space-y-2 pt-1">
                  <div>
                    <div className="flex justify-between text-[10px] text-white/40 mb-1">
                      <span>{t("results.summary.usedPct")}</span>
                      <span className="tabular-nums">{usedDiskPct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <AnimatedByteBar value={usedDiskPct} className="bg-gradient-to-r from-slate-500/90 to-slate-400/70" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-white/40 mb-1">
                      <span>{t("results.summary.afterCleanPct")}</span>
                      <span className="tabular-nums">{afterDiskPct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                      <AnimatedByteBar
                        value={afterDiskPct}
                        delay={0.12}
                        className="bg-gradient-to-r from-teal-500/85 to-cyan-500/75"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="mt-5 text-sm text-white/55 text-center lg:text-left">
            {t("results.summary.breathingRoom", { size: formatBytes(recommendedBytes) })}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-2">
            <button type="button" onClick={onReview} className="btn-secondary">
              {t("results.summary.reviewItems")}
            </button>
            <button type="button" onClick={onCleanSafely} className="btn-primary">
              <Sparkles size={14} className="opacity-90" />
              {t("results.summary.cleanSafely")}
            </button>
            <button type="button" onClick={onToggleWhy} className="btn-secondary px-3 py-2 text-white/80">
              <Info size={14} /> {t("results.summary.whyThese")}
            </button>
          </div>

          <AnimatePresence>
            {showWhy && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 surface-card-soft bg-black/20 border-white/[0.06] p-4 space-y-2">
                  <p className="text-sm text-white/70">{t("results.summary.whyExplainer")}</p>
                  {results.slice(0, 3).map((r) => (
                    <p key={r.category} className="text-xs text-white/50">
                      <span className="text-white/75 font-medium">{CATEGORY_LABELS[r.category] ?? r.category}</span>
                      {": "}
                      {r.recommendation} ({t("results.confidencePct", { pct: (r.confidence * 100).toFixed(0) })})
                    </p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(["safe", "caution", "risky"] as const).map((risk) => {
            const stats = riskAgg[risk];
            const bytePct = byteSharePct(stats.bytes, scanTotalBytes);
            const hintKey =
              risk === "safe"
                ? "results.summary.riskSafeHint"
                : risk === "caution"
                  ? "results.summary.riskCautionHint"
                  : "results.summary.riskRiskyHint";
            return (
              <motion.div
                key={risk}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: risk === "safe" ? 0 : risk === "caution" ? 0.05 : 0.1 }}
                className="surface-card-soft p-4 border-white/[0.07] hover:border-white/12 hover:bg-white/[0.035] transition-all duration-200"
              >
                <SummaryRiskBadge risk={risk} />
                <p className="text-2xl font-bold text-white mt-3 tabular-nums">
                  {t("results.summary.itemsCount", { n: stats.count })}
                </p>
                <div className="mt-2 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <AnimatedByteBar
                    value={bytePct}
                    className={cn(
                      risk === "safe" && "bg-emerald-500/75",
                      risk === "caution" && "bg-amber-500/75",
                      risk === "risky" && "bg-red-500/55"
                    )}
                  />
                </div>
                <p className="text-[10px] text-white/40 mt-1 tabular-nums text-right">{bytePct.toFixed(0)}%</p>
                <p className="text-lg font-semibold text-white/90 mt-2 tabular-nums">{formatBytes(stats.bytes)}</p>
                <p className="text-xs text-white/45 mt-1 leading-snug">{t(hintKey)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {risk === "safe" && (
                    <>
                      <button type="button" onClick={onReview} className="btn-secondary text-xs py-1.5 px-3">
                        {t("results.summary.review")}
                      </button>
                      <button type="button" onClick={onCleanSafely} className="btn-primary text-xs py-1.5 px-3">
                        {t("results.summary.cleanAll")}
                      </button>
                    </>
                  )}
                  {risk === "caution" && (
                    <button type="button" onClick={onReview} className="btn-secondary text-xs py-1.5 px-3 w-full md:w-auto">
                      {t("results.summary.reviewBeforeDelete")}
                    </button>
                  )}
                  {risk === "risky" && stats.count === 0 && (
                    <p className="text-xs text-emerald-400/85 flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      {t("results.summary.youreSafe")}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {categorySlices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface-card p-5 md:p-6 border-white/[0.08]"
          >
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="text-base" aria-hidden>
                📊
              </span>
              {t("results.summary.whatCanBeCleaned")}
            </h3>
            <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <div className="h-[220px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="48%"
                      outerRadius="78%"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth={1}
                      paddingAngle={1}
                      isAnimationActive
                      animationDuration={800}
                    >
                      {categoryPieData.map((_, i) => (
                        <Cell key={i} fill={categoryPieData[i].fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "rgba(20,21,28,0.95)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 10,
                        fontSize: 11,
                      }}
                      formatter={(value: number) => formatBytes(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-3 min-w-0">
                {categorySlices.map((s, i) => {
                  const pct = byteSharePct(s.bytes, scanTotalBytes);
                  const fill = CATEGORY_CHART_COLORS[i % CATEGORY_CHART_COLORS.length];
                  return (
                    <li key={s.categoryKey} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-white/85 font-medium truncate flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: fill }} />
                          {s.label}
                        </span>
                        <span className="text-white/70 tabular-nums shrink-0">{formatBytes(s.bytes)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <AnimatedByteBar value={pct} style={{ backgroundColor: fill }} />
                      </div>
                      <p className="text-[10px] text-white/35 tabular-nums text-right">{pct.toFixed(0)}%</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card p-5 md:p-6 border-white/[0.08]"
        >
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="text-base" aria-hidden>
              🛡️
            </span>
            {t("results.summary.safetyAnalysis")}
          </h3>
          <div className="mt-4 h-3 rounded-full bg-white/[0.06] overflow-hidden flex">
            <motion.div
              className="h-full bg-emerald-500/80"
              initial={{ width: 0 }}
              animate={{ width: `${safeItemPct}%` }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.div
              className="h-full bg-amber-500/75"
              initial={{ width: 0 }}
              animate={{ width: `${cautionItemPct}%` }}
              transition={{ duration: 0.85, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.div
              className="h-full bg-red-500/55"
              initial={{ width: 0 }}
              animate={{ width: `${riskyItemPct}%` }}
              transition={{ duration: 0.85, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div>
              <p className="text-white/45">{t("results.riskName.safe")}</p>
              <p className="text-white font-semibold tabular-nums">
                {countSafe} · {safeItemPct.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-white/45">{t("results.riskName.caution")}</p>
              <p className="text-white font-semibold tabular-nums">
                {countCaution} · {cautionItemPct.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-white/45">{t("results.riskName.risky")}</p>
              <p className="text-white font-semibold tabular-nums">
                {countRisky} · {riskyItemPct.toFixed(1)}%
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/65">
            {countRisky === 0 ? t("results.summary.safetyGreatNews") : t("results.summary.safetyHasRisky")}
          </p>
          <p className="text-xs text-white/45 mt-2">{t("results.summary.safetyAiSafe")}</p>
          <p className="text-[11px] text-white/40 mt-3 tabular-nums">
            {t("results.summary.estCleanTime", { n: estMinutes })}
          </p>
        </motion.div>

        {diskOk && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface-card p-5 md:p-6 border-white/[0.08]"
          >
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap className="text-amber-400/90" size={18} />
              {t("results.summary.potentialImpact")}
            </h3>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-3 items-center">
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/40 mb-2">{t("results.summary.before")}</p>
                <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden">
                  <AnimatedByteBar value={usedDiskPct} className="bg-slate-400/80" />
                </div>
                <p className="text-xs text-white/75 mt-2 tabular-nums">
                  {usedGb.toFixed(1)} GB / {diskTotalGb.toFixed(0)} GB
                </p>
                <p className="text-[10px] text-white/40 tabular-nums">{usedDiskPct.toFixed(1)}% used</p>
              </div>
              <span className="hidden md:block text-white/25 text-lg px-1">→</span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-white/40 mb-2">
                  {t("results.summary.afterCleaning")}
                </p>
                <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden">
                  <AnimatedByteBar value={afterDiskPct} delay={0.1} className="bg-teal-500/80" />
                </div>
                <p className="text-xs text-white/75 mt-2 tabular-nums">
                  {afterUsedGb.toFixed(1)} GB / {diskTotalGb.toFixed(0)} GB
                </p>
                <p className="text-[10px] text-white/40 tabular-nums">{afterDiskPct.toFixed(1)}% used</p>
              </div>
            </div>
            <div className="mt-5 rounded-xl border border-amber-500/15 bg-amber-500/[0.06] px-4 py-3">
              <p className="text-sm font-medium text-amber-200/95">{t("results.summary.performanceBoost")}</p>
              <p className="text-xs text-white/55 mt-1">{t("results.summary.performanceHint")}</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
