export type SafetyLevel = 'safe' | 'caution' | 'risky';

export type FileCategory =
  | 'cache'
  | 'duplicates'
  | 'large_files'
  | 'backups'
  | 'developer'
  | 'logs'
  | 'downloads_old'
  | 'mail_attachments'
  | 'app_leftovers'
  | 'other';

export type FileType =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'archive'
  | 'code'
  | 'application'
  | 'cache'
  | 'support'
  | 'other';

export interface DuplicateMeta {
  /** When true, duplicate removal targets non-kept copies only */
  keepingNewest?: boolean;
}

export interface FileItem {
  id: string;
  name: string;
  path: string;
  size: number;
  lastAccessed: Date;
  isDuplicate: boolean;
  aiSafetyScore: number;
  category: FileCategory;
  reason?: string;
  recommended: boolean;
  fileType?: FileType;
  rootFolder?: string;
  /** Heuristic app bucket for filters (e.g. CapCut, Xcode) */
  associatedApp?: string;
  associatedBundleId?: string;
  duplicateMeta?: DuplicateMeta;
}

export interface ScanResult {
  category: string;
  items: FileItem[];
  safety_level: SafetyLevel;
  space_to_free: string;
  recommendation: string;
  confidence: number;
}

export interface StorageEntry {
  name: string;
  path: string;
  sizeBytes: number;
  iconHint: string;
}

export interface AppInfo {
  name: string;
  bundleId: string;
  path: string;
  sizeBytes: number;
  lastUsed: string | null;
  hasSupportFiles: boolean;
}

export interface RelatedPathEntry {
  label: string;
  path: string;
  sizeBytes: number;
}

export interface UninstallAppEntry {
  name: string;
  bundleId: string;
  appPath: string;
  appSizeBytes: number;
  lastUsed: string | null;
  related: RelatedPathEntry[];
}

export interface ShellProbe {
  tool: string;
  cachePath: string;
  sizeBytes: number;
  description: string;
}

export interface FilePreview {
  path: string;
  mimeHint: string;
  textContent: string | null;
  base64Image: string | null;
  size: number;
  modified: string;
}

/** Callback after cleanup from ResultsView */
export interface CleanFinishDetail {
  freedBytes: number;
  succeededCount: number;
  failedCount: number;
  mode: "trash" | "permanent";
  sampleNames: string[];
  /** IDs removed on disk; parent drops them from `scanResults` for badges and persist. */
  removedItemIds: string[];
}

/** Drives main orb during Smart Care / results review */
export type ReviewOrbIntent =
  | { kind: "rescan"; onPress: () => void }
  | { kind: "clean"; disabled: boolean; onPress: () => void };

// --- Local AI Assistant (privacy-first) ---
export type AiRiskLabel = "SAFE" | "REVIEW" | "HIGH";
export type AiQuestionType = "what_is_this" | "why_recommended" | "is_it_safe" | "impact" | "custom";

export type AiItemContext = {
  category: string;
  appHint?: string;
  sizeBytes: number;
  riskLabel: AiRiskLabel;
  shortExplanation?: string;
  basenameHint?: string;
};

export type AiRequest = {
  questionType: AiQuestionType;
  customQuestion?: string;
  itemContext: AiItemContext;
};

export interface TrashListItem {
  name: string;
  path: string;
  sizeBytes: number;
}

export interface ScanProgress {
  stage: string;
  /** `walk` | `analyze` | `finalize` from backend */
  phase?: string;
  pct: number;
  filesFound: number;
  itemsFlagged: number;
  /** Truncated path of last inspected file during walk */
  currentPath?: string | null;
}
