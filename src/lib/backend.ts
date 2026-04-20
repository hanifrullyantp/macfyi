import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  FileItem,
  ScanResult,
  StorageEntry,
  AppInfo,
  ShellProbe,
  FilePreview,
  ScanProgress,
  UninstallAppEntry,
  TrashListItem,
  AiRequest,
} from "../types";
import type { DiskExplorerFileInfo, DiskExplorerVolume, DiskNode } from "./types/diskExplorer";

export interface DiskStats {
  free_gb: number;
  total_gb: number;
  mount_path: string;
}

export interface TrashResult {
  freed_label: string;
  freed_bytes: number;
  succeeded: string[];
  failed: { path: string; message: string }[];
}

// --- Local AI (Tauri commands) ---
export type AiModelId = "lite" | "better";

export type AiStatus = {
  enabled: boolean;
  selectedModel: AiModelId;
  liteInstalled: boolean;
  betterInstalled: boolean;
  downloadInProgress: boolean;
  panelOpen: boolean;
  memoryPressureHigh: boolean;
};

export type AiDownloadProgress = {
  modelId: AiModelId;
  fileName: string;
  bytesDownloaded: number;
  bytesTotal: number;
  pct: number;
};

export type AiRuntimeStatus = {
  state: "Unloaded" | "Loading" | "Loaded" | "Generating" | string;
  modelId: string;
  port?: number | null;
};

export type AiVerifyResult = {
  modelId: AiModelId;
  ok: boolean;
};

interface FileItemRaw {
  id: string;
  name: string;
  path: string;
  size: number;
  lastAccessed: string;
  isDuplicate: boolean;
  aiSafetyScore: number;
  category: FileItem["category"];
  recommended: boolean;
  reason?: string;
  fileType?: string;
  rootFolder?: string;
}

interface ScanResultRaw {
  category: string;
  items: FileItemRaw[];
  safety_level: ScanResult["safety_level"];
  space_to_free: string;
  recommendation: string;
  confidence: number;
}

function normalizeFileItem(raw: FileItemRaw): FileItem {
  return {
    ...raw,
    lastAccessed: new Date(raw.lastAccessed),
    fileType: raw.fileType as FileItem["fileType"],
  };
}

function normalizeScanResults(raw: ScanResultRaw[]): ScanResult[] {
  return raw.map((r) => ({
    ...r,
    items: r.items.map(normalizeFileItem),
  }));
}

// --- Disk ---
export async function getDiskStats(): Promise<DiskStats> {
  try {
    return await invoke<DiskStats>("get_disk_stats");
  } catch {
    if (import.meta.env.DEV) return { free_gb: 45.2, total_gb: 500, mount_path: "/" };
    throw new Error("Disk stats require the Macfyi desktop app.");
  }
}

// --- Storage Breakdown ---
export async function getStorageBreakdown(): Promise<StorageEntry[]> {
  try {
    return await invoke<StorageEntry[]>("storage_breakdown");
  } catch {
    if (import.meta.env.DEV) {
      return [
        { name: "Applications", path: "/Applications", sizeBytes: 22_680_000_000, iconHint: "app" },
        { name: "Documents", path: "~/Documents", sizeBytes: 12_840_000_000, iconHint: "doc" },
        { name: "Downloads", path: "~/Downloads", sizeBytes: 8_200_000_000, iconHint: "download" },
        { name: "Caches", path: "~/Library/Caches", sizeBytes: 5_400_000_000, iconHint: "cache" },
        { name: "Music", path: "~/Music", sizeBytes: 145_700_000, iconHint: "audio" },
        { name: "Pictures", path: "~/Pictures", sizeBytes: 3_100_000_000, iconHint: "image" },
      ];
    }
    throw new Error("Storage breakdown unavailable");
  }
}

// --- Deep Scan ---
export async function deepScan(): Promise<ScanResult[]> {
  try {
    const raw = await invoke<ScanResultRaw[]>("deep_scan");
    return normalizeScanResults(raw);
  } catch (e) {
    if (import.meta.env.DEV) {
      const { analyzeFiles } = await import("./ai-engine");
      return analyzeFiles();
    }
    throw e;
  }
}

export async function cancelScan(): Promise<void> {
  try {
    await invoke<void>("cancel_scan");
  } catch {
    /* ok */
  }
}

