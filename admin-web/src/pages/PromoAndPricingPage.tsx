import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { supabase } from "../supabase";

type AppRow = Record<string, unknown>;

export default function PromoAndPricingPage() {
  const qc = useQueryClient();
  const [promoPlanJson, setPromoPlanJson] = useState("");
  const [couponsJson, setCouponsJson] = useState("");
  const [slots, setSlots] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const q = useQuery({
    queryKey: ["app_settings", "promo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("promo_plan, promo_slots_remaining, checkout_coupons, lifetime_price_idr, config_version, updated_at")
        .eq("id", "default")
        .maybeSingle();
      if (error) throw error;
      return data as AppRow | null;
    },
  });

  useEffect(() => {
    if (!q.data || hydrated) return;
    setPromoPlanJson(JSON.stringify(q.data.promo_plan ?? {}, null, 2));
    setCouponsJson(JSON.stringify(q.data.checkout_coupons ?? { coupons: [] }, null, 2));
    setSlots(q.data.promo_slots_remaining == null ? "" : String(q.data.promo_slots_remaining));
    setHydrated(true);
  }, [q.data, hydrated]);

  const saveMut = useMutation({
    mutationFn: async () => {
      let promo_plan: unknown;
      let checkout_coupons: unknown;
      try {
        promo_plan = JSON.parse(promoPlanJson || "null");
      } catch {
        throw new Error("promo_plan JSON invalid");
      }
      try {
        checkout_coupons = JSON.parse(couponsJson || "null");
      } catch {
        throw new Error("checkout_coupons JSON invalid");
      }
      const { data: cur, error: e0 } = await supabase.from("app_settings").select("config_version").eq("id", "default").maybeSingle();
      if (e0) throw e0;
      const nextV = (Number((cur as { config_version?: number })?.config_version) || 1) + 1;
      const slotsVal = slots.trim() === "" ? null : Number(slots);
      if (slotsVal !== null && !Number.isFinite(slotsVal)) throw new Error("slots must be number or empty");

      const { error } = await supabase
        .from("app_settings")
        .update({
          promo_plan: promo_plan as never,
          checkout_coupons: checkout_coupons as never,
          promo_slots_remaining: slotsVal as never,
          config_version: nextV,
          updated_at: new Date().toISOString(),
        })
        .eq("id", "default");
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Published — config_version bumped");
      setConfirmOpen(false);
      setHydrated(false);
      await qc.invalidateQueries({ queryKey: ["app_settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const row = q.data;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Promo &amp; pricing</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Edits bump <code className="text-zinc-400">config_version</code> so clients refetch public-config. DB audit is{" "}
          <code className="text-zinc-400">updated_at</code> only unless you add a log table.
        </p>
      </div>

      {q.isError ? <p className="text-sm text-red-400">{(q.error as Error).message}</p> : null}

      <Card className="space-y-2 p-4 text-xs text-zinc-500">
        <div>
          Lifetime IDR (edit in App settings):{" "}
          <span className="font-mono text-zinc-300">{row ? String(row.lifetime_price_idr ?? "—") : "…"}</span>
        </div>
        <div>
          config_version: <span className="font-mono text-zinc-300">{row ? String(row.config_version ?? "—") : "…"}</span>
        </div>
        <div>updated_at: {row ? String(row.updated_at ?? "") : "…"}</div>
      </Card>

      <Card className="space-y-2 p-4">
        <label className="text-xs font-medium text-zinc-400">promo_plan (JSON)</label>
        <textarea
          className="min-h-[180px] w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-200"
          value={promoPlanJson}
          onChange={(e) => setPromoPlanJson(e.target.value)}
          spellCheck={false}
        />
      </Card>

      <Card className="space-y-2 p-4">
        <label className="text-xs font-medium text-zinc-400">promo_slots_remaining (empty = null)</label>
        <input
          className="w-full max-w-xs rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          value={slots}
          onChange={(e) => setSlots(e.target.value)}
          placeholder="e.g. 42"
        />
      </Card>

      <Card className="space-y-2 p-4">
        <label className="text-xs font-medium text-zinc-400">checkout_coupons (JSON)</label>
        <textarea
          className="min-h-[200px] w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-200"
          value={couponsJson}
          onChange={(e) => setCouponsJson(e.target.value)}
          spellCheck={false}
        />
      </Card>

      <Button variant="primary" disabled={saveMut.isPending || q.isLoading} onClick={() => setConfirmOpen(true)}>
        Confirm publish
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Publish promo & coupons?"
        description="This updates app_settings and increments config_version."
        confirmLabel="Publish"
        onConfirm={async () => {
          await saveMut.mutateAsync();
        }}
      />
    </div>
  );
}
