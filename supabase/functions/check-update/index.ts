import {
  bootstrapClients,
  isNewerVersion,
  isSameMajor,
  jsonResponse,
  readPointer,
  releaseCors,
  toPublicDownloadUrl,
} from "../_shared/releaseCore.ts";

type CheckUpdateRequest = { currentVersion?: string; platform?: string; channel?: "live" | "staging" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: releaseCors });
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  try {
    const { url, admin } = await bootstrapClients();
    const body = (await req.json().catch(() => ({}))) as CheckUpdateRequest;
    const currentVersion = typeof body.currentVersion === "string" ? body.currentVersion.trim() : "";
    const platform = typeof body.platform === "string" ? body.platform.trim() : "";
    const channel = body.channel === "staging" ? "staging" : "live";
    if (!currentVersion || !platform) {
      return jsonResponse({ error: "invalid_payload" }, 400);
    }

    let latestVersion = "";
    let downloadUrl = "";
    let mandatory = false;
    let releaseNotes: string | null = null;

    if (channel === "live") {
      const pointer = await readPointer(url, platform);
      if (!pointer?.version) return jsonResponse({ update: false, channel }, 200);
      latestVersion = pointer.version;
      downloadUrl = pointer.download_url;
      mandatory = pointer.is_mandatory === true;
      releaseNotes = pointer.release_notes ?? null;
    } else {
      const { data: staging, error } = await admin
        .from("release_state")
        .select("version, storage_path, is_mandatory, release_notes")
        .eq("environment", "staging")
        .eq("platform", platform)
        .maybeSingle();
      if (error) return jsonResponse({ error: "query_failed" }, 500);
      if (!staging) return jsonResponse({ update: false, channel }, 200);
      latestVersion = String(staging.version ?? "");
      downloadUrl = toPublicDownloadUrl(url, String(staging.storage_path ?? ""));
      mandatory = staging.is_mandatory === true;
      releaseNotes = staging.release_notes ?? null;
    }

    if (!latestVersion) return jsonResponse({ update: false, channel }, 200);
    const updateAvailable = isNewerVersion(currentVersion, latestVersion);
    const manualOnly = updateAvailable && !isSameMajor(currentVersion, latestVersion);
    return jsonResponse({
      update: updateAvailable,
      latestVersion,
      mandatory,
      downloadUrl,
      releaseNotes,
      manualOnly,
      channel,
    });
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }
});
