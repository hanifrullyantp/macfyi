import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

const UPDATE_DISMISS_KEY = "macfyi.update.dismissed_version";
const UPDATE_FAILED_KEY = "macfyi.update.failed_version";

export type Semver = { major: number; minor: number; patch: number };

export type CheckUpdateResponse = {
  update: boolean;
  latestVersion?: string;
  mandatory?: boolean;
  downloadUrl?: string;
  releaseNotes?: string | null;
  manualOnly?: boolean;
  channel?: "live" | "staging";
};

export type UpdateCheckResult = {
  updateAvailable: boolean;
  currentVersion: string;
  platform: string;
  latestVersion: string | null;
  mandatory: boolean;
  downloadUrl: string | null;
  releaseNotes: string | null;
  manualOnly: boolean;
  channel: "live" | "staging";
};

export type UpdateProgress = {
  phase: "download" | "install" | "relaunch" | "done" | "error";
  pct: number;
  message: string;
};

function parseSemver(input: string): Semver | null {
  const normalized = input.trim().replace(/^v/i, "");
  const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function isNewerVersion(current: string, latest: string): boolean {
  const c = parseSemver(current);
  const l = parseSemver(latest);
  if (!c || !l) return false;
  if (l.major !== c.major) return l.major > c.major;
  if (l.minor !== c.minor) return l.minor > c.minor;
  return l.patch > c.patch;
}

export function isSameMajor(current: string, latest: string): boolean {
  const c = parseSemver(current);
  const l = parseSemver(latest);
  if (!c || !l) return false;
  return c.major === l.major;
}

export function evaluateUpdatePolicy(
  currentVersion: string,
  latestVersion: string
): { updateAvailable: boolean; manualOnly: boolean } {
  const updateAvailable = isNewerVersion(currentVersion, latestVersion);
  const manualOnly = updateAvailable && !isSameMajor(currentVersion, latestVersion);
  return { updateAvailable, manualOnly };
}

function getEdgeFunctionBase(): string | null {
  const base = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
  if (!base) return null;
  return `${base.replace(/\/+$/, "")}/functions/v1/check-update`;
}

function getUpdateChannel(): "live" | "staging" {
  const c = (import.meta.env.VITE_UPDATE_CHANNEL ?? "live").toString().trim().toLowerCase();
  return c === "staging" ? "staging" : "live";
}

export async function checkForUpdate(): Promise<UpdateCheckResult | null> {
  const endpoint = getEdgeFunctionBase();
  if (!endpoint) return null;
  const currentVersion = await invoke<string>("get_app_version");
  const platform = await invoke<string>("get_platform");
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentVersion, platform, channel: getUpdateChannel() }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as CheckUpdateResponse;
  const latestVersion = (data.latestVersion ?? "").trim() || null;
  const downloadUrl = (data.downloadUrl ?? "").trim() || null;
  const policy = latestVersion
    ? evaluateUpdatePolicy(currentVersion, latestVersion)
    : { updateAvailable: false, manualOnly: false };
  return {
    updateAvailable: policy.updateAvailable,
    currentVersion,
    platform,
    latestVersion,
    mandatory: data.mandatory === true,
    downloadUrl,
    releaseNotes: data.releaseNotes ?? null,
    manualOnly: data.manualOnly === true ? true : policy.manualOnly,
    channel: data.channel === "staging" ? "staging" : "live",
  };
}

export async function installCustomUpdate(downloadUrl: string): Promise<void> {
  await invoke<void>("download_and_install_update", { url: downloadUrl });
}

export async function trackReleaseDownload(version: string, platform: string): Promise<void> {
  const base = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!base || !anon || !version || !platform) return;
  await fetch(`${base.replace(/\/+$/, "")}/functions/v1/release-track-download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
    body: JSON.stringify({ version, platform }),
  }).catch(() => undefined);
}

export function onUpdateProgress(callback: (payload: UpdateProgress) => void): Promise<UnlistenFn> {
  return listen<UpdateProgress>("update-progress", (event) => {
    callback(event.payload);
  });
}

export function loadDismissedVersion(): string | null {
  return localStorage.getItem(UPDATE_DISMISS_KEY);
}

export function markDismissedVersion(version: string): void {
  localStorage.setItem(UPDATE_DISMISS_KEY, version);
}

export function loadFailedVersion(): string | null {
  return localStorage.getItem(UPDATE_FAILED_KEY);
}

export function markFailedVersion(version: string): void {
  localStorage.setItem(UPDATE_FAILED_KEY, version);
}

export function clearFailedVersion(version: string): void {
  const current = localStorage.getItem(UPDATE_FAILED_KEY);
  if (current === version) localStorage.removeItem(UPDATE_FAILED_KEY);
}
