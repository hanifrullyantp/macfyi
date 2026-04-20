import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";

export function useAffiliatesKpis() {
  return useQuery({
    queryKey: ["affiliates", "kpis"],
    queryFn: async () => {
      const [affRes, wRes] = await Promise.all([
        supabase.from("affiliates").select("id, status, balance_pending_idr"),
        supabase.from("withdrawal_requests").select("id, amount_idr, status").eq("status", "pending"),
      ]);
      if (affRes.error) throw affRes.error;
      if (wRes.error) throw wRes.error;

      const affs = affRes.data ?? [];
      const active = affs.filter((a) => a.status === "active").length;
      const pendingAff = affs.filter((a) => a.status === "pending").length;
      const pendingBal = affs.reduce((s, a) => s + (Number(a.balance_pending_idr) || 0), 0);

      const w = wRes.data ?? [];
      const pendingWCount = w.length;
      const pendingWSum = w.reduce((s, r) => s + (Number(r.amount_idr) || 0), 0);

      return {
        affiliateTotal: affs.length,
        affiliateActive: active,
        affiliatePending: pendingAff,
        balancePendingSumIdr: pendingBal,
        withdrawalPendingCount: pendingWCount,
        withdrawalPendingSumIdr: pendingWSum,
      };
    },
  });
}
