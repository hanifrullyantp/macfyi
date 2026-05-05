import {
  assertCronAuthorized,
  bootstrapClients,
  jsonResponse,
  publishStagingToLive,
  releaseCors,
} from "../_shared/releaseCore.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: releaseCors });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
  if (!assertCronAuthorized(req)) return jsonResponse({ error: "unauthorized" }, 401);

  try {
    const { url, admin } = await bootstrapClients();
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const nowIso = new Date().toISOString();
    const { data: dueRows, error } = await admin
      .from("release_state")
      .select("platform")
      .eq("environment", "staging")
      .not("scheduled_publish_at", "is", null)
      .lte("scheduled_publish_at", nowIso)
      .limit(20);
    if (error) return jsonResponse({ error: "query_failed" }, 500);

    let published = 0;
    const failed: string[] = [];
    for (const row of dueRows ?? []) {
      const platform = String(row.platform ?? "").trim();
      if (!platform) continue;
      try {
        await publishStagingToLive({
          url,
          serviceRole,
          admin,
          platform,
          nowIso,
        });
        published += 1;
      } catch (e) {
        failed.push(`${platform}:${e instanceof Error ? e.message : "error"}`);
      }
    }

    return jsonResponse({ ok: true, at: nowIso, published, failed });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "server_error" }, 500);
  }
});
