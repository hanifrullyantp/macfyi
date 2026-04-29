import { useEffect, useMemo, useState } from "react";
import { AdminPageFrame } from "../ui2/components/AdminPageFrame";
import { supabase } from "../supabase";

type Provider = "gemini" | "groq";
type ApiKeyRecord = {
  id: string;
  provider: Provider;
  key_value: string;
  is_active: boolean;
  label: string | null;
  daily_limit: number | null;
  notes: string | null;
  last_tested_at: string | null;
  last_test_ok: boolean | null;
};

const INFO: Record<Provider, { label: string; prefix: string; url: string }> = {
  gemini: { label: "Google Gemini 2.0 Flash", prefix: "AIzaSy", url: "https://aistudio.google.com/apikey" },
  groq: { label: "Groq Llama 3.1 8B", prefix: "gsk_", url: "https://console.groq.com" },
};

export default function ApiKeysPage() {
  const [rows, setRows] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Provider | null>(null);
  const [testing, setTesting] = useState<Provider | null>(null);
  const [edit, setEdit] = useState<Record<Provider, string>>({ gemini: "", groq: "" });
  const [msg, setMsg] = useState<string | null>(null);

  const byProvider = useMemo(() => ({
    gemini: rows.find((r) => r.provider === "gemini"),
    groq: rows.find((r) => r.provider === "groq"),
  }), [rows]);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("platform_api_keys").select("*").order("provider");
    if (error) {
      setMsg(`Gagal memuat API keys: ${error.message}`);
    } else {
      const list = (data ?? []) as ApiKeyRecord[];
      setRows(list);
      setEdit({
        gemini: list.find((x) => x.provider === "gemini")?.key_value === "BELUM_DIISI" ? "" : (list.find((x) => x.provider === "gemini")?.key_value ?? ""),
        groq: list.find((x) => x.provider === "groq")?.key_value === "BELUM_DIISI" ? "" : (list.find((x) => x.provider === "groq")?.key_value ?? ""),
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchRows();
  }, []);

  const save = async (provider: Provider) => {
    const value = edit[provider].trim();
    if (!value.startsWith(INFO[provider].prefix)) {
      setMsg(`Format key tidak valid. Harus diawali ${INFO[provider].prefix}`);
      return;
    }
    setSaving(provider);
    const { error } = await supabase
      .from("platform_api_keys")
      .update({ key_value: value, is_active: true, last_tested_at: null, last_test_ok: null })
      .eq("provider", provider);
    setSaving(null);
    if (error) {
      setMsg(`Gagal menyimpan: ${error.message}`);
    } else {
      setMsg(`${INFO[provider].label} tersimpan.`);
      await fetchRows();
    }
  };

  const testKey = async (provider: Provider) => {
    const value = edit[provider].trim();
    if (!value) return;
    setTesting(provider);
    let ok = false;
    try {
      if (provider === "gemini") {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${value}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "OK" }] }] }),
        });
        ok = res.ok;
      } else {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${value}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{ role: "user", content: "OK" }], max_tokens: 5 }),
        });
        ok = res.ok;
      }
      await supabase.from("platform_api_keys").update({ last_test_ok: ok, last_tested_at: new Date().toISOString() }).eq("provider", provider);
      setMsg(ok ? `Test ${provider} berhasil.` : `Test ${provider} gagal.`);
      await fetchRows();
    } finally {
      setTesting(null);
    }
  };

  const toggle = async (provider: Provider) => {
    const row = byProvider[provider];
    if (!row) return;
    await supabase.from("platform_api_keys").update({ is_active: !row.is_active }).eq("provider", provider);
    await fetchRows();
  };

  return (
    <AdminPageFrame description="Kelola API key cloud AI. Key hanya disimpan di server Supabase dan dipakai oleh Edge Function.">
      {loading ? <p className="text-white/50">Memuat...</p> : null}
      {(["gemini", "groq"] as Provider[]).map((provider) => {
        const row = byProvider[provider];
        return (
          <div key={provider} className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">{INFO[provider].label}</h3>
              <button type="button" onClick={() => void toggle(provider)} className="rounded-lg border border-white/15 px-3 py-1 text-xs text-white/80">
                {row?.is_active ? "Active" : "Inactive"}
              </button>
            </div>
            <input
              value={edit[provider]}
              onChange={(e) => setEdit((prev) => ({ ...prev, [provider]: e.target.value }))}
              placeholder={`Paste ${provider} key`}
              className="admin-input w-full font-mono"
            />
            <div className="flex gap-2">
              <button type="button" className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white" disabled={saving === provider} onClick={() => void save(provider)}>
                {saving === provider ? "Menyimpan..." : "Simpan"}
              </button>
              <button type="button" className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/90" disabled={testing === provider} onClick={() => void testKey(provider)}>
                {testing === provider ? "Testing..." : "Test Koneksi"}
              </button>
              <a href={INFO[provider].url} target="_blank" rel="noreferrer" className="rounded-xl border border-white/15 px-3 py-2 text-xs text-white/70 hover:text-white">
                Ambil API key
              </a>
            </div>
            <p className="text-xs text-white/40">Status: {row?.last_test_ok == null ? "Belum ditest" : row.last_test_ok ? "OK" : "Error"}</p>
          </div>
        );
      })}
      {msg ? <p className="text-sm text-white/70">{msg}</p> : null}
    </AdminPageFrame>
  );
}
