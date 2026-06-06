// Admin: register staging row from existing Storage object (releases/staging/macfyi-latest.dmg).
import { bootstrapClients, jsonResponse, releaseCors, requireAdminUser } from "../_shared/releaseCore.ts";

const STAGING_OBJECT = "staging/macfyi-latest.dmg";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: releaseCors });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const { url, admin, serviceRole } = await bootstrapClients();
    const auth = await requireAdminUser(req, admin);
    if (!auth.ok) return jsonResponse({ error: auth.error }, auth.status);

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      /* optional body */
    }

    const platform = String(body.platform ?? "macos-arm64").trim() || "macos-arm64";
    if (platform !== "macos-arm64") {
      return jsonResponse(
        {
          error: "platform_not_supported",
          message: "Saat ini hanya macos-arm64 yang didukung build CI.",
        },
        400
      );
    }

    const version = String(body.version ?? "0.2.0").trim() || "0.2.0";

    const head = await fetch(`${url}/storage/v1/object/releases/${STAGING_OBJECT}`, {
      method: "HEAD",
      headers: { Authorization: `Bearer ${serviceRole}` },
    });
    if (head.status === 404) {
      return jsonResponse(
        {
          error: "staging_file_missing",
          message: `File tidak ditemukan di Storage: releases/${STAGING_OBJECT}. Jalankan workflow GitHub "Upload DMG to Supabase" dulu.`,
        },
        404
      );
    }
    if (!head.ok) {
      return jsonResponse({ error: "storage_head_failed", status: head.status }, 500);
    }

    const fileSize = Number(head.headers.get("content-length") ?? "0") || null;

    await admin.from("release_state").delete().eq("environment", "staging").eq("platform", platform);

    const { error: insErr } = await admin.from("release_state").insert({
      environment: "staging",
      version,
      platform,
      storage_path: `releases/${STAGING_OBJECT}`,
      file_size: fileSize,
      checksum: null,
      release_notes: null,
      is_mandatory: false,
      scheduled_publish_at: null,
    });
    if (insErr) return jsonResponse({ error: "insert_failed", detail: insErr.message }, 500);

    return jsonResponse({
      ok: true,
      platform,
      version,
      storage_path: `releases/${STAGING_OBJECT}`,
      file_size: fileSize,
    });
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "server_error" }, 500);
  }
});
