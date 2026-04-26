import { AnnouncementsAdmin } from "../AdminExtraPages";
import { AdminPageFrame } from "../ui2/components/AdminPageFrame";

export default function AnnouncementsPage() {
  return (
    <AdminPageFrame description="Pengumuman in-app / banner (sesuai data Supabase + komponen admin).">
      <AnnouncementsAdmin />
    </AdminPageFrame>
  );
}
