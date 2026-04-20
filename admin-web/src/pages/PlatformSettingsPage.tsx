import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { GROUP_ORDER, groupKeyForSetting, PLATFORM_SETTING_GROUPS } from "../lib/platformSettingsMeta";
import { supabase } from "../supabase";

type Row = { key: string; value: unknown };

export default function PlatformSettingsPage() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Record<string, string>>({});

  const q = useQuery({
    queryKey: ["platform_settings", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_settings").select("key, value").order("key");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  useEffect(() => {
    if (q.data) {
      const e: Record<string, string> = {};
      for (const r of q.data) e[r.key] = JSON.stringify(r.value);
      setEdit(e);
    }
  }, [q.data]);

  const grouped = useMemo(() => {
    const rows = q.data ?? [];
    const m = new Map<string, Row[]>();
    for (const g of GROUP_ORDER) m.set(g, []);
    for (const r of rows) {
      const gid = groupKeyForSetting(r.key);
      if (!m.has(gid)) m.set(gid, []);
      m.get(gid)!.push(r);
    }
    for (const [, list] of m) list.sort((a, b) => a.key.localeCompare(b.key));
    return m;
  }, [q.data]);

  const saveMut = useMutation({
    mutationFn: async (key: string) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(edit[key] ?? "null");
      } catch {
        throw new Error("JSON tidak valid");
      }
      const { error } = await supabase.from("platform_settings").upsert({ key, value: parsed as object, updated_at: new Date().toISOString() });
      if (error) throw error;
      const { data: ver } = await supabase.from("app_settings").select("config_version").eq("id", "default").maybeSingle();
      const nextV = (Number(ver?.config_version) || 1) + 1;
      await supabase.from("app_settings").update({ config_version: nextV, updated_at: new Date().toISOString() }).eq("id", "default");
    },
    onSuccess: async () => {
      toast.success("Saved");
      await qc.invalidateQueries({ queryKey: ["platform_settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const groupLabel = (id: string) => PLATFORM_SETTING_GROUPS.find((g) => g.id === id)?.label ?? "Other";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Platform settings</h1>
        <p className="mt-1 text-sm text-zinc-500">JSON values in platform_settings. Saving bumps config_version.</p>
      </div>
      {q.isError ? <p className="text-sm text-red-400">{(q.error as Error).message}</p> : null}
      {GROUP_ORDER.map((gid) => {
        const list = grouped.get(gid) ?? [];
        if (!list.length) return null;
        return (
          <Card key={gid} className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-violet-300">{groupLabel(gid)}</h2>
            <ul className="space-y-3">
              {list.map((r) => (
                <li key={r.key} className="rounded-lg border border-zinc-800 p-3">
                  <div className="mb-1 font-mono text-[11px] text-zinc-400">{r.key}</div>
                  <textarea
                    className="min-h-[48px] w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-xs"
                    value={edit[r.key] ?? ""}
                    onChange={(e) => setEdit((x) => ({ ...x, [r.key]: e.target.value }))}
                    spellCheck={false}
                  />
                  <Button variant="secondary" size="sm" className="mt-2" disabled={saveMut.isPending} onClick={() => void saveMut.mutateAsync(r.key)}>
                    Save key
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
