import { useState } from "react";
import { ExternalLink, Zap } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EDGE_FUNCTIONS_IN_REPO } from "../lib/edgeFunctionsCatalog";
import { healthCheckEdgeFunction } from "../lib/publicConfigClient";
import { useAdminSession } from "../hooks/useAdminSession";
import { AdminPageFrame } from "../ui2/components/AdminPageFrame";

export default function EdgeFunctionsPage() {
  const session = useAdminSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [last, setLast] = useState<Record<string, string>>({});

  const ping = async (name: string) => {
    setBusy(name);
    try {
      if (name !== "public-config") {
        toast.message("Dilewati", { description: "Hanya GET public-config yang aman di-ping dari browser." });
        setLast((x) => ({ ...x, [name]: "use Dashboard" }));
        return;
      }
      const r = await healthCheckEdgeFunction(name, session.access_token);
      setLast((x) => ({ ...x, [name]: `${r.status} ${r.body.slice(0, 120)}` }));
      if (r.ok) toast.success(`${name} OK`);
      else toast.error(`${name} ${r.status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminPageFrame
      description={
        <>
          Metrik invokasi per fungsi tidak tersedia untuk klien anon/JWT. MVP: daftar fungsi di repo + health{" "}
          <code>public-config</code>; log &amp; latency lewat Supabase Dashboard.
        </>
      }
    >
      <Card className="overflow-hidden rounded-3xl border border-white/5 bg-[#16161C] divide-y divide-white/[0.06]">
        {EDGE_FUNCTIONS_IN_REPO.map((name) => (
          <div key={name} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
            <div className="flex items-center gap-2 font-mono text-sm text-white/70">
              <Zap className="h-4 w-4 text-red-500/80" />
              {name}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {last[name] ? <span className="max-w-md truncate text-[10px] text-white/30">{last[name]}</span> : null}
              <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => void ping(name)}>
                {busy === name ? "…" : name === "public-config" ? "Health" : "Info"}
              </Button>
            </div>
          </div>
        ))}
      </Card>
      <a
        href="https://supabase.com/dashboard"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-red-400/80 hover:text-red-300"
      >
        Buka Supabase Dashboard <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </AdminPageFrame>
  );
}
