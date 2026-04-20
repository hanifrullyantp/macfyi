import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";

export function useNavBadges() {
  const withdrawals = useQuery({
    queryKey: ["nav-badges", "withdrawals-pending"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("withdrawal_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const stalePendingTx = useQuery({
    queryKey: ["nav-badges", "payments-stale-pending"],
    queryFn: async () => {
      const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
      const { count, error } = await supabase
        .from("payment_transactions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .lt("created_at", since);
      if (error) throw error;
      return count ?? 0;
    },
  });

  return {
    withdrawals: withdrawals.data ?? 0,
    payments: stalePendingTx.data ?? 0,
    isLoading: withdrawals.isLoading || stalePendingTx.isLoading,
  };
}
