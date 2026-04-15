/** Best-effort product telemetry (no full paths in payload). */

function telemetryUrl(): string | null {
  const supabase = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, "");
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!supabase || !anon) return null;
  return `${supabase}/functions/v1/client-telemetry`;
}

export async function sendClientTelemetry(
  event: string,
  payload: Record<string, unknown> = {},
  opts?: { consent?: boolean; source?: string }
): Promise<void> {
  const url = telemetryUrl();
  if (!url) return;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!.trim();
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event,
        payload,
        consent: opts?.consent ?? false,
        source: opts?.source ?? "desktop",
      }),
    });
  } catch {
    /* non-blocking */
  }
}
