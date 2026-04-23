import { WaTemplatesAdmin } from "../WaTemplatesAdmin";

export default function WaTemplatesPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black text-white tracking-tighter">Template WhatsApp</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-white/35">Template pesan untuk afiliasi / dukungan (sesuai data di Supabase).</p>
      </div>
      <WaTemplatesAdmin />
    </div>
  );
}
