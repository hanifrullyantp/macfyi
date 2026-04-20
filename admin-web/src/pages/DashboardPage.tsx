import { useQueries, useQuery } from "@tanstack/react-query";
import { subDays, format } from "date-fns";
import { Link } from "react-router-dom";
import { Activity, ExternalLink, RefreshCw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from "recharts";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { supabase } from "../supabase";
import { fetchPublicConfigJson, healthCheckEdgeFunction } from "../lib/publicConfigClient";
import { formatIdr } from "../lib/formatters";
import { useAdminSession } from "../hooks/useAdminSession";
import { queryClient } from "../lib/queryClient";

type TxRow = { created_at: string; gross_amount_idr: number | null; status: string };

function bucketRevenueByDay(rows: TxRow[], since: Date) {
  const map = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = subDays(new Date(), 29 - i);
    map.set(format(d, "yyyy-MM-dd"), 0);
  }
  for (const r of rows) {
    if (r.status !== "paid" && r.status !== "settlement") continue;
    const day = r.created_at?.slice(0, 10);
    if (!day) continue;
    const t = new Date(r.created_at);
    if (t < since) continue;
    map.set(day, (map.get(day) ?? 0) + (Number(r.gross_amount_idr) || 0));
  }
  return [...map.entries()].map(([date, total_idr]) => ({ date: date.slice(5), total_idr }));
}

function bucketLicensesByDay(rows: { created_at: string }[], since: Date) {
  const map = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const d = subDays(new Date(), 13 - i);
    map.set(format(d, "yyyy-MM-dd"), 0);
  }
  for (const r of rows) {
    const t = new Date(r.created_at);
    if (t < since) continue;
    const day = r.created_at.slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + 1);
  }
  return [...map.entries()].map(([date, count]) => ({ date: date.slice(5), count }));
}

