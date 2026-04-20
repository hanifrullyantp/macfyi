import { useQueryClient } from "@tanstack/react-query";
import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "../../supabase";
import { useAppUi } from "../../store/appUi";
import { formatDistanceToNow } from "date-fns";

export function StatusBar() {
  const qc = useQueryClient();
  const { lastSyncAt, touchSync } = useAppUi();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const unsub = qc.getQueryCache().subscribe(() => {
      touchSync();
    });
    return () => unsub();
  }, [qc, touchSync]);

  useEffect(() => {
    if (!supabaseConfigured) return;
    void supabase
      .from("app_settings")
      .select("id")
      .eq("id", "default")
      .maybeSingle()
      .then(({ error }) => setOnline(!error))
      .catch(() => setOnline(false));
  }, []);

  const syncLabel =
    lastSyncAt == null
      ? "No queries yet"
      : `Last data activity ${formatDistanceToNow(lastSyncAt, { addSuffix: true })}`;

  return (
    <footer className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 bg-zinc-950/90 px-4 py-2 text-[11px] text-zinc-500">
      <div className="flex items-center gap-2">
        {online ? <Wifi className="w-3.5 h-3.5 text-emerald-500" /> : <WifiOff className="w-3.5 h-3.5 text-red-400" />}
        <span>{online ? "Supabase reachable" : "Supabase check failed"}</span>
      </div>
      <span className="tabular-nums">{syncLabel}</span>
    </footer>
  );
}
