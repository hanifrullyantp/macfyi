import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "./components/ui/Button";
import { supabase } from "./supabase";

type EvRow = {
  id: string;
  event_type: string;
  created_at: string;
  contact_id: string;
  crm_contacts: { email: string | null; display_name: string | null } | null;
};

export function CrmRecentEvents() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["crm_events", "recent"],
    queryFn: async () => {
      const res = await supabase
        .from("crm_events")
        .select("id, event_type, created_at, contact_id, crm_contacts(email, display_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (res.error) throw res.error;
      return (res.data ?? []) as EvRow[];
    },
    retry: 0,
  });

  if (q.isError) {
    return (
      <div className="rounded-xl border border-zinc-800 p-4 text-sm text-zinc-500">
        CRM events unavailable: {(q.error as Error).message}
      </div>
    );
  }

  const rows = q.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium text-white">Recent CRM events</h2>
        <Button variant="ghost" size="sm" onClick={() => void qc.invalidateQueries({ queryKey: ["crm_events"] })}>
          Refresh
        </Button>
      </div>
      {q.isLoading ? <p className="text-sm text-zinc-500">Loading…</p> : null}
      {!q.isLoading && rows.length === 0 ? <p className="text-sm text-zinc-500">No events yet.</p> : null}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 text-xs">
        <table className="w-full text-left">
          <thead className="border-b border-zinc-800 text-zinc-500">
            <tr>
              <th className="p-2">Time</th>
              <th className="p-2">Type</th>
              <th className="p-2">Contact</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-zinc-800/80">
                <td className="p-2 whitespace-nowrap text-zinc-400">{r.created_at.slice(0, 19)}</td>
                <td className="p-2 font-mono text-violet-300">{r.event_type}</td>
                <td className="p-2 text-zinc-300">
                  {r.crm_contacts?.email ?? r.crm_contacts?.display_name ?? r.contact_id.slice(0, 8)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
