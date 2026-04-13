import type { FileItem, SafetyLevel } from "../types";

/**
 * UI-oriented safety classification from path/name heuristics.
 * Complements backend `safety_level` / AI scores for Safe vs Advanced modes.
 */
export function classifyPathRisk(item: FileItem): SafetyLevel {
  const p = item.path;
  const lower = p.toLowerCase();

  if (
    lower.includes("/library/caches/") ||
    lower.includes("/library/logs/") ||
    lower.endsWith(".ds_store") ||
    lower.includes("node_modules") ||
    lower.includes("/.gradle/caches/") ||
    lower.includes("__pycache__") ||
    p.includes(".tmp") ||
    lower.includes("/downloads/") && (lower.endsWith(".tmp") || lower.endsWith(".download"))
  ) {
    return "safe";
  }

  if (
    lower.includes("/library/preferences/") ||
    lower.includes("/library/launchagents/") ||
    lower.includes("/library/launchdaemons/") ||
    lower.includes("/library/keychains/") ||
    lower.includes("/documents/") ||
    lower.includes("/desktop/")
  ) {
    return "risky";
  }

  if (
    lower.includes("backup") ||
    lower.includes("autosave") ||
    lower.includes("/library/saved application state/") ||
    lower.endsWith(".old") ||
    lower.endsWith(".bak")
  ) {
    return "caution";
  }

  if (lower.includes("/library/application support/")) {
    return "caution";
  }

  return item.aiSafetyScore >= 0.75 ? "safe" : item.aiSafetyScore >= 0.45 ? "caution" : "risky";
}
