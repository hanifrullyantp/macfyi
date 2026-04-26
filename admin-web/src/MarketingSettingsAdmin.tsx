import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

const KEYS = [
  "demo.token_ttl_days",
  "demo.clean_daily_gb_cap",
  "demo.clean_daily_items_cap",
  "demo.clean_safe_risk_only",
  "demo.uninstall_actions_per_day",
  "demo.ai_questions_per_day",
  "ai.global_enabled",
  "ai.default_model_id",
  "ai.max_output_tokens",
  "marketing.notification_banner_enabled",
  "marketing.social_toast_enabled",
  "seo.ga4_measurement_id",
  "seo.facebook_pixel_id",
  /** Modal upgrade di app desktop — ada di respons public-config bagian desktop.upgrade_paywall */
  "desktop.upgrade_paywall.use_session_clean_amount",
  "desktop.upgrade_paywall.subtitle_with_amount_id",
  "desktop.upgrade_paywall.subtitle_with_amount_en",
  "desktop.upgrade_paywall.subtitle_generic_id",
  "desktop.upgrade_paywall.subtitle_generic_en",
] as const;

const KEY_HINTS: Partial<Record<(typeof KEYS)[number], string>> = {
  "desktop.upgrade_paywall.use_session_clean_amount":
    "true = setelah bersih, subjudul memakai jumlah ruang yang benar dari Macfyi. false = selalu teks generik (tanpa angka sesi).",
  "desktop.upgrade_paywall.subtitle_with_amount_id":
    "Bahasa Indonesia. Harus ada placeholder {amount} — contoh: Kamu sudah membersihkan {amount}! Dapatkan fitur tanpa batas.",
  "desktop.upgrade_paywall.subtitle_with_amount_en":
    "English. Include {amount} — e.g. You've cleaned {amount} already! Get unlimited power.",
  "desktop.upgrade_paywall.subtitle_generic_id":
    "Subjudul tanpa angka (tombol upgrade manual / saat use_session_clean_amount false). Tanpa {amount}.",
  "desktop.upgrade_paywall.subtitle_generic_en": "Generic English subtitle when no session amount is shown.",
};

export function MarketingSettingsAdmin() {
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("platform_settings").select("key, value").in("key", [...KEYS]);
    if (error) {
      setErr(error.message);
      return;
    }
    const next: Record<string, string> = {};
    for (const k of KEYS) next[k] = "";
    for (const row of data ?? []) {
      next[row.key as string] = JSON.stringify(row.value);
    }
    setEdit(next);
    setErr(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveKey = async (key: string) => {
    const raw = edit[key] ?? "";
    let parsed: unknown = raw;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
    const { error } = await supabase.from("platform_settings").upsert({
      key,
      value: parsed as never,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setErr(error.message);
      return;
    }
    const { data: ver } = await supabase.from("app_settings").select("config_version").eq("id", "default").maybeSingle();
    const nextV = (Number(ver?.config_version) || 1) + 1;
    await supabase.from("app_settings").update({ config_version: nextV, updated_at: new Date().toISOString() }).eq("id", "default");
    void load();
  };

  return (
    <div className="space-y-4">
      <h2 className="admin-section-title text-base">Marketing, demo &amp; AI (platform_settings)</h2>
      <p className="admin-help max-w-2xl">
        Nilai JSON valid (boolean angka tanpa kutip, string pakai kutip). Setelah simpan, config_version naik agar landing/app refetch public-config (~30 detik cache).
      </p>
      {err && <p className="text-sm text-red-400/90">{err}</p>}
      <ul className="space-y-3">
        {KEYS.map((k) => (
          <li key={k} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
            <div className="mb-1 text-xs font-mono text-red-400/80">{k}</div>
            {KEY_HINTS[k] ? <p className="mb-2 text-[11px] leading-snug text-white/40">{KEY_HINTS[k]}</p> : null}
            <textarea
              className="admin-textarea-compact w-full"
              value={edit[k] ?? ""}
              onChange={(e) => setEdit((x) => ({ ...x, [k]: e.target.value }))}
            />
            <button
              type="button"
              className="mt-3 text-xs font-bold uppercase tracking-widest text-red-400/90 underline decoration-red-500/30 decoration-1 underline-offset-2 hover:text-red-300"
              onClick={() => void saveKey(k)}
            >
              Simpan
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
