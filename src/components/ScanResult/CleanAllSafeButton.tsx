import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function CleanAllSafeButton({
  totalBytes,
  itemIds,
  onConfirm,
}: {
  totalBytes: number;
  itemIds: string[];
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  if (totalBytes <= 0 || itemIds.length === 0) return null;

  return (
    <>
      <motion.button
        type="button"
        whileHover={reduceMotion ? undefined : { scale: 1.01 }}
        whileTap={reduceMotion ? undefined : { scale: 0.99 }}
        onClick={() => setOpen(true)}
        className="w-full py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm"
      >
        <span>Clean all safe</span>
        <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs tabular-nums">
          {formatBytes(totalBytes)} · {itemIds.length} item
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={reduceMotion ? false : { opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            onClick={() => setOpen(false)}
            role="presentation"
          >
            <motion.div
              className="bg-[#14151c] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4"
              initial={reduceMotion ? false : { scale: 0.95, opacity: 0 }}
              animate={reduceMotion ? false : { scale: 1, opacity: 1 }}
              exit={reduceMotion ? undefined : { scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-1">
                <span className="text-3xl" aria-hidden>
                  🧹
                </span>
                <h3 className="text-lg font-bold text-white">Bersihkan item aman?</h3>
                <p className="text-sm text-white/50">
                  {itemIds.length} item (~{formatBytes(totalBytes)}) akan dipindah ke{" "}
                  <strong className="text-white/80">Trash</strong>.
                </p>
              </div>
              <div className="rounded-xl bg-sky-500/10 border border-sky-500/25 px-3 py-2 text-[11px] text-sky-200">
                Kamu masih bisa memulihkan dari Trash. Penghapusan permanen hanya lewat Trash Manager.
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm bg-white/10 hover:bg-white/15 text-white/80"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onConfirm();
                    setOpen(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  Ya, pindah ke Trash
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
