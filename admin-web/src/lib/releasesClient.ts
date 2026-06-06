import { supabase } from "../supabase";

export type ReleaseStateRow = {
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

export type ReleaseStatePayload = {
  platform: string;
  staging: ReleaseStateRow | null;
  live: ReleaseStateRow[];
};

const STAGING_OBJECT = "staging/macfyi-latest.dmg";
const DEFAULT_VERSION = "0.2.0";

async function invokeEdge<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("No active admin session");
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        json.message ??
          "Edge function belum di-deploy. Jalankan: supabase login && bash scripts/supabase-release.sh"
      );
    }
    throw new Error(json.message ?? json.error ?? "Request failed");
  }
  return json as T;
}

export async function fetchReleaseState(platform: string): Promise<ReleaseStatePayload> {
  const [{ data: staging, error: stageErr }, { data: live, error: liveErr }] = await Promise.all([
    supabase
      .from("release_state")
      .select("*")
      .eq("environment", "staging")
      .eq("platform", platform)
      .maybeSingle(),
    supabase
      .from("release_state")
      .select("*")
      .eq("environment", "live")
      .eq("platform", platform)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  if (stageErr) {
    if (stageErr.code === "PGRST205" || stageErr.message.includes("release_state")) {
      throw new Error(
        "Tabel release_state belum ada. Jalankan migrasi SQL di Supabase Dashboard atau: supabase db push"
      );
    }
    throw new Error(stageErr.message);
  }
  if (liveErr) throw new Error(liveErr.message);
  return { platform, staging: (staging as ReleaseStateRow | null) ?? null, live: (live ?? []) as ReleaseStateRow[] };
}

export function publishNow(input: { platform: string; releaseNotes: string; mandatory: boolean }) {
  return invokeEdge("release-publish", "POST", {
    action: "publish",
    platform: input.platform,
    releaseNotes: input.releaseNotes,
    mandatory: input.mandatory,
  });
}

export async function scheduleRelease(input: {
  platform: string;
  releaseNotes: string;
  mandatory: boolean;
  scheduledPublishAt: string;
}) {
  const { error } = await supabase
    .from("release_state")
    .update({
      scheduled_publish_at: input.scheduledPublishAt,
      release_notes: input.releaseNotes,
      is_mandatory: input.mandatory,
    })
    .eq("environment", "staging")
    .eq("platform", input.platform);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function rejectStaging(platform: string) {
  const { error } = await supabase
    .from("release_state")
    .delete()
    .eq("environment", "staging")
    .eq("platform", platform);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export function rollbackRelease(platform: string, version: string) {
  return invokeEdge("release-rollback", "POST", { platform, version });
}

export async function syncStagingFromStorage(platform: string, version = DEFAULT_VERSION) {
  if (platform !== "macos-arm64") {
    throw new Error("Saat ini hanya macos-arm64 yang didukung build CI.");
  }

  const base = String(import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
  const publicUrl = `${base}/storage/v1/object/public/releases/${STAGING_OBJECT}`;
  const res = await fetch(publicUrl, { method: "GET", headers: { Range: "bytes=0-0" } });
  if (!res.ok) {
    throw new Error(
      "DMG belum ada di Storage (releases/staging/macfyi-latest.dmg). Jalankan GitHub Actions → Upload DMG to Supabase."
    );
  }

  const fileSize = Number(res.headers.get("content-length") ?? "0") || null;

  const { error: delErr } = await supabase
    .from("release_state")
    .delete()
    .eq("environment", "staging")
    .eq("platform", platform);
  if (delErr) throw new Error(delErr.message);

  const { error: insErr } = await supabase.from("release_state").insert({
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
  if (insErr) throw new Error(insErr.message);

  return { ok: true as const, platform, version, file_size: fileSize };
}
