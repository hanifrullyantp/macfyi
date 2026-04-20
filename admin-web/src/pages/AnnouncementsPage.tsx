import { AnnouncementsAdmin } from "../AdminExtraPages";

export default function AnnouncementsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-100">Announcements</h1>
      <AnnouncementsAdmin />
    </div>
  );
}
