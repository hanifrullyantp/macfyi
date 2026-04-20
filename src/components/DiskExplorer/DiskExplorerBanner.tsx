import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useI18n } from "../../i18n/context";

export function DiskExplorerBanner({
  fdaOk,
  onOpenFda,
}: {
  fdaOk: boolean | null;
  onOpenFda: () => void;
}) {
  const { t } = useI18n();
  const ok = fdaOk === true;
  return (
    <div
      className={`rounded-2xl border px-4 py-3 flex flex-wrap items-center gap-3 ${
        ok ? "border-emerald-500/25 bg-emerald-500/10" : "border-amber-500/30 bg-amber-950/40"
      }`}
    >
      {ok ? (
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
      ) : (
        <ShieldAlert className="w-5 h-5 text-amber-300 shrink-0" />
      )}
      <p className="text-sm text-white/80 flex-1 min-w-[200px]">
        {ok ? t("diskExplorer.fdaOk") : t("diskExplorer.fdaMissing")}
      </p>
      {!ok ? (
        <button type="button" onClick={onOpenFda} className="btn-secondary text-xs px-3 py-1.5">
          {t("diskExplorer.openFda")}
        </button>
      ) : null}
    </div>
  );
}
