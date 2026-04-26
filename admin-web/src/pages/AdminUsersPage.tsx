import { ExternalLink, UserCog } from "lucide-react";
import { Card } from "../components/ui/Card";
import { AdminPageFrame } from "../ui2/components/AdminPageFrame";

export default function AdminUsersPage() {
  return (
    <AdminPageFrame
      description={
        <>
          Daftar pengguna Auth butuh <strong className="text-white/50">Supabase Admin API (service role)</strong>. Mengekspos service role ke SPA tidak aman. Gunakan
          dashboard Supabase, atau nanti fungsi Edge terkunci.
        </>
      }
    >
      <Card className="flex items-start gap-3 rounded-3xl border border-white/5 bg-[#16161C] p-6">
        <UserCog className="mt-0.5 h-8 w-8 shrink-0 text-red-500/80" />
        <div className="space-y-2 text-sm text-white/45">
          <p>
            Buka{" "}
            <a
              className="inline-flex items-center gap-1 text-red-400/90 underline decoration-red-500/30 underline-offset-2 hover:text-red-300"
              href="https://supabase.com/dashboard/project/_/auth/users"
              target="_blank"
              rel="noreferrer"
            >
              Auth → Users
              <ExternalLink className="h-3 w-3" />
            </a>{" "}
            lalu atur <code className="text-white/60">app_metadata.role</code> di sana.
          </p>
        </div>
      </Card>
    </AdminPageFrame>
  );
}
