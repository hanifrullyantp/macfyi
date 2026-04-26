import { WaTemplatesAdmin } from "../WaTemplatesAdmin";
import { AdminPageFrame } from "../ui2/components/AdminPageFrame";

export default function WaTemplatesPage() {
  return (
    <AdminPageFrame description="Template pesan untuk afiliasi / dukungan (sesuai data di Supabase).">
      <WaTemplatesAdmin />
    </AdminPageFrame>
  );
}
