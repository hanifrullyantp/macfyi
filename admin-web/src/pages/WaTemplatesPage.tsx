import { WaTemplatesAdmin } from "../WaTemplatesAdmin";

export default function WaTemplatesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-100">WA templates</h1>
      <WaTemplatesAdmin />
    </div>
  );
}
