import { useState } from "react";
import { ExternalLink, Zap } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { EDGE_FUNCTIONS_IN_REPO } from "../lib/edgeFunctionsCatalog";
import { healthCheckEdgeFunction } from "../lib/publicConfigClient";
import { useAdminSession } from "../hooks/useAdminSession";

export default function EdgeFunctionsPage() {
  const session = useAdminSession();
  const [busy, setBusy] = useState<string | null>(null);
  const [last, setLast] = useState<Record<string, string>>({});

  const ping = async (name: string) => {
    setBusy(name);
    try {
      if (name !== "public-config") {
        toast.message("Skipped", { description: "Only safe GET public-config is auto-pinged from browser." });
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
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Edge functions</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Supabase does not expose per-function invocation metrics to the anon/JWT browser client. MVP: list functions from repo + ping{" "}
          <code className="text-zinc-400">public-config</code>; use Dashboard for logs and latency.
        </p>
      </div>
      <Card className="divide-y divide-zinc-800">
        {EDGE_FUNCTIONS_IN_REPO.map((name) => (
          <div key={name} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2 font-mono text-sm text-zinc-300">
              <Zap className="h-4 w-4 text-violet-400" />
              {name}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {last[name] ? <span className="max-w-md truncate text-[10px] text-zinc-500">{last[name]}</span> : null}
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
        className="inline-flex items-center gap-1 text-sm text-violet-400 hover:underline"
      >
        Open Supabase Dashboard <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
