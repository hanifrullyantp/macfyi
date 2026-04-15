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
] as const;

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
      <h2 className="text-lg font-medium text-white">Marketing, demo &amp; AI (platform_settings)</h2>
      <p className="text-xs text-zinc-500">Nilai JSON valid. Setelah simpan, config_version naik agar landing/app refetch.</p>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <ul className="space-y-3">
        {KEYS.map((k) => (
          <li key={k} className="rounded-xl border border-zinc-800 p-3">
            <div className="text-xs font-mono text-amber-500 mb-1">{k}</div>
            <textarea
              className="w-full min-h-[48px] rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs font-mono"
              value={edit[k] ?? ""}
              onChange={(e) => setEdit((x) => ({ ...x, [k]: e.target.value }))}
            />
            <button type="button" className="mt-2 text-xs text-amber-500 underline" onClick={() => void saveKey(k)}>
              Simpan
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
