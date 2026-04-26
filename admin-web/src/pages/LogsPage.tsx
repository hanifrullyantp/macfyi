import { ErrorsLogsAdmin } from "../ErrorsLogsAdmin";
import { AdminPageFrame } from "../ui2/components/AdminPageFrame";

export default function LogsPage() {
  return (
    <AdminPageFrame description="Akar masalah klien / Edge (best-effort; bergantung tabel &amp; RLS).">
      <ErrorsLogsAdmin />
    </AdminPageFrame>
  );
}
