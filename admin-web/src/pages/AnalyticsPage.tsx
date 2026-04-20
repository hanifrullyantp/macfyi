import { useQuery } from "@tanstack/react-query";
import { subDays, format } from "date-fns";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../components/ui/Card";
import { supabase } from "../supabase";

function lastNDayKeys(days: number): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    keys.push(format(subDays(new Date(), i), "yyyy-MM-dd"));
  }
  return keys;
}

function bucketByDay(rows: { created_at: string }[], days: number): { date: string; count: number }[] {
  const keys = lastNDayKeys(days);
  const map = new Map(keys.map((k) => [k, 0] as const));
  for (const r of rows) {
    const day = r.created_at.slice(0, 10);
    if (!map.has(day)) continue;
    map.set(day, (map.get(day) ?? 0) + 1);
  }
  return keys.map((k) => ({ date: k.slice(5), count: map.get(k) ?? 0 }));
}

export default function AnalyticsPage() {
  const q = useQuery({
    queryKey: ["analytics", "counts"],
    queryFn: async () => {
      const [c, a, co, pt, lic, ev] = await Promise.all([
        supabase.from("crm_contacts").select("id", { count: "exact", head: true }),
        supabase.from("affiliates").select("id", { count: "exact", head: true }),
        supabase.from("commissions").select("id", { count: "exact", head: true }),
        supabase.from("payment_transactions").select("id", { count: "exact", head: true }),
        supabase.from("licenses").select("id", { count: "exact", head: true }),
        supabase.from("crm_events").select("id", { count: "exact", head: true }),
      ]);
      const evCount = ev.error ? null : ev.count;
      return {
        contacts: c.count ?? 0,
        affiliates: a.count ?? 0,
        commissions: co.count ?? 0,
        checkoutTx: pt.count ?? 0,
        licenses: lic.count ?? 0,
        crmEvents: evCount,
        crmEventsErr: ev.error?.message ?? null,
      };
    },
  });

  const series = useQuery({
    queryKey: ["analytics", "series", 14],
    queryFn: async () => {
      const since = subDays(new Date(), 14).toISOString();
      type SeriesOut = {
        telemetry: { date: string; count: number }[] | null;
        telemetryErr: string | null;
        crmEvents: { date: string; count: number }[] | null;
        crmEventsErr: string | null;
      };
      const out: SeriesOut = {
        telemetry: null,
        telemetryErr: null,
        crmEvents: null,
        crmEventsErr: null,
      };

      const tel = await supabase.from("client_telemetry").select("created_at").gte("created_at", since).limit(5000);
      if (tel.error) {
        out.telemetryErr = tel.error.message;
      } else {
        out.telemetry = bucketByDay((tel.data ?? []) as { created_at: string }[], 14);
      }

      const ev = await supabase.from("crm_events").select("created_at").gte("created_at", since).limit(5000);
      if (ev.error) {
        out.crmEventsErr = ev.error.message;
      } else {
        out.crmEvents = bucketByDay((ev.data ?? []) as { created_at: string }[], 14);
      }

      return out;
    },
  });

  const rows = q.data;
  const s = series.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Analytics</h1>
        <p className="mt-1 text-sm text-zinc-500">Aggregate counts and 14-day activity (best-effort when tables exist).</p>
      </div>

      {q.isError ? <p className="text-sm text-red-400">{(q.error as Error).message}</p> : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {(
          [
            ["CRM contacts", rows?.contacts],
            ["Affiliates", rows?.affiliates],
            ["Commissions", rows?.commissions],
            ["Checkout tx", rows?.checkoutTx],
            ["Licenses", rows?.licenses],
            ["CRM events", rows?.crmEvents],
          ] as const
        ).map(([label, n]) => (
          <Card key={label} className="p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-zinc-100">{n ?? "—"}</div>
          </Card>
        ))}
      </div>

      {rows?.crmEventsErr ? <p className="text-xs text-zinc-500">crm_events count: {rows.crmEventsErr}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-medium text-zinc-200">Client telemetry (14d)</h2>
          {series.isLoading ? <p className="text-xs text-zinc-500">Loading…</p> : null}
          {s?.telemetryErr ? (
            <p className="text-xs text-zinc-500">No series: {s.telemetryErr}</p>
          ) : s?.telemetry?.some((d) => d.count > 0) ? (
            <div className="h-52 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.telemetry ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#71717a", fontSize: 10 }} width={28} />
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Events" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No telemetry rows in window (or table empty).</p>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-2 text-sm font-medium text-zinc-200">CRM events (14d)</h2>
          {s?.crmEventsErr ? (
            <p className="text-xs text-zinc-500">No series: {s.crmEventsErr}</p>
          ) : s?.crmEvents?.some((d) => d.count > 0) ? (
            <div className="h-52 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={s.crmEvents ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#71717a", fontSize: 10 }} width={28} />
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="count" stroke="#a78bfa" strokeWidth={2} dot={false} name="Events" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No CRM events in window (or table empty).</p>
          )}
        </Card>
      </div>

      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-medium text-zinc-200">UTM &amp; attribution</h2>
        <p className="text-xs text-zinc-500">
          Extend with targeted queries when <code className="text-zinc-400">utm_*</code> columns exist on <code className="text-zinc-400">crm_contacts</code> or in{" "}
          <code className="text-zinc-400">crm_events.payload</code>.
        </p>
      </Card>
    </div>
  );
}
