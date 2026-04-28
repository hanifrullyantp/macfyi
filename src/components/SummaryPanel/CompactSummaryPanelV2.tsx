import { AnimatePresence, motion } from "framer-motion";
import { forwardRef, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { formatBytes } from "../../lib/formatters";
import type { CategorySummary, SummaryContext, SummaryData } from "../../lib/transformSummaryData";

type TooltipState = {
  visible: boolean;
  x: number;
  y: number;
  data: CategorySummary | null;
};

type DonutSegment = CategorySummary & {
  offset: number;
  dash: number;
};

type DonutChartProps = {
  categories: CategorySummary[];
  canFree: number;
  totalDisk: number;
  hoveredSegment: string | null;
  onSegmentHover: (seg: DonutSegment | null, e: ReactMouseEvent<SVGCircleElement> | null) => void;
};

const CONTEXT_TITLES: Record<SummaryContext, string> = {
  all: "Ringkasan pembersihan",
  junk: "Ringkasan Junk Cleanup",
  myfiles: "Ringkasan My Files",
};

export function CompactSummaryPanelV2({
  data,
  context = "all",
}: {
  data: SummaryData;
  context?: SummaryContext;
}) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    data: null,
  });
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const donutRef = useRef<SVGSVGElement>(null);

  const diskUsedPct = data.totalDisk > 0 ? (data.usedDisk / data.totalDisk) * 100 : 0;
  const afterCleanPct = data.totalDisk > 0 ? (data.afterClean / data.totalDisk) * 100 : 0;
  const freePct = data.totalDisk > 0 ? (data.canFree / data.totalDisk) * 100 : 0;

  const totalRisk = data.safeCount + data.cautionCount + data.riskyCount;
  const safePct = totalRisk > 0 ? (data.safeCount / totalRisk) * 100 : 0;
  const cautionPct = totalRisk > 0 ? (data.cautionCount / totalRisk) * 100 : 0;

  const bars = useMemo(() => {
    return data.categories.slice(0, 4);
  }, [data.categories]);

  return (
    <div className="bg-[#1a1a2e]/80 border border-white/10 rounded-2xl p-4 mb-4">
      <p className="text-[10px] uppercase tracking-[0.12em] text-white/45 mb-3 font-semibold">{CONTEXT_TITLES[context]}</p>
      <div className="flex items-start gap-5">
        <div className="flex-shrink-0 relative">
          <DonutChartSmall
            ref={donutRef}
            categories={data.categories}
            canFree={data.canFree}
            totalDisk={data.totalDisk}
            hoveredSegment={hoveredSegment}
            onSegmentHover={(seg, e) => {
              if (seg && e && donutRef.current) {
                const rect = donutRef.current.getBoundingClientRect();
                setTooltip({
                  visible: true,
                  x: e.clientX - rect.left + 12,
                  y: e.clientY - rect.top - 20,
                  data: seg,
                });
                setHoveredSegment(seg.id);
              } else {
                setTooltip((t) => ({ ...t, visible: false }));
                setHoveredSegment(null);
              }
            }}
          />

          <AnimatePresence>
            {tooltip.visible && tooltip.data && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.1 }}
                className="absolute z-50 pointer-events-none bg-gray-900 border border-white/20 rounded-xl p-3 shadow-xl min-w-40"
                style={{ left: tooltip.x, top: tooltip.y, transform: "translateY(-100%)" }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: tooltip.data.color }} />
                  <span className="text-white font-semibold text-sm">{tooltip.data.label}</span>
                </div>
                <div className="space-y-0.5 text-xs">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">Ukuran</span>
                    <span className="text-white font-medium">{formatBytes(tooltip.data.size, 1)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">Dari total junk</span>
                    <span className="text-white font-medium">{tooltip.data.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 space-y-3 min-w-0">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-cyan-400 font-bold text-lg">{formatBytes(data.canFree, 1)}</span>
              <span className="text-gray-400 text-xs">bisa dibebaskan · {freePct.toFixed(1)}% disk</span>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Terpakai sekarang</span>
                <span className={diskUsedPct > 90 ? "text-red-400" : diskUsedPct > 75 ? "text-yellow-400" : "text-gray-400"}>
                  {diskUsedPct.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${diskUsedPct > 90 ? "bg-red-500" : diskUsedPct > 75 ? "bg-yellow-500" : "bg-gray-400"}`}
                  style={{ width: `${Math.max(0, Math.min(100, diskUsedPct))}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Setelah dibersihkan</span>
                <span className="text-green-400">{afterCleanPct.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.max(0, Math.min(100, afterCleanPct))}%` }} />
              </div>
            </div>
          </div>

          <div>
            <div className="h-1.5 rounded-full overflow-hidden flex gap-px bg-white/10">
              <div className="bg-green-500 h-full rounded-l-full" style={{ width: `${safePct}%` }} title={`Aman: ${data.safeCount} item`} />
              <div className="bg-yellow-500 h-full" style={{ width: `${cautionPct}%` }} title={`Waspada: ${data.cautionCount} item`} />
            </div>
            <div className="flex justify-between mt-1 text-[10px]">
              <span className="text-green-400">Aman {data.safeCount}</span>
              <span className="text-yellow-400">Waspada {data.cautionCount}</span>
              {data.riskyCount > 0 && <span className="text-red-400">Berisiko {data.riskyCount}</span>}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 space-y-1.5 min-w-36">
          <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-2">Komposisi</p>
          {bars.map((cat) => (
            <motion.div
              key={cat.id}
              className={`flex items-center gap-2 cursor-default rounded-lg px-2 py-1 transition-colors ${
                hoveredSegment === cat.id ? "bg-white/10" : "hover:bg-white/5"
              }`}
              onMouseEnter={() => {
                setHoveredSegment(cat.id);
                setTooltip({ visible: true, x: -160, y: 0, data: cat });
              }}
              onMouseLeave={() => {
                setHoveredSegment(null);
                setTooltip((t) => ({ ...t, visible: false }));
              }}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
              <span className="text-gray-400 text-xs truncate flex-1">{cat.label}</span>
              <span className="text-white text-xs font-mono flex-shrink-0">{formatBytes(cat.size, 1)}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

const DonutChartSmall = forwardRef<SVGSVGElement, DonutChartProps>(
  ({ categories, canFree, totalDisk, hoveredSegment, onSegmentHover }, ref) => {
    const size = 80;
    const strokeWidth = 14;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    let cumulativePct = 0;
    const segments: DonutSegment[] = categories.map((cat) => {
      const pct = cat.percentage / 100;
      const offset = circumference * (1 - cumulativePct);
      const dash = circumference * pct;
      cumulativePct += pct;
      return { ...cat, offset, dash };
    });

    const usedPct = totalDisk > 0 ? (canFree / totalDisk) * 100 : 0;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
          {segments.map((seg) => (
            <circle
              key={seg.id}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={hoveredSegment === seg.id ? strokeWidth + 2 : strokeWidth}
              strokeDasharray={`${seg.dash} ${circumference}`}
              strokeDashoffset={-seg.offset}
              strokeLinecap="round"
              className="transition-all duration-200 cursor-pointer"
              onMouseEnter={(e) => {
                e.stopPropagation();
                onSegmentHover(seg, e);
              }}
              onMouseLeave={() => onSegmentHover(null, null)}
              style={{ filter: hoveredSegment === seg.id ? "brightness(1.3)" : "none" }}
            />
          ))}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-white font-bold text-xs leading-tight">{formatBytes(canFree, 0)}</span>
          <span className="text-gray-500 text-[9px] leading-tight">bebas · {usedPct.toFixed(0)}%</span>
        </div>
      </div>
    );
  }
);

DonutChartSmall.displayName = "DonutChartSmall";
