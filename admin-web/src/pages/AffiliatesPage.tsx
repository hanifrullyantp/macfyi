import { useState } from "react";
import { AffiliatesAdmin, WithdrawalsAdmin } from "../AdminExtraPages";
import { Card } from "../components/ui/Card";
import { useAdminSession } from "../hooks/useAdminSession";
import { useAffiliatesKpis } from "../hooks/useAffiliatesKpis";
import { formatIdr } from "../lib/formatters";

export default function AffiliatesPage() {
  const session = useAdminSession();
  const kpis = useAffiliatesKpis();
  const [tab, setTab] = useState<"affiliates" | "withdrawals">("affiliates");
  const btn = (id: typeof tab, label: string) => (
    <button
      type="button"
      key={id}
      onClick={() => setTab(id)}
      className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === id ? "bg-violet-600 text-white" : "text-zinc-400 hover:bg-zinc-800"}`}
    >
      {label}
    </button>
  );
  const k = kpis.data;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-100">Affiliates</h1>
      {kpis.isError ? <p className="text-xs text-red-400">{(kpis.error as Error).message}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Affiliates (total)</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-zinc-100">{k?.affiliateTotal ?? (kpis.isLoading ? "…" : "0")}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Active / pending approval</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-zinc-100">
            {k ? `${k.affiliateActive} / ${k.affiliatePending}` : kpis.isLoading ? "…" : "—"}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Pending balance (sum)</div>
          <div className="mt-1 text-lg font-bold tabular-nums text-zinc-100">{k ? formatIdr(k.balancePendingSumIdr) : "…"}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Withdrawals pending</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-zinc-100">{k?.withdrawalPendingCount ?? "…"}</div>
          <div className="text-xs text-zinc-500">{k ? formatIdr(k.withdrawalPendingSumIdr) : null}</div>
        </Card>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
        {btn("affiliates", "Programs")}
        {btn("withdrawals", "Withdrawals")}
      </div>
      {tab === "affiliates" ? <AffiliatesAdmin /> : <WithdrawalsAdmin session={session} />}
    </div>
  );
}
