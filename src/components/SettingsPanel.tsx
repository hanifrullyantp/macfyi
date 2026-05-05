import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Settings } from "lucide-react";

import type { DeletionModeSetting } from "../lib/deletion-settings";
export type { DeletionModeSetting } from "../lib/deletion-settings";
import { useI18n } from "../i18n/context";
import { marketingPrivacyUrl, marketingTermsUrl } from "../lib/marketingUrl";

export interface ScanSettings {
  scanDownloads: boolean;
  scanDocuments: boolean;
  scanCaches: boolean;
  scanDeveloper: boolean;
  scanMail: boolean;
  scanAppSupport: boolean;
  largeSizeThresholdMb: number;
  oldDaysThreshold: number;
  /** Default for cleanup: recoverable trash vs permanent delete */
  deletionMode: DeletionModeSetting;
  /** Completion chimes (Web Audio) */
  soundEnabled: boolean;
  /** Bottom floating quick-scan orb (off by default) */
  showFloatingQuickScan: boolean;
}

const DEFAULT_SETTINGS: ScanSettings = {
  scanDownloads: true,
  scanDocuments: true,
  scanCaches: true,
  scanDeveloper: true,
  scanMail: true,
  scanAppSupport: true,
  largeSizeThresholdMb: 100,
  oldDaysThreshold: 30,
  deletionMode: "trash",
  soundEnabled: true,
  showFloatingQuickScan: false,
};

const STORAGE_KEY = "macfyi_settings";

export function loadSettings(): ScanSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as ScanSettings;
  } catch { /* */ }
  return DEFAULT_SETTINGS;
}

function saveSettings(s: ScanSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

interface SettingsPanelProps {
  onClose: () => void;
  /** Show onboarding tour again (clears completion flag). */
  onReplayTour?: () => void;
}

export function SettingsPanel({ onClose, onReplayTour }: SettingsPanelProps) {
  const { t, locale, setLocale } = useI18n();
  const [settings, setSettings] = useState<ScanSettings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const toggle = (key: keyof ScanSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="relative w-full max-w-md bg-[#1c1c1e] border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-[var(--color-brand-glow)]" />
            <span className="font-semibold text-white">{t("settings.title")}</span>
          </div>
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">{t("settings.language")}</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  locale === "en" ? "bg-[var(--color-brand)] text-white" : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
              >
                {t("settings.langEn")}
              </button>
              <button
                type="button"
                onClick={() => setLocale("id")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  locale === "id" ? "bg-[var(--color-brand)] text-white" : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
              >
                {t("settings.langId")}
              </button>
            </div>
          </div>

          {onReplayTour && (
            <div>
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">{t("settings.replayTour")}</h3>
              <p className="text-[11px] text-white/45 mb-2">{t("settings.replayTourHint")}</p>
              <button
                type="button"
                onClick={onReplayTour}
                className="w-full py-2.5 rounded-xl text-sm font-medium border border-white/15 bg-white/[0.06] text-white/90 hover:bg-white/10"
              >
                {t("settings.replayTour")}
              </button>
            </div>
          )}

          <div>
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">{t("settings.appearance")}</h3>
            <p className="text-[11px] text-white/45 mb-2">{t("settings.showFloatingQuickScanHint")}</p>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={settings.showFloatingQuickScan}
                onChange={() => toggle("showFloatingQuickScan")}
                className="w-4 h-4 rounded border-white/20 bg-white/5 accent-[var(--color-brand)] focus:ring-[var(--color-accent-soft)]/40"
              />
              <span className="text-sm text-white/70 group-hover:text-white">{t("settings.showFloatingQuickScanLabel")}</span>
            </label>
          </div>

          <div>
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">{t("settings.scanScope")}</h3>
            <div className="space-y-2">
              {([
                ["scanDownloads", "settings.scanDownloads"],
                ["scanDocuments", "settings.scanDocuments"],
                ["scanCaches", "settings.scanCaches"],
                ["scanDeveloper", "settings.scanDeveloper"],
                ["scanMail", "settings.scanMail"],
                ["scanAppSupport", "settings.scanAppSupport"],
              ] as const).map(([key, labelKey]) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={settings[key] as boolean}
                    onChange={() => toggle(key)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 accent-[var(--color-brand)] focus:ring-[var(--color-accent-soft)]/40"
                  />
                  <span className="text-sm text-white/70 group-hover:text-white">{t(labelKey)}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">{t("settings.soundEffect")}</h3>
            <p className="text-[11px] text-white/45 mb-2">{t("settings.soundHint")}</p>
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={() => toggle("soundEnabled")}
                className="w-4 h-4 rounded border-white/20 bg-white/5 accent-[var(--color-brand)] focus:ring-[var(--color-accent-soft)]/40"
              />
              <span className="text-sm text-white/70 group-hover:text-white">{t("settings.soundEnabledLabel")}</span>
            </label>
          </div>

          <div>
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">{t("settings.deletionSection")}</h3>
            <p className="text-[11px] text-white/45 mb-2">{t("settings.deletionHint")}</p>
            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="del"
                  checked={settings.deletionMode === "trash"}
                  onChange={() => setSettings((s) => ({ ...s, deletionMode: "trash" }))}
                  className="mt-1"
                />
                <span className="text-sm text-white/80">{t("settings.moveToTrash")}</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="del"
                  checked={settings.deletionMode === "permanent"}
                  onChange={() => setSettings((s) => ({ ...s, deletionMode: "permanent" }))}
                  className="mt-1"
                />
                <span className="text-sm text-amber-200/90">{t("settings.deletePermanent")}</span>
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">{t("settings.thresholds")}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/60 block mb-1">
                  {t("settings.largeFileThreshold", { mb: settings.largeSizeThresholdMb })}
                </label>
                <input
                  type="range" min={10} max={500} step={10}
                  value={settings.largeSizeThresholdMb}
                  onChange={(e) => setSettings((s) => ({ ...s, largeSizeThresholdMb: Number(e.target.value) }))}
                  className="w-full accent-[var(--color-brand)]"
                />
              </div>
              <div>
                <label className="text-xs text-white/60 block mb-1">
                  {t("settings.oldFileThreshold", { days: settings.oldDaysThreshold })}
                </label>
                <input
                  type="range" min={7} max={365} step={7}
                  value={settings.oldDaysThreshold}
                  onChange={(e) => setSettings((s) => ({ ...s, oldDaysThreshold: Number(e.target.value) }))}
                  className="w-full accent-[var(--color-brand)]"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Legal</h3>
            <p className="text-[11px] text-white/45 mb-2">
              Syarat & Ketentuan / Terms and Conditions, serta Kebijakan Privasi / Privacy Policy.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => window.open(marketingTermsUrl(), "_blank", "noopener,noreferrer")}
                className="py-2.5 rounded-xl text-xs font-medium border border-white/15 bg-white/[0.06] text-white/90 hover:bg-white/10"
              >
                Terms
              </button>
              <button
                type="button"
                onClick={() => window.open(marketingPrivacyUrl(), "_blank", "noopener,noreferrer")}
                className="py-2.5 rounded-xl text-xs font-medium border border-white/15 bg-white/[0.06] text-white/90 hover:bg-white/10"
              >
                Privacy
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 btn-primary rounded-xl font-medium text-sm"
          >
            {t("common.done")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
