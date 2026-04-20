import { useState } from "react";
import { AffiliatesAdmin, WithdrawalsAdmin } from "../AdminExtraPages";
import { useAdminSession } from "../hooks/useAdminSession";

export default function AffiliatesPage() {
  const session = useAdminSession();
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
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-100">Affiliates</h1>
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
        {btn("affiliates", "Programs")}
        {btn("withdrawals", "Withdrawals")}
      </div>
      {tab === "affiliates" ? <AffiliatesAdmin /> : <WithdrawalsAdmin session={session} />}
    </div>
  );
}
