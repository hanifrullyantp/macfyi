import { ChevronRight } from "lucide-react";
import type { Breadcrumb } from "../../store/diskExplorerStore";
import { useI18n } from "../../i18n/context";

export function DiskExplorerBreadcrumbs({
  items,
  onNavigate,
}: {
  items: Breadcrumb[];
  onNavigate: (index: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-1 text-sm">
      <span className="text-white/45 mr-1">{t("diskExplorer.breadcrumbs")}</span>
      {items.map((b, i) => (
        <span key={`${b.path}-${i}`} className="inline-flex items-center gap-1">
          {i > 0 ? <ChevronRight className="w-3.5 h-3.5 text-white/25" /> : null}
          <button
            type="button"
            onClick={() => onNavigate(i)}
            className={`rounded-md px-2 py-0.5 transition-colors ${
              i === items.length - 1
                ? "text-white font-medium bg-white/10"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            {b.label}
          </button>
        </span>
      ))}
    </div>
  );
}