export function onScanProgress(
  callback: (payload: ScanProgress) => void
): Promise<UnlistenFn> {
  return listen<ScanProgress>("scan_progress", (event) => {
    callback(event.payload);
  });
}

export async function aiStatus(): Promise<AiStatus> {
  return await invoke<AiStatus>("ai_status");
}

export async function aiEnable(enabled: boolean): Promise<void> {
  await invoke<void>("ai_enable", { enabled });
}

export async function aiSetModel(modelId: AiModelId): Promise<void> {
  await invoke<void>("ai_set_model", { modelId });
}

export async function aiDownloadModel(modelId: AiModelId): Promise<void> {
  await invoke<void>("ai_download_model", { modelId });
}

export async function aiCancelDownload(): Promise<void> {
  await invoke<void>("ai_cancel_download");
}

export async function aiDeleteModel(modelId?: AiModelId): Promise<void> {
  await invoke<void>("ai_delete_model", { modelId });
}

export async function aiModelsDir(): Promise<string> {
  return await invoke<string>("ai_models_dir");
}

export async function aiVerifyModel(modelId: AiModelId): Promise<AiVerifyResult> {
  return await invoke<AiVerifyResult>("ai_verify_model", { modelId });
}

export async function aiOpenPanel(): Promise<void> {
  await invoke<void>("ai_open_panel");
}

export async function aiClosePanel(): Promise<void> {
  await invoke<void>("ai_close_panel");
}

export async function aiCancelGeneration(): Promise<void> {
  await invoke<void>("ai_cancel_generation");
}

export function onAiDownloadProgress(callback: (p: AiDownloadProgress) => void): Promise<UnlistenFn> {
  return listen<AiDownloadProgress>("ai:download_progress", (event) => callback(event.payload));
}

export function onAiToken(callback: (token: { text: string }) => void): Promise<UnlistenFn> {
  return listen<{ text: string }>("ai:token", (event) => callback(event.payload));
}

export async function aiRuntimeStatus(): Promise<AiRuntimeStatus> {
  return await invoke<AiRuntimeStatus>("ai_runtime_status");
}

export async function aiGenerate(request: AiRequest): Promise<void> {
  await invoke<void>("ai_generate", {
    request: {
      questionType: request.questionType,
      customQuestion: request.customQuestion,
      itemContext: request.itemContext,
    },
  });
}

// --- App Audit ---
export async function appAudit(): Promise<AppInfo[]> {
  try {
    return await invoke<AppInfo[]>("app_audit");
  } catch {
    if (import.meta.env.DEV) return [];
    throw new Error("App audit unavailable");
  }
}

export async function listUninstallApps(): Promise<UninstallAppEntry[]> {
  try {
    return await invoke<UninstallAppEntry[]>("list_uninstall_apps");
  } catch {
    if (import.meta.env.DEV) return [];
    throw new Error("Uninstaller requires the Macfyi desktop app.");
  }
}

// --- Orphan Detect ---
export async function orphanDetect(): Promise<FileItem[]> {
  try {
    const raw = await invoke<FileItemRaw[]>("orphan_detect");
    return raw.map(normalizeFileItem);
  } catch {
    if (import.meta.env.DEV) return [];
    throw new Error("Orphan detection unavailable");
  }
}

export async function removeOrphanPaths(paths: string[], useTrash: boolean): Promise<TrashResult> {
  return await invoke<TrashResult>("remove_orphan_paths", { paths, use_trash: useTrash });
}

export async function uninstallAppBundle(
  appPath: string,
  bundleId: string,
  relatedPaths: string[],
  useTrash: boolean
): Promise<TrashResult> {
  return await invoke<TrashResult>("uninstall_app_bundle", {
    app_path: appPath,
    bundle_id: bundleId,
    related_paths: relatedPaths,
    use_trash: useTrash,
  });
}

// --- Shell Probe ---
export async function shellProbe(): Promise<ShellProbe[]> {
  try {
    return await invoke<ShellProbe[]>("shell_probe");
  } catch {
    if (import.meta.env.DEV) return [];
    throw new Error("Shell probe unavailable");
  }
}

const PREVIEW_TIMEOUT_MS = 5000;

