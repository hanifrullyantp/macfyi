import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { StatusBadge } from "./components/ui/StatusBadge";
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
      <h2 className="admin-section-title text-base">Penarikan affiliate</h2>
      {err && <p className="text-sm text-red-400/90">{err}</p>}
      <div className="admin-table-shell text-sm">
        <table className="w-full text-left text-white/80">
          <thead className="admin-table-head">
            <tr>
              <th className="p-2">Affiliate</th>
              <th className="p-2">Jumlah</th>
              <th className="p-2">Status</th>
              <th className="p-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="admin-table-row">
                <td className="p-2 font-mono text-xs">{r.slug}</td>
                <td className="p-2">Rp {(Number(r.amount_idr) || 0).toLocaleString("id-ID")}</td>
                <td className="p-2">
                  <StatusBadge status={r.status} />
                </td>
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
      <h2 className="admin-section-title text-base">Affiliate</h2>
      {err && <p className="text-sm text-red-400/90">{err}</p>}
      <div className="admin-table-shell text-sm">
        <table className="w-full text-left text-white/80">
          <thead className="admin-table-head">
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
              <tr key={r.id} className="admin-table-row">
                <td className="p-2 font-mono text-xs">{r.slug}</td>
                <td className="p-2">
                  <StatusBadge status={r.status} />
                </td>
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
      <h2 className="admin-section-title text-base">Acara promo</h2>
      {err && <p className="text-sm text-red-400/90">{err}</p>}
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <label className="block admin-label-text">
          Judul
          <input className="mt-1 admin-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block admin-label-text">
          Mulai
          <input type="datetime-local" className="mt-1 admin-input" value={starts} onChange={(e) => setStarts(e.target.value)} />
        </label>
        <label className="block admin-label-text">
          Selesai
          <input type="datetime-local" className="mt-1 admin-input" value={ends} onChange={(e) => setEnds(e.target.value)} />
        </label>
        <button
          type="button"
          className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 hover:bg-red-500"
          onClick={() => void create()}
        >
          Buat draft
        </button>
      </div>
      <ul className="space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-white/85">
            <span className="font-medium">{r.title}</span>
            <span className="text-xs text-white/40">{r.status}</span>
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
      <h2 className="admin-section-title text-base">Pengumuman</h2>
      {err && <p className="text-sm text-red-400/90">{err}</p>}
      <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <input className="admin-input" placeholder="Judul" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="admin-textarea min-h-[80px] w-full" placeholder="Isi" value={content} onChange={(e) => setContent(e.target.value)} />
        <button
          type="button"
          className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 hover:bg-red-500"
          onClick={() => void create()}
        >
          Publikasikan
        </button>
      </div>
      <ul className="space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-2 text-white/80">
            {r.pinned && <span className="text-xs text-red-400/90">pin </span>}
            {r.title} <span className="text-white/40">({r.type})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
