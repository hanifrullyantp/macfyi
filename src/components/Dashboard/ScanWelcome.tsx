import { motion, useReducedMotion } from "framer-motion";
import { HardDrive } from "lucide-react";
import { DiskUsageMini } from "./DiskUsageMini";

export function ScanWelcome({
  onStartScan,
  onReview,
  hasResults,
  freeGb,
  totalGb,
}: {
  onStartScan: () => void;
  onReview?: () => void;
  hasResults: boolean;
  freeGb: number;
  totalGb: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#12131a]/90 to-[#0a0b0f]/90 px-6 py-8 md:px-10 md:py-10 text-center space-y-8">
      <div className="flex justify-center">
        <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-3xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
          <HardDrive className="w-20 h-20 md:w-24 md:h-24 text-white/20" strokeWidth={1} />
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-purple-500/10 to-transparent pointer-events-none" />
        </div>
      </div>

      <div className="space-y-2 max-w-lg mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">How full is your Mac?</h1>
        <p className="text-white/50 text-sm md:text-base leading-relaxed">
          Scan cepat untuk menemukan file yang bisa dibebaskan. Aman — tidak ada yang dihapus sebelum kamu
          setuju.
        </p>
      </div>

      <DiskUsageMini freeGb={freeGb} totalGb={totalGb} />

      <div className="space-y-3 flex flex-col items-center">
        <motion.button
          type="button"
          onClick={onStartScan}
          whileHover={reduceMotion ? undefined : { scale: 1.03 }}
          whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          className="px-10 py-3.5 rounded-2xl text-base font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-shadow"
        >
          Scan My Mac
        </motion.button>
        {hasResults && onReview ? (
          <button
            type="button"
            onClick={onReview}
            className="text-sm text-white/45 hover:text-white/80 underline underline-offset-2 transition-colors"
          >
            Lihat hasil scan terakhir
          </button>
        ) : null}
        <p className="text-xs text-white/35">Proses: 1–3 menit • Tidak ada yang terhapus otomatis</p>
      </div>
    </div>
  );
}
