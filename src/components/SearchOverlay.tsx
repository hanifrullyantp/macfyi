import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, X, FileText, ExternalLink } from "lucide-react";
import type { ScanResult } from "../types";
import { revealInFinder } from "../lib/backend";

interface SearchOverlayProps {
  results: ScanResult[];
  onClose: () => void;
}

export function SearchOverlay({ results, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");

  const allItems = useMemo(
    () => results.flatMap((r) => r.items),
    [results]
  );

  const filtered = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return allItems
      .filter((i) => i.name.toLowerCase().includes(q) || i.path.toLowerCase().includes(q))
      .slice(0, 30);
  }, [query, allItems]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]"
    >
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <motion.div
        initial={{ y: -20, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        className="relative w-full max-w-lg bg-[#1c1c1e] border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search size={18} className="text-white/40" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search scan results..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {query.length < 2 ? (
            <p className="text-center text-white/30 text-xs py-8">Type at least 2 characters to search</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-white/30 text-xs py-8">No matches</p>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
              >
                <FileText size={14} className="text-white/30 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{item.name}</p>
                  <p className="text-[10px] text-white/30 truncate">{item.path}</p>
                </div>
                <span className="text-[10px] text-white/40 font-mono shrink-0">
                  {(item.size / (1024 * 1024)).toFixed(1)} MB
                </span>
                <button
                  type="button"
                  onClick={() => revealInFinder(item.path)}
                  className="p-1 text-white/20 hover:text-white/60"
                >
                  <ExternalLink size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
