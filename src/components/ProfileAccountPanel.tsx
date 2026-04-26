import { motion } from "framer-motion";
import { Check, Sparkles, User, X, Zap } from "lucide-react";
import { useI18n } from "../i18n/context";
import { clearLicenseSession, getStoredLicenseEmail } from "../lib/activation";
import { isDemoMode } from "../lib/demoSession";
import { DEFAULT_BRAND_LOGO_URL } from "../lib/defaultBrandLogo";
import { getIsProEntitled } from "../lib/entitlement";
import { marketingCheckoutUrl, marketingMemberAffiliateUrl } from "../lib/marketingUrl";
import type { PublicConfig } from "../lib/publicConfig";
import { formatIdrShort } from "../lib/formatIdr";

function fmtCta(tpl: string, price: string): string {
  return tpl.replace(/\{price\}/g, price);
}

export function ProfileAccountPanel({
  brandLogoUrl,
  publicConfig,
  onClose,
  onOpenPricing,
  onLogout,
}: {
  brandLogoUrl?: string | null;
  publicConfig: PublicConfig | null;
  onClose: () => void;
  onOpenPricing: () => void;
  onLogout: () => void;
}) {
  const { t, locale } = useI18n();
  const email = getStoredLicenseEmail()?.trim() || "";
  const demo = isDemoMode();
  const isPro = getIsProEntitled();

  const card = publicConfig?.desktop?.profile_card;
  const ch = publicConfig?.checkout;
  const baseIdr = ch?.base_lifetime_idr ?? publicConfig?.pricing?.lifetime_price_idr ?? 173000;
  const compareIdr = ch?.compare_at_idr ?? publicConfig?.promo?.compare_at_idr;
  const finalIdr = ch?.final_with_auto_idr ?? baseIdr;
  const priceLine = finalIdr > 0 ? formatIdrShort(finalIdr) : "";
  const compareLine =
    typeof compareIdr === "number" && compareIdr > 0 && compareIdr > finalIdr
      ? `Rp ${compareIdr.toLocaleString("id-ID")}`
      : null;
  const idLoc = locale === "id";
  const paidLabel = idLoc ? (card?.paid_label_id ?? "BERBAYAR") : (card?.paid_label_en ?? "PAID");
  const title = idLoc ? (card?.title_id ?? "Lifetime — 1 Perangkat Mac") : (card?.title_en ?? "Lifetime — 1 Mac");
  const launchLabel = idLoc ? (card?.launch_label_id ?? "HARGA PELUNCURAN TERBATAS") : (card?.launch_label_en ?? "LIMITED LAUNCH");
  const bullets = idLoc ? (card?.bullets_id ?? []) : (card?.bullets_en ?? []);
  const ctaTpl = idLoc ? (card?.cta_id ?? "Dapatkan Lifetime — {price}") : (card?.cta_en ?? "Get Lifetime — {price}");
  const ctaLabel = fmtCta(ctaTpl, `Rp ${finalIdr.toLocaleString("id-ID")}`);

  const statusKey = demo
    ? "profile.statusDemo"
    : isPro
      ? "profile.statusPro"
      : email
        ? "profile.statusSignedIn"
        : "profile.statusGuest";

  const logoSrc =
    typeof brandLogoUrl === "string" && brandLogoUrl.trim().length > 0 ? brandLogoUrl.trim() : DEFAULT_BRAND_LOGO_URL;

  const openAffiliate = () => {
    const u = marketingMemberAffiliateUrl();
    if (u) window.open(u, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[200] p-6">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/20 bg-[#0c0c0e] shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0c0c0e]/95 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <img src={logoSrc} alt="" className="h-9 w-9 rounded-lg object-contain border border-white/10" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <User size={16} className="text-white/50 shrink-0" />
                <h2 className="text-sm font-bold text-white truncate">{t("profile.title")}</h2>
              </div>
              {isPro ? (
                <span className="text-[10px] font-bold uppercase text-emerald-400/90">{t("profile.badgePro")}</span>
              ) : null}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white" aria-label={t("common.close")}>
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {email ? (
            <div>
              <div className="text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1">{t("profile.emailLabel")}</div>
              <p className="text-xs text-white/80 break-all font-mono">{email}</p>
            </div>
          ) : (
            <p className="text-sm text-white/50">{t("profile.noEmailHint")}</p>
          )}

          <p className="text-xs text-white/45">{t(statusKey)}</p>

          {!isPro && !demo ? (
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <div className="px-4 py-2 bg-gradient-to-b from-white/[0.04] to-transparent">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/90">{paidLabel}</span>
                <h3 className="text-lg font-bold text-white mt-1 leading-tight">{title}</h3>
                {compareLine ? <p className="text-sm text-red-400/90 line-through mt-2">{compareLine}</p> : null}
                <p className="text-3xl font-black text-white mt-1 tabular-nums">{priceLine || `Rp ${finalIdr.toLocaleString("id-ID")}`}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-400/80 mt-1">{launchLabel}</p>
              </div>
              <ul className="px-4 py-3 space-y-2 border-t border-white/5">
                {(bullets.length ? bullets : [t("profile.fallbackBullet1"), t("profile.fallbackBullet2"), t("profile.fallbackBullet3")]).map(
                  (b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/80">
                      <Check className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                      {b}
                    </li>
                  )
                )}
              </ul>
              <div className="p-4 pt-0">
                <button
                  type="button"
                  onClick={onOpenPricing}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-lg"
                >
                  {ctaLabel}
                  <Zap size={16} className="opacity-90" fill="currentColor" />
                </button>
                <p className="text-[10px] text-white/30 text-center mt-2">{t("profile.checkoutHint")}</p>
              </div>
            </div>
          ) : !isPro && demo ? (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3">
              <Sparkles className="text-amber-400/90 shrink-0" size={20} />
              <p className="text-[13px] text-white/65 leading-relaxed">{t("profile.demoBlurb")}</p>
            </div>
          ) : null}

          {isPro ? (
            <button
              type="button"
              onClick={openAffiliate}
              className="w-full py-3 rounded-xl font-semibold text-sm border border-white/15 bg-white/[0.06] hover:bg-white/10 text-white/90"
            >
              {t("profile.affiliateCta")}
            </button>
          ) : null}

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                clearLicenseSession();
                onLogout();
              }}
              className="w-full py-2.5 text-sm text-white/40 hover:text-white/60"
            >
              {t("profile.signOut")}
            </button>
            <button type="button" onClick={onClose} className="w-full py-2 text-sm text-white/35 hover:text-white/55">
              {t("common.close")}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
