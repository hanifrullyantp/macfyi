import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { CardBucket } from "../../lib/scanCategories";
import { ResultCard } from "./ResultCard";
import { CleanAllSafeButton } from "./CleanAllSafeButton";

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function ResultCardsGrid({
  buckets,
  onReview,
  onClean,
  onRescan,
  safeCleanAllIds,
  safeCleanAllBytes,
}: {
  buckets: CardBucket[];
  onReview: () => void;
  onClean: (itemIds: string[]) => void;
  onRescan?: () => void;
  /** Precomputed recommended safe ids for Clean All */
  safeCleanAllIds: string[];
  safeCleanAllBytes: number;
}) {
  const reduceMotion = useReducedMotion();
  const { safe, caution, safeTotal, cautionTotal } = useMemo(() => {
    const safeB = buckets.filter((b) => b.def.riskLevel === "safe" && b.totalSize > 0);
    const cautionB = buckets.filter((b) => b.def.riskLevel === "caution" && b.totalSize > 0);
    const s = safeB.reduce((a, b) => a + b.totalSize, 0);
    const c = cautionB.reduce((a, b) => a + b.totalSize, 0);
    return { safe: safeB, caution: cautionB, safeTotal: s, cautionTotal: c };
  }, [buckets]);

  const [emptyHint, setEmptyHint] = useState(false);

  return (
    <div className="space-y-6 px-2 py-1">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-white">Scan selesai</h2>
          <p className="text-xs text-white/50">
            Ringkasan per kategori — tinjau lalu pindahkan ke Trash (aman).
          </p>
        </div>
        {onRescan && (
          <button
            type="button"
            onClick={onRescan}
            className="text-xs text-white/50 hover:text-white/90"
          >
            Scan ulang
          </button>
        )}
      </div>

      {safe.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Aman — cepat dibersihkan</h3>
            <span className="text-[11px] text-emerald-300/80 ml-auto tabular-nums">
              {formatBytes(safeTotal)}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {safe.map((b) => (
              <ResultCard key={b.def.id} bucket={b} onClean={onClean} onReview={onReview} />
            ))}
          </div>
          <CleanAllSafeButton
            totalBytes={safeCleanAllBytes}
            itemIds={safeCleanAllIds}
            onConfirm={() => onClean(safeCleanAllIds)}
          />
        </section>
      )}

      {caution.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <h3 className="text-sm font-semibold text-white">Tinjau dulu</h3>
            <span className="text-[11px] text-amber-300/80 ml-auto tabular-nums">
              {formatBytes(cautionTotal)}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {caution.map((b) => (
              <ResultCard key={b.def.id} bucket={b} onClean={onClean} onReview={onReview} />
            ))}
          </div>
        </section>
      )}

      <AnimatePresence>
        {safe.length === 0 && caution.length === 0 && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={reduceMotion ? false : { opacity: 1 }}
            className="text-center py-10 space-y-2"
          >
            <p className="text-3xl" aria-hidden>
              ✓
            </p>
            <h3 className="text-base font-bold text-white">Tidak ada temuan besar</h3>
            <p className="text-sm text-white/45">Kategori populer sudah kosong — gunakan tampilan bawah untuk detail penuh.</p>
            <button
              type="button"
              onClick={() => setEmptyHint((v) => !v)}
              className="text-xs text-white/40 underline"
            >
              {emptyHint ? "Sembunyikan" : "Info"}
            </button>
            {emptyHint && <p className="text-xs text-white/30 max-w-sm mx-auto">Kartu mengikuti hasil agregat terakhir.</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
