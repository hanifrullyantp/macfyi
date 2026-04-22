import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { DataTable } from "../components/ui/DataTable";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Drawer } from "../components/ui/Drawer";
import { Card } from "../components/ui/Card";
import { CopyButton } from "../components/shared/CopyButton";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { EmptyState } from "../components/shared/EmptyState";
import { supabase } from "../supabase";
import { formatIdr, licenseHashDisplay, maskFingerprint } from "../lib/formatters";
import * as Tooltip from "@radix-ui/react-tooltip";

type LicenseRow = {
  id: string;
  email: string;
  status: string;
  license_key_hash: string;
  created_at: string;
  revoked_at: string | null;
  price_paid_idr: number | null;
};

const PAGE_SIZE = 25;

export default function LicensesPage() {
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const qEmail = sp.get("q") ?? "";
  const [filter, setFilter] = useState(qEmail);

  useEffect(() => {
    setFilter(qEmail);
    setPage(0);
  }, [qEmail]);
  const [page, setPage] = useState(0);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const activeFilter = filter.trim();

  const listQuery = useQuery({
    queryKey: ["licenses", "list", activeFilter, page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let qb = supabase
        .from("licenses")
        .select("id,email,status,license_key_hash,created_at,revoked_at,price_paid_idr", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (activeFilter) qb = qb.ilike("email", `%${activeFilter}%`);
      const { data, error, count } = await qb;
      if (error) throw error;
      return { rows: (data ?? []) as LicenseRow[], total: count ?? 0 };
    },
  });

  const detailQuery = useQuery({
    queryKey: ["licenses", "detail", drawerId],
    enabled: Boolean(drawerId),
    queryFn: async () => {
      const id = drawerId!;
      const { data: license, error: e1 } = await supabase.from("licenses").select("*").eq("id", id).maybeSingle();
      if (e1) throw e1;
      if (!license) throw new Error("License not found");
      const email = (license as { email: string }).email;
      const [act, tx] = await Promise.all([
        supabase.from("activations").select("*").eq("license_id", id).maybeSingle(),
        supabase.from("payment_transactions").select("*").eq("email", email).order("created_at", { ascending: false }).limit(20),
      ]);
      if (act.error) throw act.error;
      if (tx.error) throw tx.error;
      const txs = (tx.data ?? []) as Record<string, unknown>[];
      const orderIds = [...new Set(txs.map((t) => String(t.order_id ?? "").trim()).filter(Boolean))];
      let paymentEvents: Record<string, unknown>[] = [];
      if (orderIds.length) {
        const evRes = await supabase.from("payment_events").select("id, provider, payload, processed, created_at").order("created_at", { ascending: false }).limit(500);
        if (!evRes.error && evRes.data) {
          paymentEvents = (evRes.data as Record<string, unknown>[]).filter((e) =>
            orderIds.some((oid) => {
              const p = e.payload;
              if (p && typeof p === "object" && "order_id" in p) return String((p as { order_id?: string }).order_id) === oid;
              try {
                return JSON.stringify(p).includes(oid);
              } catch {
                return false;
              }
            }),
          );
        }
      }
      return { license, activation: act.data, txs, paymentEvents };
    },
  });

  const revokeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("licenses")
        .update({ status: "revoked", revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("License revoked");
      setRevokeId(null);
      setDrawerId(null);
      await qc.invalidateQueries({ queryKey: ["licenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const applyFilter = () => {
    setPage(0);
    const next = new URLSearchParams(sp);
    if (activeFilter) next.set("q", activeFilter);
    else next.delete("q");
    setSp(next);
  };

  const exportCsv = useCallback(async () => {
    const { data, error } = await supabase
      .from("licenses")
      .select("id,email,status,license_key_hash,created_at,revoked_at,price_paid_idr")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) {
      toast.error(error.message);
      return;
    }
    const rows = (data ?? []) as LicenseRow[];
    const header = ["id", "email", "status", "license_key_hash_prefix", "created_at", "revoked_at", "price_paid_idr"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [r.id, JSON.stringify(r.email), r.status, licenseHashDisplay(r.license_key_hash, 16), r.created_at, r.revoked_at ?? "", r.price_paid_idr ?? ""].join(
          ",",
        ),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `licenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.message("Exported (max 2000 rows)");
  }, []);

  const columns = useMemo<ColumnDef<LicenseRow>[]>(
    () => [
      { accessorKey: "email", header: "Email", cell: (c) => <span className="font-mono text-[11px]">{c.getValue() as string}</span> },
      {
        accessorKey: "status",
        header: "Status",
        cell: (c) => <StatusBadge status={String(c.getValue())} />,
      },
      {
        accessorKey: "license_key_hash",
        header: "Key (hash)",
        cell: (c) => {
          const h = c.getValue() as string;
          const show = licenseHashDisplay(h, 14);
          return (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <span className="cursor-help font-mono text-[11px] text-zinc-400">{show}</span>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="max-w-xs rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-[11px] text-zinc-300 shadow-lg"
                  sideOffset={6}
                >
                  Plaintext license key is only sent to the buyer by email. Admin stores hash only.
                  <Tooltip.Arrow className="fill-zinc-900" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          );
        },
      },
      { accessorKey: "price_paid_idr", header: "Paid", cell: (c) => formatIdr(c.getValue() as number | null) },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <CopyButton text={row.original.license_key_hash} />
            <Button variant="ghost" size="sm" onClick={() => setDrawerId(row.original.id)}>
              Detail
            </Button>
            {row.original.status === "active" ? (
              <Button variant="ghost" size="sm" className="text-red-400" onClick={() => setRevokeId(row.original.id)}>
                Revoke
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [],
  );

  const rows = listQuery.data?.rows ?? [];
  const total = listQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Lisensi</h1>
          <p className="text-white/40 font-medium">
            Kunci lisensi disimpan sebagai <span className="text-white/70">hash</span>; plaintext hanya dikirim via email ke pembeli.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => void exportCsv()}>
            Ekspor CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/5 bg-[#16161C] p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/20">Rows (page)</div>
          <div className="mt-2 text-3xl font-black text-white">{rows.length}</div>
        </div>
        <div className="rounded-3xl border border-white/5 bg-[#16161C] p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/20">Total</div>
          <div className="mt-2 text-3xl font-black text-white">{total}</div>
        </div>
        <div className="rounded-3xl border border-white/5 bg-[#16161C] p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/20">Halaman</div>
          <div className="mt-2 text-3xl font-black text-white">
            {page + 1} <span className="text-white/20">/</span> {totalPages}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/5 bg-[#16161C] p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
          <label className="md:col-span-7 text-xs font-black uppercase tracking-widest text-white/20">
            Cari email
          <input
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-medium text-white placeholder:text-white/20 outline-none focus:border-red-500/50"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilter()}
            placeholder="contoh: user@domain.com"
          />
          </label>
          <div className="md:col-span-5 flex flex-wrap gap-3">
            <Button variant="secondary" size="sm" onClick={() => applyFilter()}>
              Terapkan
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void qc.invalidateQueries({ queryKey: ["licenses"] })}>
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {listQuery.isError ? <p className="text-sm text-red-400">{(listQuery.error as Error).message}</p> : null}

      {listQuery.isLoading ? (
        <div className="space-y-2 rounded-3xl border border-white/10 bg-[#121217] p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : null}

      {!listQuery.isLoading ? (
        <div className="rounded-3xl border border-white/5 bg-[#16161C] p-2">
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(r) => r.id}
            empty={<EmptyState title="Tidak ada lisensi" description="Coba kosongkan filter email." />}
          />
        </div>
      ) : null}

      <div className="flex items-center justify-between text-xs text-white/35">
        <span>Page {page + 1} / {totalPages}</span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Prev
          </Button>
          <Button variant="ghost" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>

      <Drawer open={Boolean(drawerId)} onOpenChange={(o) => !o && setDrawerId(null)} title="License detail">
        {detailQuery.isLoading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : detailQuery.data?.license ? (
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-xs text-zinc-500">Email</div>
              <div className="font-mono text-xs">{(detailQuery.data.license as { email: string }).email}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">Hash</div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="break-all font-mono text-[11px] text-zinc-400">
                  {(detailQuery.data.license as { license_key_hash: string }).license_key_hash}
                </span>
                <CopyButton text={(detailQuery.data.license as { license_key_hash: string }).license_key_hash} title="Copy" />
              </div>
            </div>
            {detailQuery.data.activation ? (
              <div>
                <div className="text-xs text-zinc-500">Activation fingerprint</div>
                <div className="font-mono text-[11px] text-zinc-300">
                  {maskFingerprint((detailQuery.data.activation as { device_fingerprint: string }).device_fingerprint)}
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">No activation row.</p>
            )}
            <div>
              <div className="text-xs text-zinc-500 mb-1">Payment rows (same email)</div>
              <ul className="space-y-1 text-xs">
                {(detailQuery.data.txs as Record<string, unknown>[]).map((t) => (
                  <li key={String(t.id)} className="rounded border border-zinc-800 px-2 py-1 font-mono text-[10px] text-zinc-400">
                    {String(t.order_id)} · {String(t.status)} · {formatIdr(Number(t.gross_amount_idr))}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs text-zinc-500 mb-1">payment_events (same order_ids)</div>
              {(detailQuery.data.paymentEvents as Record<string, unknown>[] | undefined)?.length ? (
                <ul className="max-h-48 space-y-1 overflow-auto text-[10px]">
                  {(detailQuery.data.paymentEvents as Record<string, unknown>[]).map((e) => (
                    <li key={String(e.id)} className="rounded border border-zinc-800 px-2 py-1 font-mono text-zinc-400">
                      {String(e.created_at ?? "").slice(0, 19)} · {String(e.provider)} · {String(e.id).slice(0, 24)}…
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">No matching events (or table unavailable).</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-red-400">Not found</p>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(revokeId)}
        onOpenChange={(o) => !o && setRevokeId(null)}
        title="Revoke license?"
        description="Buyer keeps email copy; server will reject activations for this row."
        danger
        confirmLabel="Revoke"
        onConfirm={async () => {
          if (revokeId) await revokeMut.mutateAsync(revokeId);
        }}
      />
    </div>
  );
}
