import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { GROUP_ORDER, groupKeyForSetting, PLATFORM_SETTING_GROUPS, PLATFORM_SETTING_HINTS } from "../lib/platformSettingsMeta";
import { supabase } from "../supabase";
import { AdminPageFrame } from "../ui2/components/AdminPageFrame";

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
    <AdminPageFrame description="Nilai JSON di platform_settings. Menyimpan satu kunci akan menaikkan config_version di app_settings.">
      {q.isError ? <p className="text-sm text-red-400/90">{(q.error as Error).message}</p> : null}
      {GROUP_ORDER.map((gid) => {
        const list = grouped.get(gid) ?? [];
        if (!list.length) return null;
        return (
          <Card key={gid} className="space-y-3 rounded-3xl border border-white/5 p-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-red-500/80">{groupLabel(gid)}</h2>
            <ul className="space-y-3">
              {list.map((r) => (
                <li key={r.key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="mb-1 font-mono text-[11px] text-white/45">{r.key}</div>
                  {PLATFORM_SETTING_HINTS[r.key] ? (
                    <p className="mb-2 text-[11px] leading-relaxed text-white/40">{PLATFORM_SETTING_HINTS[r.key]}</p>
                  ) : null}
                  <textarea
                    className="admin-textarea-compact w-full"
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
    </AdminPageFrame>
  );
}
