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
      <h2 className="text-lg font-medium text-white">WhatsApp templates</h2>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <div className="rounded-xl border border-zinc-800 p-4 space-y-2">
        <input className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm" placeholder="Nama" value={name} onChange={(e) => setName(e.target.value)} />
        <textarea className="w-full min-h-[100px] rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm" placeholder="Body — gunakan {name} {email} …" value={body} onChange={(e) => setBody(e.target.value)} />
        <button type="button" className="rounded-lg bg-amber-600 px-3 py-2 text-sm text-white" onClick={() => void create()}>
          Tambah
        </button>
      </div>
      <ul className="space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex justify-between gap-2 border border-zinc-800 rounded-lg p-3">
            <div>
              <div className="font-medium">{r.name}</div>
              <div className="text-zinc-500 text-xs mt-1 whitespace-pre-wrap">{r.body}</div>
            </div>
            <button type="button" className="text-red-400 text-xs shrink-0" onClick={() => void del(r.id)}>
              Hapus
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
