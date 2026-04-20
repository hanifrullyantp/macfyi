import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { Card } from "../components/ui/Card";

type FeedItem = { id: string; label: string; at: string };

export default function LiveActivityPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ch = supabase
      .channel("admin-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payment_transactions" },
        (p) => {
          const row = p.new as Record<string, unknown> | null;
          const oldRow = "old" in p ? (p.old as Record<string, unknown> | null) : null;
          const id = String(row?.id ?? oldRow?.id ?? "");
          setFeed((f) =>
            [{ id: `${p.eventType}-${id}-${Date.now()}`, label: `payment_transactions ${p.eventType}`, at: new Date().toISOString() }, ...f].slice(0, 40),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "withdrawal_requests" },
        (p) => {
          const row = p.new as Record<string, unknown> | null;
          const oldRow = "old" in p ? (p.old as Record<string, unknown> | null) : null;
          const id = String(row?.id ?? oldRow?.id ?? "");
          setFeed((f) =>
            [{ id: `${p.eventType}-w-${id}-${Date.now()}`, label: `withdrawal_requests ${p.eventType}`, at: new Date().toISOString() }, ...f].slice(0, 40),
          );
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") setErr("Realtime channel error (check RLS / replica identity).");
      });
    return () => {
      void supabase.removeChannel(ch);
    };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Live activity</h1>
        <p className="mt-1 text-sm text-zinc-500">Supabase Realtime on payment_transactions and withdrawal_requests (requires replica identity / policies).</p>
      </div>
      {err ? <p className="text-sm text-amber-400">{err}</p> : null}
      <Card className="p-4">
        <ul className="space-y-2 font-mono text-[11px] text-zinc-400">
          {feed.length === 0 ? <li className="text-zinc-500">Waiting for events…</li> : null}
          {feed.map((x) => (
            <li key={x.id} className="flex justify-between gap-2 border-b border-zinc-800/80 pb-1">
              <span>{x.label}</span>
              <span className="shrink-0 text-zinc-600">{x.at.slice(11, 19)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
