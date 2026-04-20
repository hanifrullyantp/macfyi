/** Mirrors `disk_explorer.rs` DTOs (serde camelCase + PascalCase enums). */

export type DiskExplorerNodeType =
  | "Cache"
  | "Developer"
  | "AppSupport"
  | "Media"
  | "UserData"
  | "System"
  | "Trash"
  | "Downloads"
  | "Application"
  | "Log"
  | "Backup"
  | "Other";

export type DiskExplorerRiskLevel = "Safe" | "Caution" | "Risky" | "Locked";

export type DiskNode = {
  path: string;
  displayName: string;
  redactedPath: string;
  sizeBytes: number;
  itemCount: number;
  children: DiskNode[];
  nodeType: DiskExplorerNodeType;
  riskLevel: DiskExplorerRiskLevel;
  isExpandable: boolean;
  isAccessible: boolean;
  lastModified?: string | null;
};

export type DiskExplorerVolume = {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
};

export type DiskExplorerFileInfo = {
  name: string;
  sizeBytes: number;
  extension: string;
  lastModified: string;
};
