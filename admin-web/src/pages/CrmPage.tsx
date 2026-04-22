import { CrmHubAdmin } from "../CrmHub";

export default function CrmPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black text-white tracking-tight">CRM</h1>
        <p className="text-white/40 font-medium">Kontak + event terbaru (best-effort jika tabel kosong).</p>
      </div>
      <div className="rounded-3xl border border-white/5 bg-[#16161C] p-6">
        <CrmHubAdmin />
      </div>
    </div>
  );
}
