import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "../components/ui/DataTable";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
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
      { accessorKey: "status", header: "Status" },
      { accessorKey: "created_at", header: "Created", cell: (c) => <span className="text-[11px] text-zinc-500">{(c.getValue() as string).slice(0, 19)}</span> },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Transactions</h1>
        <p className="mt-1 text-sm text-zinc-500">Midtrans / checkout rows. Drawer tries payment_events by order_id when the table exists.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs text-zinc-500">Rows (cap 300)</div>
          <div className="text-xl font-semibold text-zinc-100">{summary.count}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-zinc-500">Paid / settlement</div>
          <div className="text-xl font-semibold text-zinc-100">{summary.paidCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-zinc-500">Paid gross sum</div>
          <div className="text-xl font-semibold text-zinc-100">{formatIdr(summary.paidSum)}</div>
        </Card>
      </div>

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <label className="text-xs text-zinc-500">
          Status
          <select
            className="mt-1 block rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
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
        <label className="text-xs text-zinc-500">
          Since
          <input type="date" className="mt-1 block rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm" value={since} onChange={(e) => setSince(e.target.value)} />
        </label>
        <label className="text-xs text-zinc-500">
          Until
          <input type="date" className="mt-1 block rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm" value={until} onChange={(e) => setUntil(e.target.value)} />
        </label>
        <Button variant="secondary" size="sm" onClick={() => void qc.invalidateQueries({ queryKey: ["transactions"] })}>
          Apply / refresh
        </Button>
        <Button variant="ghost" size="sm" onClick={() => exportCsv()}>
          Export CSV
        </Button>
      </Card>

      {listQuery.isError ? <p className="text-sm text-red-400">{(listQuery.error as Error).message}</p> : null}

      <DataTable data={listQuery.data ?? []} columns={columns} getRowId={(r) => r.id} empty={<EmptyState title="No rows" />} />

      <Drawer open={Boolean(sel)} onOpenChange={(o) => !o && setSel(null)} title="Transaction detail">
        {sel ? (
          <div className="space-y-3 text-sm">
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
