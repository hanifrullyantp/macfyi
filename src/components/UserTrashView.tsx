import { useState } from "react";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import type { TrashListItem } from "../types";
import { emptyTrash, openUserTrash, revealInFinder } from "../lib/backend";
import { getIsProEntitled } from "../lib/entitlement";
import { isDemoMode } from "../lib/demoSession";
import { marketingCheckoutUrl } from "../lib/marketingUrl";
import { useI18n } from "../i18n/context";
import { LoadingButton } from "./common/LoadingButton";

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(0)} MB`;
  return `${(n / 1024).toFixed(0)} KB`;
}

export type UserTrashViewProps = {
  items: TrashListItem[] | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
};

export function UserTrashView({ items, loading, error, onRefresh }: UserTrashViewProps) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const rows = items ?? [];
  const hasLoaded = items !== null;
  const total = rows.reduce((a, x) => a + x.sizeBytes, 0);

  const handleEmpty = async () => {
    if (!getIsProEntitled() || isDemoMode()) {
      setLocalError(
        isDemoMode()
          ? "Demo: mengosongkan Tong Sampah tidak tersedia. Upgrade ke Pro."
          : "Pro diperlukan untuk mengosongkan Tong Sampah. Buka checkout dari profil."
      );
      if (!getIsProEntitled()) window.open(marketingCheckoutUrl(), "_blank", "noopener,noreferrer");
      return;
    }
    if (!window.confirm(t("trash.emptyConfirm"))) return;
    setBusy(true);
    setLocalError(null);
    try {
      await emptyTrash();
      await onRefresh();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-6 py-6 md:px-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[30px] leading-[36px] font-semibold text-white tracking-tight flex items-center gap-2">
              <Trash2 size={28} className="text-amber-400/90" />
              {t("trash.title")}
            </h2>
            <p className="text-sm text-white/60 mt-1">{t("trash.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LoadingButton
              loading={busy}
              loadingLabel="…"
              onClick={handleEmpty}
              disabled={!hasLoaded || rows.length === 0 || loading}
              className="btn-secondary text-sm px-4 py-2"
            >
              {t("trash.empty")}
            </LoadingButton>
            <button type="button" onClick={() => openUserTrash()} className="btn-secondary text-sm px-4 py-2">
              {t("trash.openInFinder")} <ExternalLink size={14} className="inline ml-1" />
            </button>
            <LoadingButton
              loading={loading}
              loadingLabel="…"
              onClick={() => void onRefresh()}
              className="btn-primary text-sm px-4 py-2"
            >
              {t("trash.scanButton")}
            </LoadingButton>
          </div>
        </div>

        {(error || localError) && <p className="text-sm text-amber-300">{error || localError}</p>}

        {!hasLoaded && !loading && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
            <p className="text-sm text-white/60">{t("trash.notLoadedHint")}</p>
            <LoadingButton loading={loading} loadingLabel="…" onClick={() => void onRefresh()} className="btn-primary text-sm px-4 py-2">
              {t("trash.scanButton")}
            </LoadingButton>
          </div>
        )}

        {loading && !hasLoaded && (
          <div className="flex items-center gap-2 text-white/45 py-8">
            <Loader2 className="animate-spin" size={18} /> {t("loading")}
          </div>
        )}

        {hasLoaded && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 relative">
            {loading && (
              <div className="absolute inset-0 z-10 bg-black/20 flex items-center justify-center rounded-xl">
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-sm text-white/85">
                  <Loader2 className="animate-spin" size={16} />
                  {t("loading")}
                </div>
              </div>
            )}
            <p className="text-sm text-white/70">
              {t("trash.total")}: <strong className="text-white tabular-nums">{formatBytes(total)}</strong> · {rows.length}{" "}
              {t("trash.items")}
            </p>
            <ul className="mt-3 space-y-2 max-h-[min(60vh,520px)] overflow-y-auto custom-scrollbar">
              {rows.map((it) => (
                <li
                  key={it.path}
                  className="flex items-center justify-between gap-2 py-2 border-b border-white/5 last:border-0 text-sm"
                >
                  <span className="text-white/90 truncate min-w-0">{it.name}</span>
                  <span className="text-white/45 tabular-nums shrink-0">{formatBytes(it.sizeBytes)}</span>
                  <button
                    type="button"
                    className="text-xs text-blue-300 hover:text-blue-200 shrink-0"
                    onClick={() => revealInFinder(it.path)}
                  >
                    <ExternalLink size={12} className="inline" />
                  </button>
                </li>
              ))}
              {rows.length === 0 && <li className="text-white/40 text-sm py-4">—</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
