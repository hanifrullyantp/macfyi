import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, ExternalLink, FileText, Image, Info, RefreshCw } from "lucide-react";
import { filePreview, revealInFinder } from "../lib/backend";
import type { FilePreview } from "../types";
import { useI18n } from "../i18n/context";

interface FilePreviewPanelProps {
  path: string;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes > 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  if (bytes > 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / 1024).toFixed(0) + " KB";
}

type TabId = "overview" | "content";

function PreviewSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-2/3" />
      <div className="h-32 bg-white/5 rounded-xl" />
      <div className="h-20 bg-white/5 rounded-xl" />
    </div>
  );
}

export function FilePreviewPanel({ path, onClose }: FilePreviewPanelProps) {
  const { t } = useI18n();
  const [data, setData] = useState<FilePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryToken, setRetryToken] = useState(0);
  const [tab, setTab] = useState<TabId>("overview");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    setData(null);
    filePreview(path)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [path, retryToken]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!data) return;
    const mime = data.mimeHint;
    if (mime.startsWith("image/") || mime.startsWith("text/") || mime === "application/json") {
      setTab("content");
    } else {
      setTab("overview");
    }
  }, [data]);

  const fileName = path.split("/").pop() ?? path;
  const hasVisualContent = !!(data?.base64Image || data?.textContent);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="relative w-full max-w-xl max-h-[85vh] bg-[#1c1c1e] border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={16} className="text-blue-400 shrink-0" />
            <span className="text-sm font-medium text-white truncate">{fileName}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => revealInFinder(path)}
              className="p-1.5 text-white/40 hover:text-white transition-colors"
              title={t("filePreview.openInFinder")}
            >
              <ExternalLink size={16} />
            </button>
            <button type="button" onClick={onClose} className="p-1.5 text-white/50 hover:text-white">
              <X size={16} />
            </button>
          </div>
        </div>

        {!loading && !error && data && (
          <div className="flex border-b border-white/10 px-2 shrink-0">
            {(["overview", "content"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`px-4 py-2 text-xs font-semibold capitalize border-b-2 -mb-px transition-colors ${
                  tab === id ? "border-blue-400 text-white" : "border-transparent text-white/45 hover:text-white/75"
                }`}
              >
                {id === "content" ? t("filePreview.previewTab") : t("filePreview.overview")}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 min-h-0">
          <div className="flex items-start gap-2 mb-3 text-[11px] text-white/40 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2">
            <Info size={14} className="shrink-0 mt-0.5 text-blue-400/90" />
            <span>{t("filePreview.timeoutHint")}</span>
          </div>

          {error && (
            <div className="space-y-3">
              <p className="text-red-400 text-sm">{error}</p>
              <button
                type="button"
                onClick={() => setRetryToken((t) => t + 1)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white"
              >
                <RefreshCw size={14} /> {t("common.retry")}
              </button>
            </div>
          )}

          {loading && <PreviewSkeleton />}

          {!loading && !error && data && tab === "overview" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 text-xs text-white/50">
                <span>{formatSize(data.size)}</span>
                <span>{data.mimeHint}</span>
                <span>{t("filePreview.modified", { date: new Date(data.modified).toLocaleString() })}</span>
              </div>
              <p className="text-[11px] text-white/35 break-all leading-relaxed">{data.path}</p>
              {!hasVisualContent && (
                <div className="flex flex-col items-center py-6 text-white/35 border border-white/10 rounded-xl bg-black/20">
                  <Image size={28} className="mb-2 opacity-50" />
                  <p className="text-sm">{t("filePreview.noInline")}</p>
                  <p className="text-[11px] text-white/30 mt-1">{t("filePreview.useRevealHint")}</p>
                </div>
              )}
            </div>
          )}

          {!loading && !error && data && tab === "content" && (
            <div className="space-y-4">
              {data.base64Image && (
                <div className="flex justify-center bg-black/20 rounded-xl p-4 border border-white/5">
                  <img src={data.base64Image} alt="Preview" className="max-w-full max-h-[min(50vh,360px)] rounded-lg object-contain" />
                </div>
              )}
              {data.textContent && (
                <pre className="bg-black/30 rounded-xl p-4 text-xs text-white/70 font-mono whitespace-pre-wrap break-all overflow-auto max-h-[min(45vh,320px)] border border-white/5">
                  {data.textContent}
                </pre>
              )}
              {!data.base64Image && !data.textContent && (
                <p className="text-sm text-white/45 text-center py-8">{t("filePreview.emptyPreview")}</p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
