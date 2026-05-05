import { invoke } from "@tauri-apps/api/core";

/** Bump when tour content/layout changes so existing users see the new tour. */
export const ONBOARDING_CONTENT_VERSION = 2;

export const STORAGE_FOLDER = "macfyi.scan.customFolder";

export type OnboardingCompleteDetail = {
  source: "last_step" | "skipped";
};

const STORAGE_DONE = "macfyi.onboarding.completed";
const STORAGE_VERSION_KEY = "macfyi.onboarding.contentVersion";

function readLocalVersion(): number {
  try {
    const v = localStorage.getItem(STORAGE_VERSION_KEY);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/** WebKit localStorage only — used for replay/migration fallback in browser builds. */
export function hasCompletedOnboarding(): boolean {
  try {
    if (localStorage.getItem(STORAGE_DONE) !== "1") return false;
    return readLocalVersion() === ONBOARDING_CONTENT_VERSION;
  } catch {
    return false;
  }
}

async function onboardingResetNative(): Promise<void> {
  await invoke<void>("onboarding_reset");
}

async function onboardingSetCompletedNative(version: number): Promise<void> {
  await invoke<void>("onboarding_set_completed", { version });
}

/** Persists completion next to WebView storage (Tauri desktop only). */
export async function persistOnboardingCompletedNative(version: number): Promise<void> {
  try {
    await onboardingSetCompletedNative(version);
  } catch {
    /* not in desktop build or IPC unavailable */
  }
}

async function onboardingSyncNative(
  localCompleted: boolean,
  localVersion: number,
  expectedVersion: number
): Promise<{ should_show: boolean } | null> {
  try {
    return await invoke<{ should_show: boolean }>("onboarding_sync", {
      local_completed: localCompleted,
      local_version: localVersion,
      expected_version: expectedVersion,
    });
  } catch {
    return null;
  }
}

/**
 * Decide whether onboarding should appear (native file + WebView migrate on first desktop run).
 * Call once during splash before revealing the shell.
 */
export async function resolveShowOnboardingForBoot(): Promise<boolean> {
  const expected = ONBOARDING_CONTENT_VERSION;
  const lsDone = typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_DONE) === "1";
  const lv = readLocalVersion();
  const fromLocalFallback = !(lsDone && lv === expected);

  const native = await onboardingSyncNative(lsDone, lv, expected);
  if (native) {
    return native.should_show;
  }

  return fromLocalFallback;
}

export async function resetOnboardingCompletion(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_DONE);
    localStorage.removeItem(STORAGE_VERSION_KEY);
  } catch {
    /* */
  }
  try {
    await onboardingResetNative();
  } catch {
    /* */
  }
}

export function getOnboardingDoneKey(): string {
  return STORAGE_DONE;
}

export function getOnboardingVersionKey(): string {
  return STORAGE_VERSION_KEY;
}
