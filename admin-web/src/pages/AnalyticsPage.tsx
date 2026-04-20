import { useQuery } from "@tanstack/react-query";
import { Card } from "../components/ui/Card";
import { supabase } from "../supabase";

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

  const rows = q.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Analytics</h1>
        <p className="mt-1 text-sm text-zinc-500">Aggregate counts from core tables.</p>
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

      {rows?.crmEventsErr ? <p className="text-xs text-zinc-500">crm_events: {rows.crmEventsErr} (table may be absent)</p> : null}

      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-medium text-zinc-200">UTM &amp; attribution</h2>
        <p className="text-xs text-zinc-500">
          No <code className="text-zinc-400">utm_*</code> columns were found in this repo&apos;s migrations. If you add UTM fields to <code className="text-zinc-400">crm_contacts</code> or
          events, extend this page with targeted queries.
        </p>
      </Card>
    </div>
  );
}