// --- File Preview ---
export async function filePreview(path: string): Promise<FilePreview> {
  try {
    return await Promise.race([
      invoke<FilePreview>("file_preview", { path }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Preview timed out")), PREVIEW_TIMEOUT_MS)
      ),
    ]);
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn("[dev] file_preview", e);
      return {
        path,
        mimeHint: "text/plain",
        textContent: "Dev mode: use the desktop app for real file previews.",
        base64Image: null,
        size: 0,
        modified: new Date().toISOString(),
      };
    }
    throw e instanceof Error ? e : new Error(String(e));
  }
}

// --- Reveal in Finder ---
export async function revealInFinder(path: string): Promise<void> {
  try {
    await invoke<void>("reveal_in_finder", { path });
  } catch {
    if (import.meta.env.DEV) {
      console.info("[dev] reveal_in_finder skipped");
    }
  }
}

// --- Trash ---
export async function movePathsToTrash(paths: string[]): Promise<TrashResult> {
  try {
    return await invoke<TrashResult>("move_paths_to_trash", { paths });
  } catch {
    if (import.meta.env.DEV) {
      return { freed_label: "0 MB", freed_bytes: 0, succeeded: paths, failed: [] };
    }
    throw new Error("Trash operation failed");
  }
}

export async function deletePathsPermanently(paths: string[]): Promise<TrashResult> {
  try {
    return await invoke<TrashResult>("delete_paths_permanently", { paths });
  } catch {
    if (import.meta.env.DEV) {
      return { freed_label: "0 MB", freed_bytes: 0, succeeded: paths, failed: [] };
    }
    throw new Error("Permanent delete failed");
  }
}

export async function openUserTrash(): Promise<void> {
  try {
    await invoke<void>("open_user_trash");
  } catch {
    if (import.meta.env.DEV) console.info("[dev] open_user_trash skipped");
  }
}

export async function listTrashItems(): Promise<TrashListItem[]> {
  return await invoke<TrashListItem[]>("list_trash_items");
}

export async function emptyTrash(): Promise<TrashResult> {
  try {
    return await invoke<TrashResult>("empty_trash");
  } catch {
    if (import.meta.env.DEV) {
      return { freed_label: "0 MB", freed_bytes: 0, succeeded: [], failed: [] };
    }
    throw new Error("Empty trash failed");
  }
}

// --- Performance (sysinfo + macOS LaunchAgents) ---

export interface MemorySnapshot {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
}

export interface ProcessMemoryInfo {
  pid: number;
  name: string;
  memoryBytes: number;
}

export interface LaunchAgentInfo {
  fileName: string;
  label: string | null;
  program: string | null;
}

export async function getMemorySnapshot(): Promise<MemorySnapshot> {
  try {
    return await invoke<MemorySnapshot>("get_memory_snapshot");
  } catch {
    if (import.meta.env.DEV) {
      return {
        totalBytes: 16 * 1024 ** 3,
        usedBytes: 10 * 1024 ** 3,
        availableBytes: 6 * 1024 ** 3,
      };
    }
    throw new Error("Memory snapshot unavailable");
  }
}

export async function getTopProcesses(limit: number): Promise<ProcessMemoryInfo[]> {
  try {
    return await invoke<ProcessMemoryInfo[]>("get_top_processes", { limit });
  } catch {
    if (import.meta.env.DEV) {
      return [
        { pid: 1, name: "kernel_task", memoryBytes: 120 * 1024 ** 2 },
        { pid: 882, name: "Macfyi", memoryBytes: 80 * 1024 ** 2 },
      ];
    }
    throw new Error("Process list unavailable");
  }
}

export async function listLaunchAgents(): Promise<LaunchAgentInfo[]> {
  try {
    return await invoke<LaunchAgentInfo[]>("list_launch_agents");
  } catch {
    if (import.meta.env.DEV) return [];
    throw new Error("Launch agents unavailable");
  }
}

export async function runMaintenance(kind: "dns" | "verify" | "spotlight"): Promise<string> {
  try {
    return await invoke<string>("run_maintenance", { kind });
  } catch (e) {
    if (import.meta.env.DEV) return `[dev] maintenance ${kind} skipped`;
    throw e instanceof Error ? e : new Error(String(e));
  }
}

