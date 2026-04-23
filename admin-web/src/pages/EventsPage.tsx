import { EventsAdmin } from "../AdminExtraPages";

export default function EventsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black text-white tracking-tighter">Promo events</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-white/35">Jadwal dan promo yang terhubung ke kampanye / pesan aplikasi.</p>
      </div>
      <EventsAdmin />
    </div>
  );
}
