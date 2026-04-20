import { Bot, Loader2 } from "lucide-react";
import { useI18n } from "../../i18n/context";

export function DiskAiPanel({
  text,
  loading,
  source,
  onRun,
}: {
  text: string;
  loading: boolean;
  source: "idle" | "local" | "kb";
  onRun: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-3 min-h-[160px]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-emerald-400" />
          <div>
            <h3 className="text-sm font-semibold text-white">{t("diskExplorer.aiTitle")}</h3>
            <p className="text-[10px] text-white/45 leading-snug">{t("diskExplorer.aiHint")}</p>
          </div>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={onRun}
          className="btn-secondary text-xs px-3 py-1.5 shrink-0"
        >
          {loading ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t("diskExplorer.aiLoading")}
            </span>
          ) : (
            t("diskExplorer.aiRun")
          )}
        </button>
      </div>
      {source !== "idle" ? (
        <p className="text-[10px] uppercase tracking-wide text-white/35">
          {source === "local" ? "Local model" : "Offline template"}
        </p>
      ) : null}
      <div className="flex-1 min-h-[72px] max-h-48 overflow-auto rounded-lg bg-black/20 border border-white/5 px-3 py-2 text-xs text-white/75 whitespace-pre-wrap">
        {loading ? <span className="text-white/40">{t("diskExplorer.aiLoading")}</span> : text || t("diskExplorer.aiEmpty")}
      </div>
    </div>
  );
}