export async function openLoginItemsSettings(): Promise<void> {
  try {
    await invoke<void>("open_login_items_settings");
  } catch {
    if (import.meta.env.DEV) console.info("[dev] open_login_items_settings skipped");
  }
}

export async function forceCloseProcess(pid: number): Promise<string> {
  try {
    return await invoke<string>("force_close_process", { pid });
  } catch (e) {
    if (import.meta.env.DEV) return `[dev] would send SIGKILL to ${pid}`;
    throw e instanceof Error ? e : new Error(String(e));
  }
}

export interface DeviceFingerprintResult {
  fingerprint: string;
}

export async function getDeviceFingerprint(): Promise<DeviceFingerprintResult> {
  try {
    return await invoke<DeviceFingerprintResult>("get_device_fingerprint");
  } catch (e) {
    if (import.meta.env.DEV) {
      return { fingerprint: "dev-fingerprint" };
    }
    throw e instanceof Error ? e : new Error(String(e));
  }
}

export interface ActivateLicenseResult {
  token: string;
  licenseId: string;
  expiresAt: string | null;
}

export async function activateLicense(
  email: string,
  licenseKey: string,
  apiUrl: string
): Promise<ActivateLicenseResult> {
  const raw = await invoke<Record<string, unknown>>("activate_license", {
    email,
    license_key: licenseKey,
    api_url: apiUrl,
  });
  return {
    token: String(raw.token ?? ""),
    licenseId: String(raw.licenseId ?? raw.license_id ?? ""),
    expiresAt:
      raw.expiresAt != null
        ? String(raw.expiresAt)
        : raw.expires_at != null
          ? String(raw.expires_at)
          : null,
  };
}

// --- Disk Explorer (Tauri; paths stay local — never sent to cloud AI prompts except redacted summaries) ---
export async function diskExplorerCheckFullDiskAccess(): Promise<boolean> {
  try {
    return await invoke<boolean>("check_full_disk_access");
  } catch {
    if (import.meta.env.DEV) return true;
    throw new Error("Full Disk Access check requires the Macfyi desktop app.");
  }
}

export async function diskExplorerOpenFdaSettings(): Promise<void> {
  await invoke<void>("open_fda_system_settings");
}

export async function diskExplorerVolumeStats(): Promise<DiskExplorerVolume> {
  try {
    return await invoke<DiskExplorerVolume>("disk_explorer_volume_stats");
  } catch {
    if (import.meta.env.DEV) {
      return { totalBytes: 500 * 1024 ** 3, usedBytes: 420 * 1024 ** 3, freeBytes: 80 * 1024 ** 3 };
    }
    throw new Error("Volume stats require the Macfyi desktop app.");
  }
}

export async function diskExplorerScanLevel(path: string): Promise<DiskNode[]> {
  try {
    return await invoke<DiskNode[]>("scan_disk_level", { path });
  } catch {
    if (import.meta.env.DEV) {
      return [
        {
          path: `${path}/Caches`,
          displayName: "Caches",
          redactedPath: "~/Library/Caches",
          sizeBytes: 2_100_000_000,
          itemCount: 12,
          children: [],
          nodeType: "Cache",
          riskLevel: "Safe",
          isExpandable: true,
          isAccessible: true,
          lastModified: null,
        },
        {
          path: `${path}/Photos`,
          displayName: "Photos Library.photoslibrary",
          redactedPath: "~/Pictures/Photos Library.photoslibrary",
          sizeBytes: 48_000_000_000,
          itemCount: 0,
          children: [],
          nodeType: "Media",
          riskLevel: "Caution",
          isExpandable: true,
          isAccessible: true,
          lastModified: null,
        },
      ];
    }
    throw new Error("Disk Explorer scan requires the Macfyi desktop app.");
  }
}

export async function diskExplorerMoveNodeToTrash(path: string): Promise<void> {
  await invoke<void>("move_node_to_trash", { path });
}

export async function diskExplorerFileList(path: string, limit: number): Promise<DiskExplorerFileInfo[]> {
  return await invoke<DiskExplorerFileInfo[]>("get_node_file_list", { path, limit });
}

export async function diskExplorerExportReport(nodes: DiskNode[], format: "json" | "txt"): Promise<string> {
  return await invoke<string>("export_scan_report", { nodes, format });
}
