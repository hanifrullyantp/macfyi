/** Mirrors `deletionMode` saved by SettingsPanel in localStorage. */
export type DeletionModeSetting = "trash" | "permanent";

const SETTINGS_KEY = "macfyi_settings";

export function getDeletionMode(): DeletionModeSetting {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return "trash";
    const j = JSON.parse(raw) as { deletionMode?: string };
    return j.deletionMode === "permanent" ? "permanent" : "trash";
  } catch {
    return "trash";
  }
}

/** Merge into `macfyi_settings` without clobbering other keys from SettingsPanel. */
export function setDeletionModePersisted(mode: DeletionModeSetting): void {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const base = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    base.deletionMode = mode;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(base));
  } catch {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ deletionMode: mode }));
    } catch {
      /* */
    }
  }
}
