/** Primary navigation targets in the Macfyi shell (not URL routes). */
export type FeatureId =
  | "smart-care"
  | "cleanup"
  | "my-clutter"
  | "uninstaller"
  | "user-trash"
  | "monitor"
  | "performance"
  | "disk-explorer"
  | "history"
  | "settings";

/** Special sidebar row that opens the AI panel instead of switching feature. */
export const AI_SIDEBAR_ID = "ai-open" as const;
export type AISidebarId = typeof AI_SIDEBAR_ID;
export type SidebarNavId = FeatureId | AISidebarId;
