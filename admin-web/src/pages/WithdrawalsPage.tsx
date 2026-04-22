import { WithdrawalsAdmin } from "../AdminExtraPages";
import { useAdminSession } from "../hooks/useAdminSession";

export default function WithdrawalsPage() {
  const session = useAdminSession();
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black text-white tracking-tight">Penarikan</h1>
        <p className="text-white/40 font-medium">Permintaan pembayaran komisi afiliasi (aksi via Edge Function admin).</p>
      </div>
      <div className="rounded-3xl border border-white/5 bg-[#16161C] p-6">
        <WithdrawalsAdmin session={session} />
      </div>
    </div>
  );
}
