import {
  bootstrapClients,
  jsonResponse,
  releaseCors,
  requireAdminUser,
  toPublicDownloadUrl,
  writePointer,
} from "../_shared/releaseCore.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: releaseCors });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const { url, admin } = await bootstrapClients();
    const auth = await requireAdminUser(req, admin);
    if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

    const body = (await req.json().catch(() => ({}))) as { platform?: string; version?: string };
    const platform = typeof body.platform === "string" ? body.platform.trim() : "";
    const version = typeof body.version === "string" ? body.version.trim() : "";
    if (!platform || !version) return jsonResponse({ error: "invalid_payload" }, 400);

    const { data: row, error } = await admin
      .from("release_state")
      .select("version, platform, storage_path, release_notes, is_mandatory, published_at")
      .eq("environment", "live")
      .eq("platform", platform)
      .eq("version", version)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (error) return jsonResponse({ error: "query_failed" }, 500);
    if (!row) return jsonResponse({ error: "live_version_not_found" }, 404);

    await writePointer(admin, platform, {
      version: row.version,
      platform: row.platform,
      download_url: toPublicDownloadUrl(url, row.storage_path),
      release_notes: row.release_notes ?? null,
      is_mandatory: row.is_mandatory === true,
      published_at: row.published_at ?? undefined,
    });

    return jsonResponse({ ok: true, version: row.version, platform: row.platform });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "server_error" }, 500);
  }
});
