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
      className={`rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-widest transition-all ${
        tab === id ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "bg-white/[0.02] text-white/35 hover:text-white hover:bg-white/[0.04] border border-white/10"
      }`}
    >
      {label}
    </button>
  );
  const k = kpis.data;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black text-white tracking-tight">Afiliasi</h1>
        <p className="text-white/40 font-medium">Program afiliasi, saldo, dan penarikan.</p>
      </div>
      {kpis.isError ? <p className="text-xs text-red-400">{(kpis.error as Error).message}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-white/5 bg-[#16161C] p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/20">Affiliates (total)</div>
          <div className="mt-2 text-3xl font-black tabular-nums text-white">{k?.affiliateTotal ?? (kpis.isLoading ? "…" : "0")}</div>
        </div>
        <div className="rounded-3xl border border-white/5 bg-[#16161C] p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/20">Active / pending</div>
          <div className="mt-2 text-3xl font-black tabular-nums text-white">{k ? `${k.affiliateActive} / ${k.affiliatePending}` : kpis.isLoading ? "…" : "—"}</div>
        </div>
        <div className="rounded-3xl border border-white/5 bg-[#16161C] p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/20">Pending balance (sum)</div>
          <div className="mt-2 text-2xl font-black tabular-nums text-white">{k ? formatIdr(k.balancePendingSumIdr) : "…"}</div>
        </div>
        <div className="rounded-3xl border border-white/5 bg-[#16161C] p-5">
          <div className="text-[10px] font-black uppercase tracking-widest text-white/20">Withdrawals pending</div>
          <div className="mt-2 text-3xl font-black tabular-nums text-white">{k?.withdrawalPendingCount ?? "…"}</div>
          <div className="text-xs text-white/30">{k ? formatIdr(k.withdrawalPendingSumIdr) : null}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {btn("affiliates", "Programs")}
        {btn("withdrawals", "Withdrawals")}
      </div>
      <div className="rounded-3xl border border-white/5 bg-[#16161C] p-6">
        {tab === "affiliates" ? <AffiliatesAdmin /> : <WithdrawalsAdmin session={session} />}
      </div>
    </div>
  );
}
