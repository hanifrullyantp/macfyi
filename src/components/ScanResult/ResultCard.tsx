import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { CardBucket } from "../../lib/scanCategories";
import { getFriendlyName } from "../../lib/friendlyNames";
import { cn } from "../../utils/cn";

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const BORDER: Record<string, string> = {
  safe: "border-emerald-500/30 hover:border-emerald-500/55",
  caution: "border-amber-500/30 hover:border-amber-500/55",
  danger: "border-red-500/30 hover:border-red-500/55",
};

const BADGE: Record<string, string> = {
  safe: "bg-emerald-500/20 text-emerald-300",
  caution: "bg-amber-500/20 text-amber-200",
  danger: "bg-red-500/20 text-red-300",
};

export function ResultCard({
  bucket,
  onClean,
  onReview,
}: {
  bucket: CardBucket;
  onClean: (itemIds: string[]) => void;
  /** Opens review; parent can scope the list to this card’s items. */
  onReview: (bucket: CardBucket) => void;
}) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const { def, totalSize, items } = bucket;
  const has = totalSize > 0;
  const level = def.riskLevel;
  const cleanableIds = items.filter((e) => e.risk === "safe" && e.item.recommended).map((e) => e.item.id);
  const anySafeClean = cleanableIds.length > 0;

  return (
    <motion.div
      layout
      className={cn(
        "rounded-2xl border-2 bg-white/[0.04] p-4 transition-colors",
        BORDER[level] ?? BORDER.caution,
        !has && "opacity-45"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl flex-shrink-0" aria-hidden>
            {def.emoji}
          </span>
          <div className="min-w-0">
            <h3 className="font-bold text-white text-sm leading-tight">{def.label}</h3>
            <p className="text-[11px] text-white/40 truncate">{def.sublabel}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {has ? (
            <>
              <p className="text-lg font-bold text-white tabular-nums">{formatBytes(totalSize)}</p>
              <p className="text-[10px] text-white/40">{items.length} item</p>
            </>
          ) : (
            <p className="text-xs text-white/40">Bersih</p>
          )}
        </div>
      </div>

      <div className="mt-2">
        <span
          className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block", BADGE[level] ?? BADGE.caution)}
        >
          {def.riskBadge}
        </span>
      </div>

      <p className="text-xs text-white/50 mt-2 leading-relaxed">{def.userExplanation}</p>

      {has && items.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="mt-2 text-[11px] text-white/40 hover:text-white/70"
          >
            {open ? "▲ Sembunyikan" : "▼ Lihat isi"} ({items.length} item)
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                animate={reduceMotion ? false : { opacity: 1, height: "auto" }}
                exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                className="mt-2 space-y-1 overflow-hidden"
              >
                {items.slice(0, 5).map((e) => (
                  <div
                    key={e.item.id}
                    className="flex items-center justify-between text-[11px] text-white/50 py-1 border-b border-white/5 gap-2"
                  >
                    <span className="truncate min-w-0">{getFriendlyName(e.item.path, e.item.name)}</span>
                    <span className="font-mono text-white/60 shrink-0">{formatBytes(e.item.size)}</span>
                  </div>
                ))}
                {items.length > 5 && (
                  <p className="text-[10px] text-white/35 text-center">+{items.length - 5} item lainnya</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {has && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onReview(bucket)}
            className="flex-1 py-2 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/15 text-white/85 border border-white/10"
          >
            Tinjau
          </button>
          <button
            type="button"
            disabled={!anySafeClean}
            onClick={() => anySafeClean && onClean(cleanableIds)}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-bold transition-colors",
              level === "safe"
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-amber-600/35 hover:bg-amber-600/50 text-amber-100 border border-amber-500/30",
              !anySafeClean && "opacity-40 cursor-not-allowed"
            )}
            title={!anySafeClean ? "Tidak ada item aman terpilih" : "Pindah ke Trash (item aman terpilih)"}
          >
            Bersihkan
          </button>
        </div>
      )}

      {def.riskLevel === "caution" && has && (
        <p className="text-[10px] text-amber-200/50 mt-2 text-center">Disarankan tinjau dulu sebelum membersihkan</p>
      )}
    </motion.div>
  );
}
