import { Loader2 } from "lucide-react";
import { useI18n } from "../../i18n/context";

export function ScanningOverlay({ show }: { show: boolean }) {
  const { t } = useI18n();
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/45 backdrop-blur-[2px] rounded-2xl">
      <div className="flex items-center gap-2 text-sm text-white/85">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
        {t("diskExplorer.scanning")}
      </div>
    </div>
  );
}
