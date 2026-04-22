import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "../components/ui/DataTable";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Drawer } from "../components/ui/Drawer";
import { EmptyState } from "../components/shared/EmptyState";
import { supabase } from "../supabase";
import { formatIdr } from "../lib/formatters";

type Tx = {
  id: string;
  order_id: string;
  email: string;
  gross_amount_idr: number;
  status: string;
  affiliate_id: string | null;
  created_at: string;
  coupon_code?: string | null;
  discount_idr?: number | null;
};

export default function TransactionsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [sel, setSel] = useState<Tx | null>(null);

  const listQuery = useQuery({
    queryKey: ["transactions", "list", status, since, until],
    queryFn: async () => {
      let qb = supabase
        .from("payment_transactions")
        .select("id, order_id, email, gross_amount_idr, status, affiliate_id, created_at, coupon_code, discount_idr")
        .order("created_at", { ascending: false })
        .limit(300);
      if (status) qb = qb.eq("status", status);
      if (since) qb = qb.gte("created_at", new Date(since).toISOString());
      if (until) qb = qb.lte("created_at", new Date(until).toISOString());
      const { data, error } = await qb;
      if (error) throw error;
      return (data ?? []) as Tx[];
    },
  });

  const eventsQuery = useQuery({
    queryKey: ["transactions", "events", sel?.order_id],
    enabled: Boolean(sel?.order_id),
    queryFn: async () => {
      const oid = sel!.order_id;
      const res = await supabase.from("payment_events").select("*").order("created_at", { ascending: false }).limit(400);
      if (res.error) {
        return [] as Record<string, unknown>[];
      }
      const rows = (res.data ?? []) as Record<string, unknown>[];
      return rows.filter((e) => {
        const p = e.payload;
        if (p && typeof p === "object" && "order_id" in p) return String((p as { order_id?: string }).order_id) === oid;
        try {
          return JSON.stringify(p).includes(oid);
        } catch {
          return false;
        }
      });
    },
  });

  const summary = useMemo(() => {
    const rows = listQuery.data ?? [];
    const paid = rows.filter((r) => r.status === "paid" || r.status === "settlement");
    const sum = paid.reduce((a, r) => a + (Number(r.gross_amount_idr) || 0), 0);
    return { count: rows.length, paidCount: paid.length, paidSum: sum };
  }, [listQuery.data]);

  const exportJson = () => {
    const rows = listQuery.data ?? [];
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), rows }, null, 2)], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.message("Exported current list as JSON");
  };

  const exportDrawerJson = () => {
    if (!sel) return;
    const snap = {
      exportedAt: new Date().toISOString(),
      transaction: sel,
      payment_events: eventsQuery.data ?? [],
    };
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `transaction-${sel.order_id.slice(0, 24)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.message("Exported drawer snapshot");
  };

  const exportCsv = () => {
    const rows = listQuery.data ?? [];
    const h = ["id", "order_id", "email", "gross_amount_idr", "status", "affiliate_id", "created_at", "coupon_code", "discount_idr"];
    const lines = [h.join(",")];
    for (const r of rows) {
      lines.push(
        [r.id, r.order_id, JSON.stringify(r.email), r.gross_amount_idr, r.status, r.affiliate_id ?? "", r.created_at, r.coupon_code ?? "", r.discount_idr ?? ""].join(
          ",",
        ),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.message("Exported current list");
  };

  const columns = useMemo<ColumnDef<Tx>[]>(
    () => [
      {
        accessorKey: "order_id",
        header: "Order",
        cell: (c) => (
          <button type="button" className="text-left font-mono text-[11px] text-violet-300 hover:underline" onClick={() => setSel(c.row.original)}>
            {(c.getValue() as string).slice(0, 18)}…
          </button>
        ),
      },
      { accessorKey: "email", header: "Email", cell: (c) => <span className="text-[11px]">{c.getValue() as string}</span> },
      { accessorKey: "gross_amount_idr", header: "Gross", cell: (c) => formatIdr(c.getValue() as number) },
      {
        accessorKey: "status",
        header: "Status",
        cell: (c) => <StatusBadge status={String(c.getValue())} />,
      },
      { accessorKey: "created_at", header: "Created", cell: (c) => <span className="text-[11px] text-zinc-500">{(c.getValue() as string).slice(0, 19)}</span> },
    ],
    [],
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Transaksi</h1>
          <p className="text-white/40 font-medium">Riwayat pembayaran (Midtrans / Lynk) dan status pemrosesan.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => exportCsv()}>
            Export CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={() => exportJson()}>
            Export JSON
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/5 bg-[#16161C] p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/20">Rows (cap 300)</div>
          <div className="mt-2 text-3xl font-black text-white">{summary.count}</div>
        </div>
        <div className="rounded-3xl border border-white/5 bg-[#16161C] p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/20">Paid / settlement</div>
          <div className="mt-2 text-3xl font-black text-white">{summary.paidCount}</div>
        </div>
        <div className="rounded-3xl border border-white/5 bg-[#16161C] p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/20">Paid gross sum</div>
          <div className="mt-2 text-3xl font-black text-white">{formatIdr(summary.paidSum)}</div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/5 bg-[#16161C] p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
          <label className="md:col-span-4 text-xs font-black uppercase tracking-widest text-white/20">
            Status
            <select
              className="mt-2 block w-full appearance-none rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-medium text-white outline-none focus:border-red-500/50"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Any</option>
              <option value="pending">pending</option>
              <option value="paid">paid</option>
              <option value="settlement">settlement</option>
              <option value="expire">expire</option>
              <option value="cancel">cancel</option>
            </select>
          </label>
          <label className="md:col-span-3 text-xs font-black uppercase tracking-widest text-white/20">
            Since
            <input
              type="date"
              className="mt-2 block w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-medium text-white outline-none focus:border-red-500/50"
              value={since}
              onChange={(e) => setSince(e.target.value)}
            />
          </label>
          <label className="md:col-span-3 text-xs font-black uppercase tracking-widest text-white/20">
            Until
            <input
              type="date"
              className="mt-2 block w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-medium text-white outline-none focus:border-red-500/50"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
            />
          </label>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => void qc.invalidateQueries({ queryKey: ["transactions"] })}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {listQuery.isError ? <p className="text-sm text-red-400">{(listQuery.error as Error).message}</p> : null}

      {listQuery.isLoading ? (
        <div className="space-y-2 rounded-3xl border border-white/10 bg-[#121217] p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/5 bg-[#16161C] p-2">
          <DataTable data={listQuery.data ?? []} columns={columns} getRowId={(r) => r.id} empty={<EmptyState title="No rows" />} />
        </div>
      )}

      <Drawer open={Boolean(sel)} onOpenChange={(o) => !o && setSel(null)} title="Transaction detail">
        {sel ? (
          <div className="space-y-3 text-sm">
            <Button variant="secondary" size="sm" type="button" onClick={() => exportDrawerJson()}>
              Export JSON (row + events)
            </Button>
            <pre className="overflow-auto rounded-lg bg-zinc-950 p-3 text-[11px] text-zinc-400">{JSON.stringify(sel, null, 2)}</pre>
            <div className="text-xs font-medium text-zinc-300">payment_events (best-effort)</div>
            {eventsQuery.isLoading ? (
              <p className="text-xs text-zinc-500">Loading…</p>
            ) : eventsQuery.data?.length ? (
              <ul className="space-y-2 text-[11px]">
                {eventsQuery.data.map((e) => (
                  <li key={String(e.id)} className="rounded border border-zinc-800 p-2 font-mono text-zinc-400">
                    {JSON.stringify(e)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-zinc-500">No events rows (table missing or no matches).</p>
            )}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
