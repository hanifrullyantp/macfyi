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
    <div className="space-y-10 animate-in fade-in duration-500">
      <div>
        <h1 className="text-5xl font-black text-white tracking-tighter">Analitik</h1>
        <p className="text-white/30 font-medium">
          Ringkasan jumlah data + aktivitas 14 hari (best-effort bila tabel telemetry tidak ada / RLS menolak).
        </p>
      </div>

      {q.isError ? <p className="text-sm text-red-400">{(q.error as Error).message}</p> : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
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
          <div key={label} className="rounded-3xl border border-white/5 bg-[#16161C] p-5">
            <div className="text-[10px] font-black uppercase tracking-widest text-white/20">{label}</div>
            <div className="mt-2 text-3xl font-black tabular-nums text-white">{n ?? "—"}</div>
          </div>
        ))}
      </div>

      {rows?.crmEventsErr ? <p className="text-xs text-zinc-500">crm_events count: {rows.crmEventsErr}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/5 bg-[#16161C] p-6">
          <h2 className="mb-2 text-sm font-black uppercase tracking-widest text-white/20">Client telemetry (14d)</h2>
          {series.isLoading ? <p className="text-xs text-zinc-500">Loading…</p> : null}
          {s?.telemetryErr ? (
            <p className="text-xs text-zinc-500">No series: {s.telemetryErr}</p>
          ) : s?.telemetry?.some((d) => d.count > 0) ? (
            <div className="h-52 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.telemetry ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} width={28} />
                  <Tooltip contentStyle={{ background: "#0E0E11", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }} />
                  <Bar dataKey="count" fill="#E10600" radius={[6, 6, 0, 0]} name="Events" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No telemetry rows in window (or table empty).</p>
          )}
        </div>

        <div className="rounded-3xl border border-white/5 bg-[#16161C] p-6">
          <h2 className="mb-2 text-sm font-black uppercase tracking-widest text-white/20">CRM events (14d)</h2>
          {s?.crmEventsErr ? (
            <p className="text-xs text-zinc-500">No series: {s.crmEventsErr}</p>
          ) : s?.crmEvents?.some((d) => d.count > 0) ? (
            <div className="h-52 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={s.crmEvents ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} width={28} />
                  <Tooltip contentStyle={{ background: "#0E0E11", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12 }} />
                  <Line type="monotone" dataKey="count" stroke="#FF3B3B" strokeWidth={2.5} dot={false} name="Events" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No CRM events in window (or table empty).</p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-white/5 bg-[#16161C] p-6 space-y-2">
        <h2 className="text-sm font-black uppercase tracking-widest text-white/20">UTM &amp; attribution</h2>
        <p className="text-xs text-white/30 leading-relaxed">
          Extend with targeted queries when <code className="text-zinc-400">utm_*</code> columns exist on <code className="text-zinc-400">crm_contacts</code> or in{" "}
          <code className="text-zinc-400">crm_events.payload</code>.
        </p>
      </div>
    </div>
  );
}
