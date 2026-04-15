import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

export function ErrorsLogsAdmin() {
  const [errors, setErrors] = useState<
    { id: string; source: string; severity: string; message: string; created_at: string; resolved: boolean }[]
  >([]);
  const [telemetry, setTelemetry] = useState<{ id: string; event_type: string; source: string; created_at: string }[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [e, t] = await Promise.all([
      supabase.from("app_error_reports").select("id, source, severity, message, created_at, resolved").order("created_at", { ascending: false }).limit(100),
      supabase.from("client_telemetry").select("id, event_type, source, created_at").order("created_at", { ascending: false }).limit(100),
    ]);
    if (e.error) setErr(e.error.message);
    else if (t.error) setErr(t.error.message);
    else {
      setErr(null);
      setErrors((e.data ?? []) as typeof errors);
      setTelemetry((t.data ?? []) as typeof telemetry);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const markResolved = async (id: string) => {
    await supabase
      .from("app_error_reports")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", id);
    void load();
  };

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-medium text-white">Error &amp; telemetry</h2>
      {err && <p className="text-sm text-red-400">{err}</p>}

      <section>
        <h3 className="text-sm text-zinc-400 mb-2">app_error_reports</h3>
        <div className="overflow-x-auto rounded-xl border border-zinc-800 text-xs">
          <table className="w-full text-left">
            <thead className="text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="p-2">Waktu</th>
                <th className="p-2">Sumber</th>
                <th className="p-2">Severity</th>
                <th className="p-2">Pesan</th>
                <th className="p-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((r) => (
                <tr key={r.id} className="border-b border-zinc-800/80">
                  <td className="p-2 whitespace-nowrap">{r.created_at.slice(0, 19)}</td>
                  <td className="p-2">{r.source}</td>
                  <td className="p-2">{r.severity}</td>
                  <td className="p-2 max-w-md truncate">{r.message}</td>
                  <td className="p-2">
                    {!r.resolved && (
                      <button type="button" className="text-amber-500 underline" onClick={() => void markResolved(r.id)}>
                        Selesai
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-sm text-zinc-400 mb-2">client_telemetry</h3>
        <div className="overflow-x-auto rounded-xl border border-zinc-800 text-xs">
          <table className="w-full text-left">
            <thead className="text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="p-2">Waktu</th>
                <th className="p-2">Event</th>
                <th className="p-2">Sumber</th>
              </tr>
            </thead>
            <tbody>
              {telemetry.map((r) => (
                <tr key={r.id} className="border-b border-zinc-800/80">
                  <td className="p-2">{r.created_at.slice(0, 19)}</td>
                  <td className="p-2">{r.event_type}</td>
                  <td className="p-2">{r.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
