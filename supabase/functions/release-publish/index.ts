import {
  bootstrapClients,
  jsonResponse,
  releaseCors,
  requireAdminUser,
  publishStagingToLive,
} from "../_shared/releaseCore.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: releaseCors });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const { url, admin } = await bootstrapClients();
    const auth = await requireAdminUser(req, admin);
    if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = (await req.json().catch(() => ({}))) as {
      action?: "publish" | "schedule" | "reject";
      platform?: string;
      releaseNotes?: string | null;
      mandatory?: boolean;
      scheduledPublishAt?: string | null;
    };
    const action = body.action ?? "publish";
    const platform = typeof body.platform === "string" ? body.platform.trim() : "";
    if (!platform) return jsonResponse({ error: "invalid_platform" }, 400);

    if (action === "schedule") {
      const scheduledPublishAt =
        typeof body.scheduledPublishAt === "string" && body.scheduledPublishAt.trim().length > 0
          ? body.scheduledPublishAt.trim()
          : null;
      if (!scheduledPublishAt) return jsonResponse({ error: "invalid_schedule" }, 400);
      const { error: upErr } = await admin
        .from("release_state")
        .update({
          scheduled_publish_at: scheduledPublishAt,
          release_notes: body.releaseNotes ?? null,
          is_mandatory: body.mandatory === true,
        })
        .eq("environment", "staging")
        .eq("platform", platform);
      if (upErr) return jsonResponse({ error: "schedule_failed" }, 500);
      return jsonResponse({ ok: true, action: "schedule", scheduledPublishAt });
    }

    if (action === "reject") {
      const { error: delErr } = await admin
        .from("release_state")
        .delete()
        .eq("environment", "staging")
        .eq("platform", platform);
      if (delErr) return jsonResponse({ error: "reject_failed" }, 500);
      return jsonResponse({ ok: true, action: "reject" });
    }

    const out = await publishStagingToLive({
      url,
      serviceRole,
      admin,
      platform,
      notes: body.releaseNotes ?? null,
      mandatory: body.mandatory === true,
    });
    return jsonResponse({ ok: true, action: "publish", ...out });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "server_error" }, 500);
  }
});
