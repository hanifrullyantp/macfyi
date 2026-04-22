import { motion } from "framer-motion";
import { User, X, Sparkles } from "lucide-react";
import { useI18n } from "../i18n/context";
import { getStoredLicenseEmail } from "../lib/activation";
import { isDemoMode } from "../lib/demoSession";
import { DEFAULT_BRAND_LOGO_URL } from "../lib/defaultBrandLogo";

export function ProfileAccountPanel({
  brandLogoUrl,
  onClose,
  onOpenPricing,
}: {
  brandLogoUrl?: string | null;
  onClose: () => void;
  onOpenPricing: () => void;
}) {
  const { t } = useI18n();
  const email = getStoredLicenseEmail()?.trim() || "";
  const demo = isDemoMode();
  const statusKey = demo ? "profile.statusDemo" : email ? "profile.statusLicensed" : "profile.statusGuest";

  const logoSrc =
    typeof brandLogoUrl === "string" && brandLogoUrl.trim().length > 0 ? brandLogoUrl.trim() : DEFAULT_BRAND_LOGO_URL;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[200] p-6">
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-md bg-[#1c1c1e] border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="bg-gradient-to-br from-[#8b0000]/90 via-[var(--color-brand)] to-[var(--color-brand-glow)] p-6 text-white">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="" className="h-12 w-12 rounded-xl object-contain border border-white/20 bg-black/20" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <User size={18} className="opacity-90 shrink-0" />
                <h2 className="text-lg font-bold truncate">{t("profile.title")}</h2>
              </div>
              <p className="text-white/85 text-sm mt-1">{t(statusKey)}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {email ? (
            <div>
              <div className="text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1">{t("profile.emailLabel")}</div>
              <p className="text-sm text-white/80 break-all">{email}</p>
            </div>
          ) : (
            <p className="text-sm text-white/50">{t("profile.noEmailHint")}</p>
          )}

          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 flex gap-3">
            <Sparkles className="text-[var(--color-brand-glow)] shrink-0 mt-0.5" size={20} />
            <p className="text-[13px] text-white/65 leading-relaxed">{t("profile.lifetimeBlurb")}</p>
          </div>

          <button
            type="button"
            onClick={onOpenPricing}
            className="w-full py-3.5 btn-primary rounded-xl font-bold text-sm shadow-lg shadow-black/25"
          >
            {t("profile.ctaLifetimePromo")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-white/40 hover:text-white/65 transition-colors text-sm font-medium"
          >
            {t("common.close")}
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          aria-label={t("common.close")}
        >
          <X size={20} />
        </button>
      </motion.div>
    </div>
  );
}
