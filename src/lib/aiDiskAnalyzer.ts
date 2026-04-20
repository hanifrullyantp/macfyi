import type { AiItemContext, AiRequest, AiRiskLabel } from "../types";
import { aiCancelGeneration, aiGenerate, aiStatus, onAiToken } from "./backend";
import { kbAnswer } from "./ai-kb";
import type { DiskExplorerRiskLevel, DiskNode } from "./types/diskExplorer";

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 MB";
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  return `${Math.max(1, Math.round(n / 1024 ** 2))} MB`;
}

export function riskLevelToAiLabel(r: DiskExplorerRiskLevel): AiRiskLabel {
  if (r === "Safe") return "SAFE";
  if (r === "Caution") return "REVIEW";
  return "HIGH";
}

/** Map explorer node types to KB categories used by `kbAnswer`. */
export function nodeTypeToKbCategory(t: DiskNode["nodeType"]): AiItemContext["category"] {
  switch (t) {
    case "Cache":
    case "Log":
      return "cache";
    case "Developer":
      return "developer";
    case "Downloads":
      return "downloads_old";
    case "Backup":
      return "backups";
    case "Application":
      return "app_leftovers";
    case "Media":
    case "UserData":
      return "large_files";
    default:
      return "other";
  }
}

function dominantCategory(nodes: DiskNode[]): string {
  const counts = new Map<string, number>();
  for (const n of nodes) {
    const c = nodeTypeToKbCategory(n.nodeType);
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  let best = "other";
  let max = 0;
  counts.forEach((v, k) => {
    if (v > max) {
      max = v;
      best = k;
    }
  });
  return best;
}

function worstRisk(nodes: DiskNode[]): DiskExplorerRiskLevel {
  const order: DiskExplorerRiskLevel[] = ["Safe", "Caution", "Risky", "Locked"];
  let idx = 0;
  for (const n of nodes) {
    const i = order.indexOf(n.riskLevel);
    if (i > idx) idx = i;
  }
  return order[idx] ?? "Safe";
}

/** Redacted aggregate for prompts — no full filesystem paths. */
export function buildRedactedFolderSummary(nodes: DiskNode[], maxLines = 12): string {
  const sorted = [...nodes].sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, maxLines);
  const total = nodes.reduce((a, n) => a + n.sizeBytes, 0);
  const lines = sorted.map(
    (n) =>
      `- ${n.displayName} · ${formatBytes(n.sizeBytes)} · type ${n.nodeType} · risk ${n.riskLevel} · path hint ${n.redactedPath}`
  );
  return [
    `Ringkasan folder (privasi): ${nodes.length} entri terlihat, total ~${formatBytes(total)}.`,
    "Path absolut tidak disertakan.",
    ...lines,
  ].join("\n");
}

export function calculateSavingsBytes(nodes: DiskNode[], selectedPaths: Set<string>): number {
  let sum = 0;
  for (const n of nodes) {
    if (selectedPaths.has(n.path)) sum += n.sizeBytes;
  }
  return sum;
}

async function canUseLocalAi(): Promise<boolean> {
  try {
    const s = await aiStatus();
    return Boolean(
      s.enabled &&
        !s.memoryPressureHigh &&
        (s.selectedModel === "lite" ? s.liteInstalled : s.betterInstalled)
    );
  } catch {
    return false;
  }
}

/**
 * Disk Explorer insight: local model stream when available, otherwise KB template.
 * Uses only redacted summaries in the custom question body.
 */
export async function analyzeDiskExplorerFolder(nodes: DiskNode[]): Promise<{ text: string; source: "local" | "kb" }> {
  if (nodes.length === 0) {
    return { text: "Tidak ada entri untuk dianalisis.", source: "kb" };
  }

  const summary = buildRedactedFolderSummary(nodes);
  const category = dominantCategory(nodes) as AiItemContext["category"];
  const sizeBytes = nodes.reduce((a, n) => a + n.sizeBytes, 0);
  const itemContext: AiItemContext = {
    category,
    sizeBytes,
    riskLabel: riskLevelToAiLabel(worstRisk(nodes)),
    shortExplanation: summary.slice(0, 400),
    basenameHint: nodes[0]?.displayName,
  };

  const baseReq: AiRequest = {
    questionType: "impact",
    itemContext,
  };

  const useLocal = await canUseLocalAi();
  if (!useLocal) {
    return { text: kbAnswer(baseReq), source: "kb" };
  }

  const req: AiRequest = {
    ...baseReq,
    questionType: "custom",
    customQuestion:
      "Jelaskan pola penggunaan ruang folder ini dan saran aman untuk mengosongkan ruang. " +
      "Jangan minta path penuh; gunakan ringkasan berikut saja:\n\n" +
      summary,
  };

  let acc = "";
  let unlisten: (() => void) | null = null;
  try {
    await aiCancelGeneration().catch(() => {});
    unlisten = await onAiToken((tok) => {
      acc += tok.text;
    });
    const timeoutMs = 55_000;
    await Promise.race([
      aiGenerate(req),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI timeout")), timeoutMs)
      ),
    ]);
  } catch {
    return { text: kbAnswer(baseReq), source: "kb" };
  } finally {
    unlisten?.();
  }

  const trimmed = acc.trim();
  if (!trimmed) {
    return { text: kbAnswer(baseReq), source: "kb" };
  }
  return { text: trimmed, source: "local" };
}
