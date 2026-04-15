import { motion } from "framer-motion";
import { Sparkles, Check, X } from "lucide-react";
import { useI18n } from "../i18n/context";

export const UpgradePrompt = ({
  onUpgrade,
  onMaybeLater,
  priceShort,
}: {
  onUpgrade: () => void;
  onMaybeLater: () => void;
  /** Dari public-config (admin); jika kosong pakai teks i18n bawaan */
  priceShort?: string | null;
}) => {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[200] p-6">
      <div className="absolute inset-0 bg-black/75" onClick={onMaybeLater} />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-md bg-[#1c1c1e] border border-white/20 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="bg-gradient-to-br from-[#8b0000] via-[var(--color-brand)] to-[var(--color-brand-glow)] p-8 text-center text-white">
          <Sparkles size={48} className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold">{t("upgrade.title")}</h2>
          <p className="text-white/85 mt-2">{t("upgrade.subtitle")}</p>
        </div>

        <div className="p-8 space-y-4">
          <FeatureItem text={t("upgrade.feat1")} />
          <FeatureItem text={t("upgrade.feat2")} />
          <FeatureItem text={t("upgrade.feat3")} />
          <FeatureItem text={t("upgrade.feat4")} />

          <div className="pt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={onUpgrade}
              className="w-full py-4 btn-primary rounded-2xl font-bold text-lg shadow-lg shadow-black/25"
            >
              {priceShort?.trim()
                ? t("upgrade.ctaWithPrice", { price: priceShort.trim() })
                : t("upgrade.cta")}
            </button>
            <button
              type="button"
              onClick={onMaybeLater}
              className="w-full py-3 text-white/40 hover:text-white/60 transition-colors text-sm font-medium"
            >
              {t("upgrade.later")}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onMaybeLater}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </motion.div>
    </div>
  );
};

const FeatureItem = ({ text }: { text: string }) => (
  <div className="flex items-center gap-3">
    <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center shrink-0">
      <Check size={12} className="text-white/90" />
    </div>
    <span className="text-white/80 text-sm font-medium">{text}</span>
  </div>
);
