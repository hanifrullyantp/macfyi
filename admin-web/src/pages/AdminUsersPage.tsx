import { ExternalLink, UserCog } from "lucide-react";
import { Card } from "../components/ui/Card";

export default function AdminUsersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Admin users</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Listing Auth users requires the Supabase Admin API (service role). Exposing service role in this SPA would be unsafe. Use the dashboard, or add a
          locked-down Edge Function in a later phase.
        </p>
      </div>
      <Card className="flex items-start gap-3 p-6">
        <UserCog className="mt-0.5 h-8 w-8 shrink-0 text-violet-400" />
        <div className="space-y-2 text-sm text-zinc-400">
          <p>
            Open{" "}
            <a className="inline-flex items-center gap-1 text-violet-400 underline" href="https://supabase.com/dashboard/project/_/auth/users" target="_blank" rel="noreferrer">
              Auth → Users
              <ExternalLink className="h-3 w-3" />
            </a>{" "}
            and manage <code className="text-zinc-300">app_metadata.role</code> there.
          </p>
        </div>
      </Card>
    </div>
  );
}
