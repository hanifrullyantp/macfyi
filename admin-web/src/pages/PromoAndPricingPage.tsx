import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { useAdminSession } from "../hooks/useAdminSession";
import { findActivePhase, parsePromoPlan, resolvePromoContext } from "../lib/promoPlanClient";
import { supabase } from "../supabase";

type AppRow = Record<string, unknown>;

export default function PromoAndPricingPage() {
  const session = useAdminSession();
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

  const row = q.data;
  const baseLifetime = Number(row?.lifetime_price_idr) || 173000;

  const parsedPromo = useMemo(() => {
    try {
      return JSON.parse(promoPlanJson || "null");
    } catch {
      return null;
    }
  }, [promoPlanJson]);

  const promoDoc = useMemo(() => parsePromoPlan(parsedPromo), [parsedPromo]);
  const activePhase = useMemo(() => (promoDoc ? findActivePhase(Date.now(), promoDoc.phases) : null), [promoDoc]);

  const resolved = useMemo(
    () =>
      resolvePromoContext({
        now: new Date(),
        baseLifetimeIdr: baseLifetime,
        plan: parsedPromo,
        promoSlotsRemaining: slots.trim() === "" ? null : Number(slots),
      }),
    [baseLifetime, parsedPromo, slots],
  );

  const blockCheckout = Boolean(promoDoc?.block_checkout_when_slots_zero);

  const setBlockCheckout = (v: boolean) => {
    try {
      const cur = JSON.parse(promoPlanJson || "{}");
      const base = cur && typeof cur === "object" && !Array.isArray(cur) ? (cur as Record<string, unknown>) : {};
      const next = { ...base, block_checkout_when_slots_zero: v };
      setPromoPlanJson(JSON.stringify(next, null, 2));
    } catch {
      toast.error("Could not merge into promo_plan JSON");
    }
  };

  const resetSlotsFromActivePhase = () => {
    const si = activePhase?.slots_initial;
    if (si == null || !Number.isFinite(Number(si))) {
      toast.error("Active phase has no numeric slots_initial — set slots manually or fix JSON.");
      return;
    }
    setSlots(String(Math.round(Number(si))));
    toast.message("Slots field set from active phase (overrides live counter until you publish).");
  };

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
      toast.message("Publish log (client)", { description: session.user.email ?? session.user.id });
      setConfirmOpen(false);
      setHydrated(false);
      await qc.invalidateQueries({ queryKey: ["app_settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

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

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-medium text-zinc-200">Structured controls</h2>
        <p className="text-xs text-zinc-500">
          Active phase is derived client-side from <code className="text-zinc-400">phases</code> and current time — align with server{" "}
          <code className="text-zinc-400">resolvePromoContext</code> in <code className="text-zinc-400">supabase/functions/_shared/promoPlan.ts</code>.
        </p>
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-400">
          <div>
            <span className="text-zinc-500">Promo active: </span>
            <span className="font-mono text-zinc-200">{resolved.active ? "yes" : "no"}</span>
          </div>
          {activePhase ? (
            <div className="mt-1 space-y-0.5 font-mono text-[11px]">
              <div>
                window: {activePhase.starts_at.slice(0, 10)} → {activePhase.ends_at.slice(0, 10)}
              </div>
              <div>
                lifetime_price_idr: {activePhase.lifetime_price_idr} · slots_initial:{" "}
                {activePhase.slots_initial == null ? "—" : String(activePhase.slots_initial)}
              </div>
            </div>
          ) : (
            <div className="mt-1 text-zinc-500">No phase covers &quot;now&quot; (or JSON invalid).</div>
          )}
          <div className="mt-2 text-zinc-500">
            Resolved slots_remaining (DB counter):{" "}
            <span className="font-mono text-zinc-200">{resolved.slots_remaining == null ? "null" : String(resolved.slots_remaining)}</span>
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
          <input type="checkbox" className="rounded border-zinc-600" checked={blockCheckout} onChange={(e) => setBlockCheckout(e.target.checked)} />
          <span>
            <code className="text-violet-300">block_checkout_when_slots_zero</code> — block checkout when live slot counter hits zero.
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" type="button" onClick={() => resetSlotsFromActivePhase()}>
            Reset slots field → active phase <code className="text-[10px]">slots_initial</code>
          </Button>
          <span className="text-[11px] text-zinc-500">
            This only changes the numeric field below until you publish; it overrides the live counter in DB when saved.
          </span>
        </div>
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
