import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { supabase } from "../supabase";

type AppSettingsRow = {
  id: string;
  lifetime_price_idr: number;
  product_version: string;
  terms_url: string | null;
  privacy_url: string | null;
  crm_webhook_url: string | null;
  email_from_name: string | null;
  download_base_url: string | null;
  checkout_success_base_url: string | null;
  config_version?: number | null;
};

type SecretRow = { id: string; provider: string; api_key_encrypted: string; updated_at: string };

const DEMO_PLATFORM_KEYS = [
  "demo.token_ttl_days",
  "demo.clean_daily_gb_cap",
  "demo.clean_daily_items_cap",
  "demo.clean_safe_risk_only",
  "demo.uninstall_actions_per_day",
  "demo.ai_questions_per_day",
  "demo.allow_anonymous_demo_request",
] as const;

function platformValueToInput(v: unknown): string {
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string") return v;
  if (v === null || v === undefined) return "";
  try {
    return JSON.stringify(v);
  } catch {
    return "";
  }
}

function parseDemoInput(key: string, raw: string): unknown {
  const t = raw.trim();
  if (key === "demo.clean_safe_risk_only" || key === "demo.allow_anonymous_demo_request") {
    return t === "true" || t === "1" || t === "yes";
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

export default function AppSettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"general" | "ai" | "demo">("general");
  const [settings, setSettings] = useState<AppSettingsRow | null>(null);
  const [secrets, setSecrets] = useState<SecretRow[]>([]);
  const [demoPlatform, setDemoPlatform] = useState<Record<string, string>>({});
  const [newSecretProvider, setNewSecretProvider] = useState("openai");
  const [newSecretKey, setNewSecretKey] = useState("");

  const load = useCallback(async () => {
    const [s, sec, demo] = await Promise.all([
      supabase.from("app_settings").select("*").eq("id", "default").maybeSingle(),
      supabase.from("ai_provider_secrets").select("id,provider,api_key_encrypted,updated_at").order("id"),
      supabase.from("platform_settings").select("key, value").in("key", [...DEMO_PLATFORM_KEYS]),
    ]);
    if (s.error) throw s.error;
    if (sec.error) throw sec.error;
    if (demo.error) throw demo.error;
    const nextDemo: Record<string, string> = {};
    for (const k of DEMO_PLATFORM_KEYS) nextDemo[k] = "";
    for (const row of demo.data ?? []) {
      const r = row as { key: string; value: unknown };
      nextDemo[r.key] = platformValueToInput(r.value);
    }
    setDemoPlatform(nextDemo);
    setSettings(s.data as AppSettingsRow);
    setSecrets((sec.data ?? []) as SecretRow[]);
  }, []);

  const q = useQuery({
    queryKey: ["app_settings", "full"],
    queryFn: load,
  });

  useEffect(() => {
    if (q.error) toast.error((q.error as Error).message);
  }, [q.error]);

  const saveSettingsMut = useMutation({
    mutationFn: async () => {
      if (!settings) return;
      const nextCfgVer = (Number(settings.config_version) || 1) + 1;
      const { error } = await supabase.from("app_settings").upsert({
        id: "default",
        lifetime_price_idr: settings.lifetime_price_idr,
        product_version: settings.product_version,
        terms_url: settings.terms_url || null,
        privacy_url: settings.privacy_url || null,
        crm_webhook_url: settings.crm_webhook_url || null,
        email_from_name: settings.email_from_name || null,
        download_base_url: settings.download_base_url || null,
        checkout_success_base_url: settings.checkout_success_base_url || null,
        config_version: nextCfgVer,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("App settings saved");
      await qc.invalidateQueries({ queryKey: ["app_settings"] });
      await load();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveDemoMut = useMutation({
    mutationFn: async () => {
      for (const key of DEMO_PLATFORM_KEYS) {
        const raw = demoPlatform[key] ?? "";
        const value = parseDemoInput(key, raw);
        const { error } = await supabase.from("platform_settings").upsert({
          key,
          value: value as never,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
      const { data: ver } = await supabase.from("app_settings").select("config_version").eq("id", "default").maybeSingle();
      const nextV = (Number(ver?.config_version) || 1) + 1;
      await supabase.from("app_settings").update({ config_version: nextV, updated_at: new Date().toISOString() }).eq("id", "default");
    },
    onSuccess: async () => {
      toast.success("Demo limits saved");
      await qc.invalidateQueries({ queryKey: ["app_settings"] });
      await load();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upsertSecretMut = useMutation({
    mutationFn: async () => {
      const key = newSecretKey.trim();
      if (!key) throw new Error("Enter API key");
      const id = newSecretProvider.trim().toLowerCase().replace(/\s+/g, "_");
      const { error } = await supabase.from("ai_provider_secrets").upsert({
        id,
        provider: newSecretProvider.trim(),
        api_key_encrypted: key,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Secret saved");
      setNewSecretKey("");
      await load();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testAiProxy = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      toast.error("No session token");
      return;
    }
    const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") ?? "";
    const res = await fetch(`${base}/functions/v1/ai-proxy`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    const text = await res.text();
    toast.message(`ai-proxy ${res.status}`, { description: text.slice(0, 200) });
  };

  const tabBtn = (id: typeof tab, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === id ? "bg-violet-600 text-white" : "text-zinc-400 hover:bg-zinc-800"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">App settings</h1>
        <p className="mt-1 text-sm text-zinc-500">Business links, AI secrets, demo caps in platform_settings.</p>
      </div>

      {q.isLoading ? <p className="text-sm text-zinc-500">Loading…</p> : null}

      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
        {tabBtn("general", "General")}
        {tabBtn("ai", "AI secrets")}
        {tabBtn("demo", "Demo limits")}
      </div>

      {tab === "general" && settings && (
        <Card className="space-y-4 p-6">
          <h2 className="text-sm font-medium text-zinc-200">Business &amp; links</h2>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <label className="block">
              <span className="text-zinc-500">Lifetime price (IDR)</span>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                value={settings.lifetime_price_idr}
                onChange={(e) => setSettings({ ...settings, lifetime_price_idr: Number(e.target.value) })}
              />
            </label>
            <label className="block">
              <span className="text-zinc-500">Product version</span>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                value={settings.product_version}
                onChange={(e) => setSettings({ ...settings, product_version: e.target.value })}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-zinc-500">Download base URL</span>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                value={settings.download_base_url ?? ""}
                onChange={(e) => setSettings({ ...settings, download_base_url: e.target.value || null })}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-zinc-500">Checkout success base URL</span>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                value={settings.checkout_success_base_url ?? ""}
                onChange={(e) => setSettings({ ...settings, checkout_success_base_url: e.target.value || null })}
              />
            </label>
            <label className="block">
              <span className="text-zinc-500">Terms URL</span>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                value={settings.terms_url ?? ""}
                onChange={(e) => setSettings({ ...settings, terms_url: e.target.value || null })}
              />
            </label>
            <label className="block">
              <span className="text-zinc-500">Privacy URL</span>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                value={settings.privacy_url ?? ""}
                onChange={(e) => setSettings({ ...settings, privacy_url: e.target.value || null })}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-zinc-500">CRM webhook URL</span>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                value={settings.crm_webhook_url ?? ""}
                onChange={(e) => setSettings({ ...settings, crm_webhook_url: e.target.value || null })}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-zinc-500">Email from display name</span>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                value={settings.email_from_name ?? ""}
                onChange={(e) => setSettings({ ...settings, email_from_name: e.target.value || null })}
              />
            </label>
          </div>
          <Button variant="primary" disabled={saveSettingsMut.isPending} onClick={() => void saveSettingsMut.mutateAsync()}>
            Save general
          </Button>
        </Card>
      )}

      {tab === "ai" && (
        <Card className="space-y-4 p-6">
          <p className="text-xs text-zinc-500">Opaque strings in DB — protect with Vault / column encryption in production.</p>
          <ul className="space-y-2 text-sm">
            {secrets.map((s) => (
              <li key={s.id} className="font-mono text-xs text-zinc-400">
                {s.provider} — {s.api_key_encrypted.slice(0, 6)}… (updated {s.updated_at?.slice(0, 10)})
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <input
              className="min-w-[120px] flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Provider label"
              value={newSecretProvider}
              onChange={(e) => setNewSecretProvider(e.target.value)}
            />
            <input
              className="min-w-[200px] flex-[2] rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="API key"
              type="password"
              value={newSecretKey}
              onChange={(e) => setNewSecretKey(e.target.value)}
            />
            <Button variant="secondary" disabled={upsertSecretMut.isPending} onClick={() => void upsertSecretMut.mutateAsync()}>
              Save key
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void testAiProxy()}>
            Test ai-proxy Edge
          </Button>
        </Card>
      )}

      {tab === "demo" && (
        <Card className="space-y-4 p-6">
          <p className="text-xs text-zinc-500">Keys in platform_settings (demo.*).</p>
          <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <label className="block">
              <span className="text-zinc-500">Token TTL (days)</span>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                value={demoPlatform["demo.token_ttl_days"] ?? ""}
                onChange={(e) => setDemoPlatform((p) => ({ ...p, "demo.token_ttl_days": e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="text-zinc-500">Clean demo max GB / day</span>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                value={demoPlatform["demo.clean_daily_gb_cap"] ?? ""}
                onChange={(e) => setDemoPlatform((p) => ({ ...p, "demo.clean_daily_gb_cap": e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="text-zinc-500">Clean demo max items / day</span>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                value={demoPlatform["demo.clean_daily_items_cap"] ?? ""}
                onChange={(e) => setDemoPlatform((p) => ({ ...p, "demo.clean_daily_items_cap": e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="text-zinc-500">Uninstall actions / day</span>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                value={demoPlatform["demo.uninstall_actions_per_day"] ?? ""}
                onChange={(e) => setDemoPlatform((p) => ({ ...p, "demo.uninstall_actions_per_day": e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="text-zinc-500">AI questions / day (demo)</span>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                value={demoPlatform["demo.ai_questions_per_day"] ?? ""}
                onChange={(e) => setDemoPlatform((p) => ({ ...p, "demo.ai_questions_per_day": e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="text-zinc-500">Clean: safe risk only</span>
              <select
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                value={demoPlatform["demo.clean_safe_risk_only"] === "true" ? "true" : "false"}
                onChange={(e) => setDemoPlatform((p) => ({ ...p, "demo.clean_safe_risk_only": e.target.value }))}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="text-zinc-500">Allow anonymous demo request</span>
              <select
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                value={demoPlatform["demo.allow_anonymous_demo_request"] === "true" ? "true" : "false"}
                onChange={(e) => setDemoPlatform((p) => ({ ...p, "demo.allow_anonymous_demo_request": e.target.value }))}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </label>
          </div>
          <Button variant="primary" disabled={saveDemoMut.isPending} onClick={() => void saveDemoMut.mutateAsync()}>
            Save demo limits
          </Button>
        </Card>
      )}
    </div>
  );
}
