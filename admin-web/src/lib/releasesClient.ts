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
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json as T;
}

export function fetchReleaseState(platform: string): Promise<ReleaseStatePayload> {
  return invokeEdge<ReleaseStatePayload>(`release-state?platform=${encodeURIComponent(platform)}`, "GET");
}

export function publishNow(input: { platform: string; releaseNotes: string; mandatory: boolean }) {
  return invokeEdge("release-publish", "POST", {
    action: "publish",
    platform: input.platform,
    releaseNotes: input.releaseNotes,
    mandatory: input.mandatory,
  });
}

export function scheduleRelease(input: {
  platform: string;
  releaseNotes: string;
  mandatory: boolean;
  scheduledPublishAt: string;
}) {
  return invokeEdge("release-publish", "POST", {
    action: "schedule",
    platform: input.platform,
    releaseNotes: input.releaseNotes,
    mandatory: input.mandatory,
    scheduledPublishAt: input.scheduledPublishAt,
  });
}

export function rejectStaging(platform: string) {
  return invokeEdge("release-publish", "POST", { action: "reject", platform });
}

export function rollbackRelease(platform: string, version: string) {
  return invokeEdge("release-rollback", "POST", { platform, version });
}
