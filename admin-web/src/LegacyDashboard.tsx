import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type AppSettingsRow = {
  id: string;
  lifetime_price_idr: number;
  product_version: string;
  terms_url: string | null;
  privacy_url: string | null;
  crm_webhook_url: string | null;
  email_from_name: string | null;
  download_base_url: string | null;
};

type LicenseRow = {
  id: string;
  email: string;
  status: string;
  created_at: string;
  revoked_at: string | null;
  price_paid_idr: number | null;
};

type ActivationRow = {
  id: string;
  license_id: string;
  device_fingerprint: string;
  activated_at: string;
  last_seen_at: string;
  licenses: { email: string } | null;
};

type SecretRow = {
  id: string;
  provider: string;
  api_key_encrypted: string;
  updated_at: string;
};

function isAdmin(session: Session | null): boolean {
  return session?.user.app_metadata?.role === "admin";
}

export function LegacyDashboard({ session }: { session: Session }) {
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<AppSettingsRow | null>(null);
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [activations, setActivations] = useState<ActivationRow[]>([]);
  const [secrets, setSecrets] = useState<SecretRow[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [newSecretProvider, setNewSecretProvider] = useState("openai");
  const [newSecretKey, setNewSecretKey] = useState("");

  const loadDashboard = useCallback(async () => {
    if (!session || !isAdmin(session)) return;
    setBusy(true);
    setDataError(null);
    try {
      const [s, l, a, sec] = await Promise.all([
        supabase.from("app_settings").select("*").eq("id", "default").maybeSingle(),
        supabase.from("licenses").select("id,email,status,created_at,revoked_at,price_paid_idr").order("created_at", { ascending: false }).limit(200),
        supabase
          .from("activations")
          .select("id,license_id,device_fingerprint,activated_at,last_seen_at, licenses(email)")
          .order("activated_at", { ascending: false })
          .limit(200),
        supabase.from("ai_provider_secrets").select("id,provider,api_key_encrypted,updated_at").order("id"),
      ]);
      if (s.error) throw s.error;
      if (l.error) throw l.error;
      if (a.error) throw a.error;
      if (sec.error) throw sec.error;
      setSettings(s.data as AppSettingsRow);
      setLicenses((l.data ?? []) as LicenseRow[]);
      setActivations((a.data ?? []) as ActivationRow[]);
      setSecrets((sec.data ?? []) as SecretRow[]);
    } catch (e) {
      setDataError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [session]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const saveSettings = async () => {
    if (!settings) return;
    setBusy(true);
    setDataError(null);
    const { error } = await supabase.from("app_settings").upsert({
      id: "default",
      lifetime_price_idr: settings.lifetime_price_idr,
      product_version: settings.product_version,
      terms_url: settings.terms_url || null,
      privacy_url: settings.privacy_url || null,
      crm_webhook_url: settings.crm_webhook_url || null,
      email_from_name: settings.email_from_name || null,
      download_base_url: settings.download_base_url || null,
    });
    setBusy(false);
    if (error) setDataError(error.message);
    else void loadDashboard();
  };

  const revokeLicense = async (id: string) => {
    if (!confirm("Revoke this license?")) return;
    setBusy(true);
    const { error } = await supabase
      .from("licenses")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", id);
    setBusy(false);
    if (error) setDataError(error.message);
    else void loadDashboard();
  };

  const upsertSecret = async () => {
    const key = newSecretKey.trim();
    if (!key) return;
    setBusy(true);
    const id = newSecretProvider.trim().toLowerCase().replace(/\s+/g, "_");
    const { error } = await supabase.from("ai_provider_secrets").upsert({
      id,
      provider: newSecretProvider.trim(),
      api_key_encrypted: key,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    setNewSecretKey("");
    if (error) setDataError(error.message);
    else void loadDashboard();
  };

  const testAiProxy = async () => {
    setDataError(null);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setDataError("No session token");
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
    setDataError(`ai-proxy ${res.status}: ${text}`);
  };

  return (
    <div className="space-y-10">
      {dataError && (
        <div className="rounded-lg border border-amber-900/80 bg-amber-950/40 px-4 py-3 text-sm text-amber-100 whitespace-pre-wrap">
          {dataError}
        </div>
      )}

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-medium text-white">Business &amp; links</h2>
        <p className="text-xs text-zinc-500 mt-1">Stored in app_settings (default row).</p>
        {settings && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
              <span className="text-zinc-500">Download base URL (DMG)</span>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                value={settings.download_base_url ?? ""}
                onChange={(e) => setSettings({ ...settings, download_base_url: e.target.value || null })}
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
              <span className="text-zinc-500">Email &quot;from&quot; display name</span>
              <input
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2"
                value={settings.email_from_name ?? ""}
                onChange={(e) => setSettings({ ...settings, email_from_name: e.target.value || null })}
              />
            </label>
          </div>
        )}
        <button
          type="button"
          disabled={busy || !settings}
          onClick={() => void saveSettings()}
          className="mt-6 rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
        >
          Save settings
        </button>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 overflow-x-auto">
        <h2 className="text-lg font-medium text-white">Licenses</h2>
        <table className="mt-4 w-full text-sm text-left">
          <thead>
            <tr className="text-zinc-500 border-b border-zinc-800">
              <th className="pb-2 pr-4">Email</th>
              <th className="pb-2 pr-4">Status</th>
              <th className="pb-2 pr-4">Created</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {licenses.map((row) => (
              <tr key={row.id} className="border-b border-zinc-800/80">
                <td className="py-2 pr-4 font-mono text-xs">{row.email}</td>
                <td className="py-2 pr-4">{row.status}</td>
                <td className="py-2 pr-4 text-zinc-500">{row.created_at?.slice(0, 10)}</td>
                <td className="py-2">
                  {row.status === "active" && (
                    <button type="button" className="text-red-400 hover:underline text-xs" onClick={() => void revokeLicense(row.id)}>
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 overflow-x-auto">
        <h2 className="text-lg font-medium text-white">Activations</h2>
        <table className="mt-4 w-full text-sm text-left">
          <thead>
            <tr className="text-zinc-500 border-b border-zinc-800">
              <th className="pb-2 pr-4">Email</th>
              <th className="pb-2 pr-4">Device hash</th>
              <th className="pb-2">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {activations.map((row) => (
              <tr key={row.id} className="border-b border-zinc-800/80">
                <td className="py-2 pr-4 font-mono text-xs">{row.licenses?.email ?? "—"}</td>
                <td className="py-2 pr-4 font-mono text-xs truncate max-w-[200px]">{row.device_fingerprint.slice(0, 24)}…</td>
                <td className="py-2 text-zinc-500">{row.last_seen_at?.slice(0, 19)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-medium text-white">AI provider keys</h2>
        <p className="text-xs text-zinc-500 mt-1">Stored as opaque strings; encrypt at rest in production (Vault / column encryption).</p>
        <ul className="mt-3 space-y-2 text-sm">
          {secrets.map((s) => (
            <li key={s.id} className="font-mono text-xs text-zinc-400">
              {s.provider} — {s.api_key_encrypted.slice(0, 6)}… (updated {s.updated_at?.slice(0, 10)})
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm flex-1 min-w-[120px]"
            placeholder="Provider label"
            value={newSecretProvider}
            onChange={(e) => setNewSecretProvider(e.target.value)}
          />
          <input
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm flex-[2] min-w-[200px]"
            placeholder="API key"
            type="password"
            value={newSecretKey}
            onChange={(e) => setNewSecretKey(e.target.value)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void upsertSecret()}
            className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
          >
            Save key
          </button>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void testAiProxy()}
          className="mt-4 text-sm text-amber-500 hover:underline"
        >
          Test ai-proxy Edge Function (expect 501 until implemented)
        </button>
      </section>
    </div>
  );
}
