import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export { CrmHubAdmin } from "./CrmHub";

async function edgeFetch(path: string, session: Session, body: Record<string, unknown>) {
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
  const token = session.access_token;
  return fetch(`${base}/functions/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anon,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export function WithdrawalsAdmin({ session }: { session: Session }) {
  const [rows, setRows] = useState<
    { id: string; amount_idr: number; fee_idr: number; status: string; method: string; created_at: string; affiliate_id: string; slug: string }[]
  >([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: w, error: e1 } = await supabase
      .from("withdrawal_requests")
      .select("id, amount_idr, fee_idr, status, method, created_at, affiliate_id")
      .order("created_at", { ascending: false })
      .limit(100);
    if (e1) {
      setErr(e1.message);
      return;
    }
    const list = w ?? [];
    const ids = [...new Set(list.map((r) => r.affiliate_id))];
    let slugBy = new Map<string, string>();
    if (ids.length > 0) {
      const { data: affs } = await supabase.from("affiliates").select("id, slug").in("id", ids);
      slugBy = new Map((affs ?? []).map((a) => [a.id, a.slug as string]));
    }
    setErr(null);
    setRows(
      list.map((r) => ({
        ...r,
        slug: slugBy.get(r.affiliate_id) ?? "—",
      })) as typeof rows
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (id: string, status: string) => {
    const note = window.prompt("Catatan admin (opsional)") ?? "";
    const res = await edgeFetch("admin-withdrawal", session, { id, status, admin_note: note || undefined });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) setErr(j.error ?? "Gagal");
    else void load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-white">Penarikan affiliate</h2>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm text-left">
          <thead className="text-zinc-500 border-b border-zinc-800">
            <tr>
              <th className="p-2">Affiliate</th>
              <th className="p-2">Jumlah</th>
              <th className="p-2">Status</th>
              <th className="p-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-zinc-800/80">
                <td className="p-2 font-mono text-xs">{r.slug}</td>
                <td className="p-2">Rp {(Number(r.amount_idr) || 0).toLocaleString("id-ID")}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2 flex flex-wrap gap-1">
                  {r.status === "pending" && (
                    <>
                      <button type="button" className="text-xs text-amber-500 underline" onClick={() => void patch(r.id, "approved")}>
                        Setujui
                      </button>
                      <button type="button" className="text-xs text-red-400 underline" onClick={() => void patch(r.id, "rejected")}>
                        Tolak
                      </button>
                      <button type="button" className="text-xs text-emerald-400 underline" onClick={() => void patch(r.id, "completed")}>
                        Selesai
                      </button>
                    </>
                  )}
                  {r.status === "approved" && (
                    <>
                      <button type="button" className="text-xs text-emerald-400 underline" onClick={() => void patch(r.id, "completed")}>
                        Selesai
                      </button>
                      <button type="button" className="text-xs text-red-400 underline" onClick={() => void patch(r.id, "rejected")}>
                        Tolak
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TransactionsAdmin() {
  const [rows, setRows] = useState<
    { id: string; order_id: string; email: string; gross_amount_idr: number; status: string; affiliate_id: string | null; created_at: string }[]
  >([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("payment_transactions")
        .select("id, order_id, email, gross_amount_idr, status, affiliate_id, created_at")
        .order("created_at", { ascending: false })
        .limit(150);
      if (error) setErr(error.message);
      else setRows((data ?? []) as typeof rows);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-white">Transaksi pembayaran</h2>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 text-sm">
        <table className="w-full text-left">
          <thead className="text-zinc-500 border-b border-zinc-800">
            <tr>
              <th className="p-2">Order</th>
              <th className="p-2">Email</th>
              <th className="p-2">Gross</th>
              <th className="p-2">Status</th>
              <th className="p-2">Affiliate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-zinc-800/80">
                <td className="p-2 font-mono text-xs">{r.order_id}</td>
                <td className="p-2 text-xs">{r.email}</td>
                <td className="p-2">{r.gross_amount_idr}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2 font-mono text-xs">{r.affiliate_id?.slice(0, 8) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AffiliatesAdmin() {
  const [rows, setRows] = useState<
    { id: string; slug: string; status: string; total_sales: number; balance_available_idr: number; balance_pending_idr: number }[]
  >([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("affiliates")
      .select("id, slug, status, total_sales, balance_available_idr, balance_pending_idr")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) setErr(error.message);
    else {
      setErr(null);
      setRows((data ?? []) as typeof rows);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("affiliates").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) setErr(error.message);
    else void load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-white">Affiliate</h2>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 text-sm">
        <table className="w-full text-left">
          <thead className="text-zinc-500 border-b border-zinc-800">
            <tr>
              <th className="p-2">Slug</th>
              <th className="p-2">Status</th>
              <th className="p-2">Sales</th>
              <th className="p-2">Saldo</th>
              <th className="p-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-zinc-800/80">
                <td className="p-2 font-mono text-xs">{r.slug}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">{r.total_sales}</td>
                <td className="p-2 text-xs">
                  {Number(r.balance_available_idr).toLocaleString("id-ID")} / {Number(r.balance_pending_idr).toLocaleString("id-ID")}
                </td>
                <td className="p-2 flex flex-wrap gap-1">
                  {r.status === "pending" && (
                    <>
                      <button type="button" className="text-xs text-emerald-400 underline" onClick={() => void setStatus(r.id, "active")}>
                        Aktifkan
                      </button>
                      <button type="button" className="text-xs text-red-400 underline" onClick={() => void setStatus(r.id, "rejected")}>
                        Tolak
                      </button>
                    </>
                  )}
                  {r.status === "active" && (
                    <button type="button" className="text-xs text-amber-500 underline" onClick={() => void setStatus(r.id, "suspended")}>
                      Suspend
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PlatformSettingsAdmin() {
  const [rows, setRows] = useState<{ key: string; value: unknown }[]>([]);
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("platform_settings").select("key, value").order("key");
    if (error) setErr(error.message);
    else {
      setRows((data ?? []) as typeof rows);
      const e: Record<string, string> = {};
      for (const r of data ?? []) e[r.key] = JSON.stringify(r.value);
      setEdit(e);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (key: string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(edit[key] ?? "null");
    } catch {
      setErr("JSON tidak valid");
      return;
    }
    const { error } = await supabase.from("platform_settings").upsert({ key, value: parsed as object, updated_at: new Date().toISOString() });
    if (error) setErr(error.message);
    else void load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-white">Platform settings</h2>
      <p className="text-xs text-zinc-500">Nilai disimpan sebagai JSON (boolean, number, string).</p>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.key} className="rounded-xl border border-zinc-800 p-3">
            <div className="text-xs font-mono text-amber-500 mb-1">{r.key}</div>
            <textarea
              className="w-full min-h-[52px] rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs font-mono"
              value={edit[r.key] ?? ""}
              onChange={(e) => setEdit((x) => ({ ...x, [r.key]: e.target.value }))}
            />
            <button type="button" className="mt-2 text-xs text-amber-500 underline" onClick={() => void save(r.key)}>
              Simpan key ini
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AnalyticsAdmin() {
  const [counts, setCounts] = useState<{ contacts: number; affiliates: number; commissions: number; checkoutTx: number } | null>(null);

  useEffect(() => {
    void (async () => {
      const [c, a, co, pt] = await Promise.all([
        supabase.from("crm_contacts").select("id", { count: "exact", head: true }),
        supabase.from("affiliates").select("id", { count: "exact", head: true }),
        supabase.from("commissions").select("id", { count: "exact", head: true }),
        supabase.from("payment_transactions").select("id", { count: "exact", head: true }),
      ]);
      setCounts({
        contacts: c.count ?? 0,
        affiliates: a.count ?? 0,
        commissions: co.count ?? 0,
        checkoutTx: pt.count ?? 0,
      });
    })();
  }, []);

  if (!counts) return <p className="text-zinc-500 text-sm">Memuat…</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-white">Ringkasan</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(
          [
            ["Kontak CRM", counts.contacts],
            ["Affiliate", counts.affiliates],
            ["Komisi (baris)", counts.commissions],
            ["Transaksi checkout", counts.checkoutTx],
          ] as const
        ).map(([l, n]) => (
          <div key={l} className="rounded-xl border border-zinc-800 p-4">
            <div className="text-xs text-zinc-500">{l}</div>
            <div className="text-2xl font-bold text-white mt-1">{n}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EventsAdmin() {
  const [rows, setRows] = useState<{ id: string; title: string; status: string; starts_at: string; ends_at: string }[]>([]);
  const [title, setTitle] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("promo_events").select("id, title, status, starts_at, ends_at").order("created_at", { ascending: false });
    if (error) setErr(error.message);
    else setRows((data ?? []) as typeof rows);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!title.trim() || !starts || !ends) return;
    const { error } = await supabase.from("promo_events").insert({
      title: title.trim(),
      starts_at: new Date(starts).toISOString(),
      ends_at: new Date(ends).toISOString(),
      status: "draft",
    });
    if (error) setErr(error.message);
    else {
      setTitle("");
      void load();
    }
  };

  const setStatus = async (id: string, status: string) => {
    await supabase.from("promo_events").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    void load();
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-white">Acara promo</h2>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <div className="flex flex-wrap gap-2 items-end rounded-xl border border-zinc-800 p-4">
        <label className="text-xs text-zinc-500">
          Judul
          <input className="block mt-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="text-xs text-zinc-500">
          Mulai
          <input type="datetime-local" className="block mt-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm" value={starts} onChange={(e) => setStarts(e.target.value)} />
        </label>
        <label className="text-xs text-zinc-500">
          Selesai
          <input type="datetime-local" className="block mt-1 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm" value={ends} onChange={(e) => setEnds(e.target.value)} />
        </label>
        <button type="button" className="rounded-lg bg-amber-600 px-3 py-2 text-sm text-white" onClick={() => void create()}>
          Buat draft
        </button>
      </div>
      <ul className="space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 border border-zinc-800 rounded-lg p-3">
            <span className="font-medium">{r.title}</span>
            <span className="text-zinc-500 text-xs">{r.status}</span>
            <button type="button" className="text-xs text-emerald-400 underline" onClick={() => void setStatus(r.id, "active")}>
              Aktifkan
            </button>
            <button type="button" className="text-xs text-zinc-500 underline" onClick={() => void setStatus(r.id, "ended")}>
              Akhiri
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AnnouncementsAdmin() {
  const [rows, setRows] = useState<{ id: string; title: string; type: string; pinned: boolean }[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("announcements").select("id, title, type, pinned").order("created_at", { ascending: false });
    if (error) setErr(error.message);
    else setRows((data ?? []) as typeof rows);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!title.trim() || !content.trim()) return;
    const { error } = await supabase.from("announcements").insert({
      title: title.trim(),
      content: content.trim(),
      type: "info",
      audience: "all",
      pinned: false,
    });
    if (error) setErr(error.message);
    else {
      setTitle("");
      setContent("");
      void load();
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-white">Pengumuman</h2>
      {err && <p className="text-sm text-red-400">{err}</p>}
      <div className="space-y-2 rounded-xl border border-zinc-800 p-4">
        <input className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm" placeholder="Judul" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="w-full min-h-[80px] rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm" placeholder="Isi" value={content} onChange={(e) => setContent(e.target.value)} />
        <button type="button" className="rounded-lg bg-amber-600 px-3 py-2 text-sm text-white" onClick={() => void create()}>
          Publikasikan
        </button>
      </div>
      <ul className="text-sm space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="border border-zinc-800 rounded-lg p-2">
            {r.pinned && <span className="text-xs text-amber-500">pin </span>}
            {r.title} <span className="text-zinc-500">({r.type})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
