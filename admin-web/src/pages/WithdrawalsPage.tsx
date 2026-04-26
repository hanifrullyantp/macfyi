import { WithdrawalsAdmin } from "../AdminExtraPages";
import { useAdminSession } from "../hooks/useAdminSession";
import { AdminPageFrame } from "../ui2/components/AdminPageFrame";

export default function WithdrawalsPage() {
  const session = useAdminSession();
  return (
    <AdminPageFrame description="Permintaan pembayaran komisi afiliasi (setujui / tolak lewat Edge Function admin).">
      <div className="rounded-3xl border border-white/5 bg-[#16161C] p-6">
        <WithdrawalsAdmin session={session} />
      </div>
    </AdminPageFrame>
  );
}
