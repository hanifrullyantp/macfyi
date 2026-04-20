import { useI18n } from "../i18n/context";
import { DEFAULT_BRAND_LOGO_URL } from "../lib/defaultBrandLogo";

export function AppBootSplash({ progress, message }: { progress: number; message: string }) {
  const { t } = useI18n();
  const pct = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-[#0a0b0f] text-white px-8">
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div
          className="absolute rounded-full blur-[100px] bg-[var(--color-brand)]/15"
          style={{ width: "min(70vw, 24rem)", height: "min(70vw, 24rem)", left: "10%", top: "8%" }}
        />
        <div
          className="absolute rounded-full blur-[80px] bg-indigo-500/10"
          style={{ width: "min(55vw, 20rem)", height: "min(55vw, 20rem)", right: "5%", bottom: "12%" }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-md w-full">
        <img
          src={DEFAULT_BRAND_LOGO_URL}
          alt=""
          className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl object-contain bg-white/[0.06] border border-white/10 shadow-2xl mb-8"
        />
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center text-balance">{t("boot.title")}</h1>
        <p className="mt-3 text-sm text-white/55 text-center leading-relaxed min-h-[3rem]">{message}</p>

        <div className="mt-10 w-full">
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-white/35 mb-1.5">
            <span>{t("boot.progressLabel")}</span>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--color-brand)] to-[var(--color-brand-glow)] transition-[width] duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <p className="mt-8 text-[11px] text-white/30 text-center">{t("boot.hint")}</p>
      </div>
    </div>
  );
}
