import { FileItem, ScanResult, SafetyLevel } from "../types";
import type { RiskBand } from "./results-types";
import { redactPaths } from "./redaction";

const MOCK_FILES: FileItem[] = [
  { id: '1', name: 'Browser Cache', path: '~/Library/Caches/Google/Chrome', size: 1200000000, lastAccessed: new Date(), isDuplicate: false, aiSafetyScore: 0.95, category: 'cache', recommended: true },
  { id: '2', name: 'System Temp', path: '~/private/var/folders', size: 800000000, lastAccessed: new Date(), isDuplicate: false, aiSafetyScore: 0.99, category: 'cache', recommended: true },
  { id: '2b', name: 'App Store Cache', path: '~/Library/Caches/com.apple.appstore', size: 450000000, lastAccessed: new Date(), isDuplicate: false, aiSafetyScore: 0.94, category: 'cache', recommended: true },
  
  { id: '3', name: 'Vacation Duplicate 1', path: '~/Desktop/Beach.jpg', size: 1200000, lastAccessed: new Date(Date.now() - 90*24*60*60*1000), isDuplicate: true, aiSafetyScore: 0.98, category: 'duplicates', recommended: true },
  { id: '4', name: 'Vacation Photo Original', path: '~/Pictures/Beach.jpg', size: 2100000, lastAccessed: new Date(), isDuplicate: false, aiSafetyScore: 0.20, category: 'duplicates', recommended: false },
  { id: '4b', name: 'Project_Final_v2.mp4', path: '~/Downloads/Project_Final_v2.mp4', size: 1450000000, lastAccessed: new Date(Date.now() - 10*24*60*60*1000), isDuplicate: true, aiSafetyScore: 0.88, category: 'duplicates', recommended: true },
  
  { id: '5', name: 'iPhone Backup 2023-10', path: '~/MobileSync/Backup/old-1', size: 4500000000, lastAccessed: new Date(Date.now() - 120*24*60*60*1000), isDuplicate: false, aiSafetyScore: 0.92, category: 'backups', recommended: true },
  { id: '5b', name: 'Old iCloud Archive', path: '~/Documents/iCloud_Old.zip', size: 2300000000, lastAccessed: new Date(Date.now() - 200*24*60*60*1000), isDuplicate: false, aiSafetyScore: 0.96, category: 'backups', recommended: true },
  
  { id: '6', name: 'Xcode Derived Data', path: '~/Library/Developer/Xcode/DerivedData', size: 3200000000, lastAccessed: new Date(Date.now() - 60*24*60*60*1000), isDuplicate: false, aiSafetyScore: 0.88, category: 'large_files', recommended: true },
  { id: '6b', name: 'Node Modules Junk', path: '~/Projects/test-app/node_modules', size: 1200000000, lastAccessed: new Date(Date.now() - 30*24*60*60*1000), isDuplicate: false, aiSafetyScore: 0.75, category: 'large_files', recommended: true },
];

export const analyzeFiles = (files: FileItem[] = MOCK_FILES): ScanResult[] => {
  const categories: Record<string, FileItem[]> = {
    cache: [],
    duplicates: [],
    large_files: [],
    backups: [],
  };

  files.forEach((file) => {
    if (categories[file.category]) {
      categories[file.category].push(file);
    }
  });

  return Object.entries(categories).map(([category, items]) => {
    const totalSize = items.reduce((acc, cur) => acc + cur.size, 0);
    let spaceToFree = '';
    
    if (totalSize > 1024 * 1024 * 1024) {
      spaceToFree = (totalSize / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    } else {
      spaceToFree = (totalSize / (1024 * 1024)).toFixed(0) + ' MB';
    }

    let safetyLevel: SafetyLevel = 'safe';
    let recommendation = 'Safe to remove - backups available';
    let confidence = 0.95;

    if (category === 'duplicates') {
      recommendation = 'AI identified older versions of high-quality files. Keeping the best version.';
      confidence = 0.98;
    } else if (category === 'large_files') {
      safetyLevel = 'caution';
      recommendation = 'These large folders haven\'t been accessed in over 30 days. Consider archiving.';
      confidence = 0.85;
    } else if (category === 'backups') {
      safetyLevel = 'caution';
      recommendation = 'Redundant backups from previous years. AI recommends removal as they exist in cloud.';
      confidence = 0.90;
    } else if (category === 'cache') {
      recommendation = 'Safe system and application caches. Will be rebuilt on next launch.';
      confidence = 0.99;
    }

    return {
      category,
      items,
      safety_level: safetyLevel,
      space_to_free: spaceToFree,
      recommendation,
      confidence,
    };
  });
};

/** Category-level stats only — no file paths (Issue 13). */
export function summarizeScanPrivacySafe(summary: ScanResult[] | null | undefined): string {
  if (!summary?.length) {
    return "No scan loaded yet. Run Smart Scan to get category totals.";
  }
  return summary
    .map((s) => {
      const n = s.items.length;
      return `• ${s.category.replace(/_/g, " ")}: ${n} item(s), ~${s.space_to_free} reclaimable, band ${s.safety_level}`;
    })
    .join("\n");
}

/** Inspector side panel — metadata only, no full paths (Issue 13). */
export function privacySafeItemInsight(input: {
  name: string;
  categoryKey: string;
  fileType?: string;
  risk: RiskBand;
  recommended: boolean;
}): string {
  const kind = input.fileType ?? "file";
  const rec = input.recommended ? "flagged as recommended for cleanup" : "not in the recommended set";
  return (
    `For a ${kind} in category “${input.categoryKey.replace(/_/g, " ")}” ` +
    `(${input.risk} risk, ${rec}): typical impact is ${riskHint(input.risk)}. ` +
    `Filename “${redactPaths(input.name)}” is only a label here — paths are not sent to the assistant.`
  );
}

function riskHint(risk: RiskBand): string {
  if (risk === "safe") return "usually safe to remove";
  if (risk === "caution") return "review before removing";
  return "high caution — confirm you have backups";
}

export const chatAssistantResponse = (
  userMessage: string,
  scanSummary?: ScanResult[] | null,
  selectionNote?: string | null
) => {
  const msg = userMessage.toLowerCase();
  const recap = summarizeScanPrivacySafe(scanSummary);
  const sel =
    selectionNote && selectionNote.length > 0 ? `\nCurrent selection (counts only): ${selectionNote}\n` : "";

  if (msg.includes("summary") || msg.includes("scan") || msg.includes("result")) {
    return {
      text: `Latest scan overview (metadata only — no paths):\n${recap}${sel}`,
      actions: [] as string[],
    };
  }

  if (msg.includes("why") && msg.includes("storage")) {
    return {
      text: `From your last scan (totals only):\n${recap}${sel}\nCaches are usually the safest wins; backups need a human check.`,
      actions: ["Open Smart Scan", "Show categories"],
    };
  }

  if (msg.includes("backup")) {
    return {
      text: "Backups can be large. Review each item in the app before moving to Trash. Category metadata is shared here, not full paths.",
      actions: ["Show scan summary"],
    };
  }

  return {
    text: `I use category-level scan stats only (no paths). ${sel}\nAsk for a summary or say “why is my storage full.”`,
    actions: [],
  };
};
