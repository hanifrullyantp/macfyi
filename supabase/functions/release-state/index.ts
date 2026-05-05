import { bootstrapClients, jsonResponse, releaseCors, requireAdminUser } from "../_shared/releaseCore.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: releaseCors });
  if (req.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const { admin } = await bootstrapClients();
    const auth = await requireAdminUser(req, admin);
    if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

    const url = new URL(req.url);
    const platform = url.searchParams.get("platform")?.trim() || "macos-arm64";

    const [{ data: staging, error: stageErr }, { data: live, error: liveErr }] = await Promise.all([
      admin
        .from("release_state")
        .select("*")
        .eq("environment", "staging")
        .eq("platform", platform)
        .maybeSingle(),
      admin
        .from("release_state")
        .select("*")
        .eq("environment", "live")
        .eq("platform", platform)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    if (stageErr || liveErr) return jsonResponse({ error: "query_failed" }, 500);
    return jsonResponse({ platform, staging: staging ?? null, live: live ?? [] });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "server_error" }, 500);
  }
});
