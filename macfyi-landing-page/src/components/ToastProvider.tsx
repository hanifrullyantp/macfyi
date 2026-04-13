import React, { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Toast = { id: string; message: string; type?: "info" | "success" | "error" };

const ToastCtx = createContext<(msg: string, type?: Toast["type"]) => void>(() => {});

export function useToast(): (msg: string, type?: Toast["type"]) => void {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((t) => [...t, { id, message, type }].slice(-6));
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 5200);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20 }}
              className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-xl flex items-start gap-3 ${
                t.type === "success"
                  ? "bg-emerald-950/95 border-emerald-500/40 text-emerald-100"
                  : t.type === "error"
                    ? "bg-red-950/95 border-red-500/40 text-red-100"
                    : "bg-[#0B1220]/95 border-white/15 text-white"
              }`}
            >
              <p className="flex-1 leading-snug">{t.message}</p>
              <button
                type="button"
                className="text-white/40 hover:text-white shrink-0"
                onClick={() => setToasts((x) => x.filter((i) => i.id !== t.id))}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
