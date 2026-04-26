import { EventsAdmin } from "../AdminExtraPages";
import { AdminPageFrame } from "../ui2/components/AdminPageFrame";

export default function EventsPage() {
  return (
    <AdminPageFrame description="Jadwal dan promo yang terhubung ke kampanye / pesan aplikasi.">
      <EventsAdmin />
    </AdminPageFrame>
  );
}
