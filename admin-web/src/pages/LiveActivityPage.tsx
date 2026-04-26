import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import { Card } from "../components/ui/Card";
import { AdminPageFrame } from "../ui2/components/AdminPageFrame";

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
        if (status === "CHANNEL_ERROR") setErr("Realtime channel error (cek RLS / replica identity).");
      });
    return () => {
      void supabase.removeChannel(ch);
    };
  }, []);

  return (
    <AdminPageFrame description="Supabase Realtime di payment_transactions &amp; withdrawal_requests (perlu kebijakan RLS + replica identity).">
      {err ? <p className="text-sm text-amber-400/90">{err}</p> : null}
      <Card className="overflow-hidden rounded-3xl border border-white/5 bg-[#16161C] p-4">
        <ul className="space-y-2 font-mono text-[11px] text-white/40">
          {feed.length === 0 ? <li className="text-white/30">Menunggu event…</li> : null}
          {feed.map((x) => (
            <li key={x.id} className="flex justify-between gap-2 border-b border-white/[0.06] pb-1.5 last:border-0">
              <span className="text-white/60">{x.label}</span>
              <span className="shrink-0 text-white/25">{x.at.slice(11, 19)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </AdminPageFrame>
  );
}
