import { MarketingSettingsAdmin } from "../MarketingSettingsAdmin";

export default function MarketingPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-100">Public config keys</h1>
      <MarketingSettingsAdmin />
    </div>
  );
}
