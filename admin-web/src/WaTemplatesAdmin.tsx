import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

export function WaTemplatesAdmin() {
  const [rows, setRows] = useState<{ id: string; name: string; body: string }[]>([]);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("wa_templates").select("id, name, body").order("name");
    if (error) setErr(error.message);
    else {
      setErr(null);
      setRows((data ?? []) as typeof rows);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!name.trim() || !body.trim()) return;
    const { error } = await supabase.from("wa_templates").insert({ name: name.trim(), body: body.trim() });
    if (error) setErr(error.message);
    else {
      setName("");
      setBody("");
      void load();
    }
  };

  const del = async (id: string) => {
    if (!confirm("Hapus template?")) return;
    await supabase.from("wa_templates").delete().eq("id", id);
    void load();
  };

  return (
    <div className="space-y-4">
      <h2 className="admin-section-title text-base">WhatsApp templates</h2>
      {err && <p className="text-sm text-red-400/90">{err}</p>}
      <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <input className="admin-input" placeholder="Nama" value={name} onChange={(e) => setName(e.target.value)} />
        <textarea className="admin-textarea min-h-[100px] w-full" placeholder="Body — gunakan {name} {email} …" value={body} onChange={(e) => setBody(e.target.value)} />
        <button
          type="button"
          className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 hover:bg-red-500"
          onClick={() => void create()}
        >
          Tambah
        </button>
      </div>
      <ul className="space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-white/85">
            <div>
              <div className="font-medium">{r.name}</div>
              <div className="mt-1 text-xs text-white/40 whitespace-pre-wrap">{r.body}</div>
            </div>
            <button type="button" className="shrink-0 text-xs text-red-400/90 hover:text-red-300" onClick={() => void del(r.id)}>
              Hapus
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
