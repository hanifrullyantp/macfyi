import type { LocaleCode } from "../i18n/context";
import type { PublicConfig } from "./publicConfig";

type TFn = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Menyusun teks subjudul modal upgrade Pro.
 * - Setelah pembersihan: gunakan template dengan `{amount}` atau fallback i18n `upgrade.subtitleWithAmount`.
 * - Tanpa konteks bersih (tombol upgrade): generik dari admin atau `upgrade.subtitleGeneric`.
 */
export function resolveUpgradePaywallSubtitle(
  locale: LocaleCode,
  cfg: PublicConfig | null,
  opts: { freedLabel: string | null; openedAfterClean: boolean },
  t: TFn
): string {
  const dw = cfg?.desktop?.upgrade_paywall;
  const useSession = dw?.use_session_clean_amount !== false;
  const amount = opts.freedLabel?.trim() ?? "";
  const showAmount = Boolean(amount) && opts.openedAfterClean && useSession;

  if (showAmount) {
    const custom =
      locale === "id" ? dw?.subtitle_with_amount_id?.trim() : dw?.subtitle_with_amount_en?.trim();
    if (custom && custom.includes("{amount}")) {
      return custom.replace(/\{amount\}/g, amount);
    }
    return t("upgrade.subtitleWithAmount", { amount });
  }

  const genericCustom =
    locale === "id" ? dw?.subtitle_generic_id?.trim() : dw?.subtitle_generic_en?.trim();
  if (genericCustom) return genericCustom;
  return t("upgrade.subtitleGeneric");
}
