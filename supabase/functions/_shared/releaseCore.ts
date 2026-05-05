import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export const releaseCors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

export type ReleaseRow = {
  id: string;
  environment: "staging" | "live";
  version: string;
  platform: string;
  storage_path: string;
  file_size: number | null;
  checksum: string | null;
  release_notes: string | null;
  is_mandatory: boolean;
  scheduled_publish_at: string | null;
  download_count: number;
  created_at: string;
  published_at: string | null;
};

export type ReleasePointer = {
  version: string;
  platform: string;
  download_url: string;
  release_notes?: string | null;
  is_mandatory?: boolean;
  published_at?: string;
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...releaseCors, "Content-Type": "application/json" },
  });
}

export function parseSemver(input: string): [number, number, number] | null {
  const normalized = input.trim().replace(/^v/i, "");
  const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function isNewerVersion(current: string, latest: string): boolean {
  const c = parseSemver(current);
  const l = parseSemver(latest);
  if (!c || !l) return false;
  if (l[0] !== c[0]) return l[0] > c[0];
  if (l[1] !== c[1]) return l[1] > c[1];
  return l[2] > c[2];
}

export function isSameMajor(current: string, latest: string): boolean {
  const c = parseSemver(current);
  const l = parseSemver(latest);
  if (!c || !l) return false;
  return c[0] === l[0];
}

export function toPublicDownloadUrl(baseUrl: string, storagePath: string): string {
  const normalized = storagePath.replace(/^\/+/, "").replace(/^releases\//, "");
  return `${baseUrl}/storage/v1/object/public/releases/${normalized}`;
}

export function pointerPathFor(platform: string): string {
  return `live/current.${platform}.json`;
}

export function storageObjectPathFromReleasePath(path: string): string {
  return path.replace(/^releases\//, "");
}

export function assertCronAuthorized(req: Request): boolean {
  const secret = Deno.env.get("CRON_SECRET")?.trim();
  if (!secret) return false;
  const auth = req.headers.get("Authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (bearer === secret) return true;
  return (req.headers.get("x-cron-secret") ?? "").trim() === secret;
}

export async function bootstrapClients() {
  const url = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY")?.trim() ?? "";
  if (!url || !serviceRole) {
    throw new Error("misconfigured");
  }
  const admin = createClient(url, serviceRole);
  const anonClient = anon ? createClient(url, anon) : null;
  return { url, admin, anonClient };
}

export async function requireAdminUser(req: Request, admin: SupabaseClient): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return { ok: false, status: 401, error: "unauthorized" };
  const { data, error } = await admin.auth.getUser(token);
  if (error || data.user?.app_metadata?.role !== "admin") {
    return { ok: false, status: 403, error: "forbidden" };
  }
  return { ok: true };
}

async function storageCopy(url: string, serviceRole: string, from: string, to: string): Promise<void> {
  const res = await fetch(`${url}/storage/v1/object/copy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bucketId: "releases",
      sourceKey: from,
      destinationKey: to,
      destinationBucket: "releases",
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`storage_copy_failed:${res.status}:${txt}`);
  }
}

export async function storageDelete(url: string, serviceRole: string, objectPath: string): Promise<void> {
  const res = await fetch(`${url}/storage/v1/object/releases/${objectPath}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${serviceRole}` },
  });
  if (!res.ok && res.status !== 404) {
    const txt = await res.text();
    throw new Error(`storage_delete_failed:${res.status}:${txt}`);
  }
}

export async function writePointer(
  url: string,
  serviceRole: string,
  platform: string,
  payload: ReleasePointer
): Promise<void> {
  const path = pointerPathFor(platform);
  const res = await fetch(`${url}/storage/v1/object/releases/${path}?upsert=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`pointer_write_failed:${res.status}:${txt}`);
  }
}

export async function readPointer(url: string, platform: string): Promise<ReleasePointer | null> {
  const path = pointerPathFor(platform);
  const res = await fetch(`${url}/storage/v1/object/public/releases/${path}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`pointer_read_failed:${res.status}`);
  return (await res.json()) as ReleasePointer;
}

export async function publishStagingToLive(params: {
  url: string;
  serviceRole: string;
  admin: SupabaseClient;
  platform: string;
  nowIso?: string;
  notes?: string | null;
  mandatory?: boolean;
}): Promise<{ liveVersion: string; livePath: string }> {
  const { url, serviceRole, admin, platform } = params;
  const nowIso = params.nowIso ?? new Date().toISOString();
  const { data: staging, error: stagingErr } = await admin
    .from("release_state")
    .select("*")
    .eq("environment", "staging")
    .eq("platform", platform)
    .maybeSingle();
  if (stagingErr) throw new Error(`load_staging_failed:${stagingErr.message}`);
  if (!staging) throw new Error("staging_not_found");
  const stage = staging as ReleaseRow;

  const sourceObject = storageObjectPathFromReleasePath(stage.storage_path);
  const arch = platform.includes("arm64") ? "arm64" : "intel";
  const liveObject = `live/${stage.version}/macfyi-${arch}.dmg`;
  const liveStoragePath = `releases/${liveObject}`;

  await storageCopy(url, serviceRole, sourceObject, liveObject);

  const { error: insertErr } = await admin.from("release_state").insert({
    environment: "live",
    version: stage.version,
    platform,
    storage_path: liveStoragePath,
    file_size: stage.file_size,
    checksum: stage.checksum,
    release_notes: params.notes ?? stage.release_notes,
    is_mandatory: params.mandatory ?? stage.is_mandatory,
    published_at: nowIso,
  });
  if (insertErr) throw new Error(`insert_live_failed:${insertErr.message}`);

  const pointerPayload: ReleasePointer = {
    version: stage.version,
    platform,
    download_url: toPublicDownloadUrl(url, liveStoragePath),
    release_notes: params.notes ?? stage.release_notes,
    is_mandatory: params.mandatory ?? stage.is_mandatory,
    published_at: nowIso,
  };
  await writePointer(url, serviceRole, platform, pointerPayload);

  const { error: delStageErr } = await admin
    .from("release_state")
    .delete()
    .eq("environment", "staging")
    .eq("platform", platform);
  if (delStageErr) throw new Error(`delete_staging_failed:${delStageErr.message}`);

  const { data: liveRows, error: liveErr } = await admin
    .from("release_state")
    .select("id, storage_path")
    .eq("environment", "live")
    .eq("platform", platform)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (liveErr) throw new Error(`load_live_failed:${liveErr.message}`);
  const extra = (liveRows ?? []).slice(5) as Array<{ id: string; storage_path: string }>;
  for (const row of extra) {
    await storageDelete(url, serviceRole, storageObjectPathFromReleasePath(row.storage_path));
    const { error: delErr } = await admin.from("release_state").delete().eq("id", row.id);
    if (delErr) throw new Error(`prune_row_failed:${delErr.message}`);
  }

  return { liveVersion: stage.version, livePath: liveStoragePath };
}