export default function DashboardPage() {
  const session = useAdminSession();
  const [healthBusy, setHealthBusy] = useState(false);

  const since30 = subDays(new Date(), 30);
  const since14 = subDays(new Date(), 14);

  const results = useQueries({
    queries: [
      {
        queryKey: ["dash", "tx-30d"],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("payment_transactions")
            .select("created_at, gross_amount_idr, status")
            .gte("created_at", since30.toISOString())
            .order("created_at", { ascending: true });
          if (error) throw error;
          return (data ?? []) as TxRow[];
        },
      },
      {
        queryKey: ["dash", "licenses-14d"],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("licenses")
            .select("created_at")
            .gte("created_at", since14.toISOString())
            .order("created_at", { ascending: true });
          if (error) throw error;
          return (data ?? []) as { created_at: string }[];
        },
      },
      {
        queryKey: ["dash", "withdrawals-pending"],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("withdrawal_requests")
            .select("id, amount_idr, status")
            .eq("status", "pending");
          if (error) throw error;
          const rows = data ?? [];
          const sum = rows.reduce((a, r) => a + (Number(r.amount_idr) || 0), 0);
          return { count: rows.length, sum_idr: sum };
        },
      },
      {
        queryKey: ["dash", "crm-contacts"],
        queryFn: async () => {
          const { count, error } = await supabase.from("crm_contacts").select("id", { count: "exact", head: true });
          if (error) throw error;
          return count ?? 0;
        },
      },
      {
        queryKey: ["dash", "recent-tx"],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("payment_transactions")
            .select("id, order_id, email, gross_amount_idr, status, created_at")
            .order("created_at", { ascending: false })
            .limit(5);
          if (error) throw error;
          return data ?? [];
        },
      },
      {
        queryKey: ["dash", "recent-act"],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("activations")
            .select("id, device_fingerprint, last_seen_at, licenses(email)")
            .order("last_seen_at", { ascending: false })
            .limit(5);
          if (error) throw error;
          return data ?? [];
        },
      },
    ],
  });

  const publicCfg = useQuery({
    queryKey: ["dash", "public-config-json"],
    queryFn: fetchPublicConfigJson,
    retry: 0,
  });

  const [tx30, lic14, pendW, crmC, recentTx, recentAct] = results;
  const loading = results.some((r) => r.isLoading);
  const err = results.find((r) => r.error)?.error as Error | undefined;

  const revData = tx30.data ? bucketRevenueByDay(tx30.data, since30) : [];
  const licChart = lic14.data ? bucketLicensesByDay(lic14.data, since14) : [];

  const paidSum =
    tx30.data?.reduce((a, r) => a + (r.status === "paid" || r.status === "settlement" ? Number(r.gross_amount_idr) || 0 : 0), 0) ?? 0;

  const runHealth = async () => {
    setHealthBusy(true);
    try {
      const r = await healthCheckEdgeFunction("public-config", session.access_token);
      if (r.ok) toast.success(`public-config OK (${r.status})`);
      else toast.error(`public-config ${r.status}`, { description: r.body });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setHealthBusy(false);
    }
  };

  const promoPreview = publicCfg.data && typeof publicCfg.data === "object" ? (publicCfg.data as Record<string, unknown>) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">Revenue proxy (paid/settlement), licenses, withdrawals, CRM funnel proxy.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void queryClient.invalidateQueries({ queryKey: ["dash"] })}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {err ? <p className="text-sm text-red-400">{err.message}</p> : null}
      {loading ? <p className="text-sm text-zinc-500">Loading metrics…</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Paid (30d window)</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-zinc-100">{formatIdr(paidSum)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Licenses (14d)</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-zinc-100">{lic14.data?.length ?? 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Withdrawals pending</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-zinc-100">{pendW.data?.count ?? "—"}</div>
          <div className="text-xs text-zinc-500">{formatIdr(pendW.data?.sum_idr ?? null)} total IDR</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">CRM contacts</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-zinc-100">{crmC.data ?? "—"}</div>
          <div className="text-[11px] text-zinc-500">Demo→paid funnel not stored; proxy = contacts vs paid tx.</div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="mb-3 text-sm font-medium text-zinc-200">Revenue (paid/settlement) — 30d</div>
          <div className="h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 10 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 10 }} width={56} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                  labelStyle={{ color: "#e4e4e7" }}
                />
                <Line type="monotone" dataKey="total_idr" name="IDR" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-sm font-medium text-zinc-200">Promo (public-config)</div>
            <Link to="/promo-pricing" className="text-xs text-violet-400 hover:underline">
              Edit
            </Link>
          </div>
          {publicCfg.isError ? (
            <p className="text-xs text-amber-400">Could not load public-config (Edge may be down or CORS).</p>
          ) : (
            <pre className="max-h-48 overflow-auto rounded-lg bg-zinc-950 p-2 text-[10px] leading-relaxed text-zinc-400">
              {JSON.stringify(
                promoPreview
                  ? {
                      config_version: promoPreview.config_version,
                      pricing: promoPreview.pricing,
                      promo: promoPreview.promo,
                      checkout: promoPreview.checkout,
                    }
                  : publicCfg.data,
                null,
                2
              )}
            </pre>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 text-sm font-medium text-zinc-200">New licenses per day (14d)</div>
        <div className="h-48 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={licChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#71717a", fontSize: 10 }} width={32} />
              <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }} />
              <Bar dataKey="count" name="Licenses" fill="#a78bfa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-2 text-sm font-medium text-zinc-200">Recent transactions</div>
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="text-zinc-500">
                <tr>
                  <th className="py-1 pr-2">Order</th>
                  <th className="py-1 pr-2">Status</th>
                  <th className="py-1">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(recentTx.data ?? []).map((r: Record<string, unknown>) => (
                  <tr key={String(r.id)} className="border-t border-zinc-800/80">
                    <td className="py-1.5 pr-2 font-mono text-[10px]">{String(r.order_id).slice(0, 14)}…</td>
                    <td className="py-1.5 pr-2">{String(r.status)}</td>
                    <td className="py-1.5">{formatIdr(Number(r.gross_amount_idr))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-2 text-sm font-medium text-zinc-200">Recent activations</div>
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="text-zinc-500">
                <tr>
                  <th className="py-1 pr-2">Email</th>
                  <th className="py-1">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {(recentAct.data ?? []).map((r: Record<string, unknown>) => {
                  const lic = r.licenses as { email?: string } | null;
                  return (
                    <tr key={String(r.id)} className="border-t border-zinc-800/80">
                      <td className="py-1.5 pr-2">{lic?.email ?? "—"}</td>
                      <td className="py-1.5 text-zinc-500">{String(r.last_seen_at ?? "").slice(0, 19)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Activity className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-medium text-zinc-200">Health MVP</span>
          <Button variant="secondary" size="sm" disabled={healthBusy} onClick={() => void runHealth()}>
            Ping public-config
          </Button>
          <a
            className="inline-flex items-center gap-1 text-xs text-violet-400 hover:underline"
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
          >
            Supabase Dashboard <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </Card>
    </div>
  );
}
