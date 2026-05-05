import { bootstrapClients, jsonResponse, releaseCors } from "../_shared/releaseCore.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: releaseCors });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const { admin } = await bootstrapClients();
    const body = (await req.json().catch(() => ({}))) as { platform?: string; version?: string };
    const platform = typeof body.platform === "string" ? body.platform.trim() : "";
    const version = typeof body.version === "string" ? body.version.trim() : "";
    if (!platform || !version) return jsonResponse({ error: "invalid_payload" }, 400);

    const { error } = await admin.rpc("increment_release_download_count", {
      p_environment: "live",
      p_platform: platform,
      p_version: version,
    });
    if (error) {
      const { data: row, error: rowErr } = await admin
        .from("release_state")
        .select("id, download_count")
        .eq("environment", "live")
        .eq("platform", platform)
        .eq("version", version)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (rowErr || !row) return jsonResponse({ error: "row_not_found" }, 404);
      const { error: upErr } = await admin
        .from("release_state")
        .update({ download_count: Number(row.download_count ?? 0) + 1 })
        .eq("id", row.id);
      if (upErr) return jsonResponse({ error: "update_failed" }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "server_error" }, 500);
  }
});
