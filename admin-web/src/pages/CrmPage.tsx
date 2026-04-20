import { CrmHubAdmin } from "../CrmHub";

export default function CrmPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-100">CRM contacts</h1>
      <CrmHubAdmin />
    </div>
  );
}
