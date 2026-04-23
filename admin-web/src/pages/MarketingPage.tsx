import { MarketingSettingsAdmin } from "../MarketingSettingsAdmin";

export default function MarketingPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black text-white tracking-tighter">Marketing</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-white/35">
          Kunci <code className="text-white/50">platform_settings</code> yang mempengaruhi landing &amp; desktop lewat Edge{" "}
          <code className="text-white/50">public-config</code>. Simpan perubahan lalu tunggu bump{" "}
          <code className="text-white/50">config_version</code>.
        </p>
      </div>
      <MarketingSettingsAdmin />
    </div>
  );
}
