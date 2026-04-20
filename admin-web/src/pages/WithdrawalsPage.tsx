import { WithdrawalsAdmin } from "../AdminExtraPages";
import { useAdminSession } from "../hooks/useAdminSession";

export default function WithdrawalsPage() {
  const session = useAdminSession();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-100">Withdrawals</h1>
      <WithdrawalsAdmin session={session} />
    </div>
  );
}
