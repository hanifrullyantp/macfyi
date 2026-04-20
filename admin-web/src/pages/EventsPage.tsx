import { EventsAdmin } from "../AdminExtraPages";

export default function EventsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-100">Promo events</h1>
      <EventsAdmin />
    </div>
  );
}
