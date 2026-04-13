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
