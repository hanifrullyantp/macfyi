import { useState } from "react";
import { ExternalLink, Loader2, Trash2, X } from "lucide-react";
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

type EmptyStep = "closed" | "warn" | "confirm";

export function UserTrashView({ items, loading, error, onRefresh }: UserTrashViewProps) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [emptyStep, setEmptyStep] = useState<EmptyStep>("closed");
  const [typeConfirm, setTypeConfirm] = useState("");
  const rows = items ?? [];
  const hasLoaded = items !== null;
  const total = rows.reduce((a, x) => a + x.sizeBytes, 0);

  const phrase = t("trash.emptyPhrase");
  const canSubmitEmpty = typeConfirm.trim() === phrase;

  const runEmpty = async () => {
    if (!getIsProEntitled() || isDemoMode()) {
      setLocalError(
        isDemoMode()
          ? "Demo: mengosongkan Tong Sampah tidak tersedia. Upgrade ke Pro."
          : "Pro diperlukan untuk mengosongkan Tong Sampah. Buka checkout dari profil."
      );
      if (!getIsProEntitled()) window.open(marketingCheckoutUrl(), "_blank", "noopener,noreferrer");
      return;
    }
    if (!canSubmitEmpty) return;
    setBusy(true);
    setLocalError(null);
    try {
      await emptyTrash();
      await onRefresh();
      setEmptyStep("closed");
      setTypeConfirm("");
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar px-6 py-6 md:px-8">
      {emptyStep !== "closed" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={busy ? undefined : () => setEmptyStep("closed")}
            role="presentation"
            aria-hidden
          />
          <div
            className="relative w-full max-w-md rounded-2xl border border-red-500/30 bg-[#14151c] p-6 shadow-2xl space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trash-empty-title"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 id="trash-empty-title" className="text-lg font-bold text-red-200">
                {emptyStep === "warn" ? t("trash.emptyStep1Title") : t("trash.emptyStep2Title")}
              </h2>
              <button
                type="button"
                className="p-1 text-white/45 hover:text-white disabled:opacity-40"
                onClick={() => !busy && setEmptyStep("closed")}
                aria-label={t("common.close")}
                disabled={busy}
              >
                <X size={20} />
              </button>
            </div>
            {emptyStep === "warn" ? (
              <>
                <p className="text-sm text-white/70">
                  {t("trash.emptyStep1Body", { count: rows.length, size: formatBytes(total) })}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEmptyStep("closed")}
                    className="flex-1 py-2.5 rounded-xl text-sm bg-white/10 hover:bg-white/15 text-white/85"
                  >
                    {t("trash.emptyStep1Back")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmptyStep("confirm")}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600/90 hover:bg-red-600 text-white"
                  >
                    {t("trash.emptyStep1Continue")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-amber-100/90">
                  {t("trash.emptyStep2Hint", { phrase: `“${phrase}”` })}
                </p>
                <input
                  value={typeConfirm}
                  onChange={(e) => setTypeConfirm(e.target.value)}
                  autoComplete="off"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white"
                  placeholder={phrase}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmptyStep("warn");
                      setTypeConfirm("");
                    }}
                    disabled={busy}
                    className="flex-1 py-2.5 rounded-xl text-sm bg-white/10 hover:bg-white/15 text-white/85"
                  >
                    {t("trash.emptyStep2Cancel")}
                  </button>
                  <LoadingButton
                    loading={busy}
                    loadingLabel="…"
                    onClick={() => void runEmpty()}
                    disabled={!canSubmitEmpty}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white disabled:opacity-40"
                  >
                    {t("trash.emptyStep2Submit")}
                  </LoadingButton>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
              onClick={() => {
                if (!getIsProEntitled() || isDemoMode()) {
                  setLocalError(
                    isDemoMode()
                      ? "Demo: mengosongkan Tong Sampah tidak tersedia. Upgrade ke Pro."
                      : "Pro diperlukan untuk mengosongkan Tong Sampah. Buka checkout dari profil."
                  );
                  if (!getIsProEntitled()) window.open(marketingCheckoutUrl(), "_blank", "noopener,noreferrer");
                  return;
                }
                setTypeConfirm("");
                setEmptyStep("warn");
              }}
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
