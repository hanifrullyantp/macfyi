import { ErrorsLogsAdmin } from "../ErrorsLogsAdmin";

export default function LogsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-100">Logs</h1>
      <ErrorsLogsAdmin />
    </div>
  );
}
