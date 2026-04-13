import type { ScanResult, AppInfo, ShellProbe } from "../types";

export interface InterviewQuestion {
  id: string;
  type: "app" | "duplicate" | "developer" | "system";
  title: string;
  body: string;
  actions: InterviewAction[];
  meta?: Record<string, unknown>;
}

export interface InterviewAction {
  label: string;
  key: string;
  variant: "primary" | "secondary" | "danger";
}

const CLOUD_ALTERNATIVES: Record<string, string> = {
  "Microsoft Word": "Google Docs",
  "Microsoft Excel": "Google Sheets",
  "Microsoft PowerPoint": "Google Slides",
  Pages: "Google Docs",
  Numbers: "Google Sheets",
  Keynote: "Google Slides",
  Photoshop: "Figma / Canva",
  "Adobe Photoshop": "Figma / Canva",
  "Adobe Illustrator": "Figma",
  Sketch: "Figma",
  "Sublime Text": "VS Code (free)",
  TextMate: "VS Code (free)",
};

function formatSize(bytes: number): string {
  if (bytes > 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
  return (bytes / (1024 * 1024)).toFixed(0) + " MB";
}

export function generateQuestions(
  scanResults: ScanResult[],
  apps: AppInfo[],
  shellProbes: ShellProbe[]
): InterviewQuestion[] {
  const questions: InterviewQuestion[] = [];
  let qid = 0;

  // 1. Unused apps (not used in 90+ days or never)
  const now = Date.now();
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;

  for (const app of apps) {
    let stale = false;
    let lastLabel = "never";

    if (!app.lastUsed) {
      stale = true;
    } else {
      const d = new Date(app.lastUsed);
      if (now - d.getTime() > ninetyDays) {
        stale = true;
        lastLabel = d.toLocaleDateString();
      }
    }

    if (!stale || app.sizeBytes < 10 * 1024 * 1024) continue;

    const alt = CLOUD_ALTERNATIVES[app.name];
    let body = `"${app.name}" was last opened ${lastLabel}. It uses ${formatSize(app.sizeBytes)}.`;
    if (alt) {
      body += ` Consider switching to ${alt} (cloud-based, no disk usage).`;
    }

    questions.push({
      id: `q-${qid++}`,
      type: "app",
      title: `Still using ${app.name}?`,
      body,
      actions: [
        { label: "Uninstall", key: "uninstall", variant: "danger" },
        { label: "Keep", key: "keep", variant: "secondary" },
        { label: "Skip", key: "skip", variant: "secondary" },
      ],
      meta: { appPath: app.path, bundleId: app.bundleId, appName: app.name },
    });

    if (questions.length >= 5) break;
  }

  // 2. Duplicate groups
  const dupCat = scanResults.find((r) => r.category === "duplicates");
  if (dupCat && dupCat.items.length > 0) {
    const groups: Record<string, typeof dupCat.items> = {};
    for (const item of dupCat.items) {
      const key = `${item.size}-${item.name}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    let dupCount = 0;
    for (const [, items] of Object.entries(groups)) {
      if (items.length < 2 || dupCount >= 3) continue;
      const newest = items.find((i) => !i.recommended);
      const oldOnes = items.filter((i) => i.recommended);
      questions.push({
        id: `q-${qid++}`,
        type: "duplicate",
        title: `${items.length} copies of "${items[0].name}"`,
        body: `Total ${formatSize(items.reduce((a, i) => a + i.size, 0))}. Newest at: ${newest?.path ?? "unknown"}. Remove ${oldOnes.length} older copies?`,
        actions: [
          { label: "Keep newest only", key: "keep-newest", variant: "primary" },
          { label: "Keep all", key: "keep-all", variant: "secondary" },
          { label: "Review", key: "review", variant: "secondary" },
        ],
        meta: { itemIds: oldOnes.map((i) => i.id) },
      });
      dupCount++;
    }
  }

  // 3. Developer cache
  for (const probe of shellProbes) {
    if (probe.sizeBytes < 50 * 1024 * 1024) continue;
    questions.push({
      id: `q-${qid++}`,
      type: "developer",
      title: `${probe.tool} cache: ${formatSize(probe.sizeBytes)}`,
      body: `${probe.description}`,
      actions: [
        { label: "Clean cache", key: "clean", variant: "primary" },
        { label: "Keep", key: "keep", variant: "secondary" },
        { label: "Explain more", key: "explain", variant: "secondary" },
      ],
      meta: { tool: probe.tool, cachePath: probe.cachePath },
    });
  }

  // 4. Summary question (always last)
  const totalSavings = scanResults.reduce((a, r) => {
    return (
      a +
      r.items
        .filter((i) => i.recommended)
        .reduce((s, i) => s + i.size, 0)
    );
  }, 0);

  if (totalSavings > 0) {
    questions.push({
      id: `q-${qid++}`,
      type: "system",
      title: "Summary",
      body: `Based on the scan, you can free up to ${formatSize(totalSavings)} by removing recommended items. Shall I select all recommended items for cleanup?`,
      actions: [
        {
          label: "Select all recommended",
          key: "select-recommended",
          variant: "primary",
        },
        { label: "Let me review", key: "review", variant: "secondary" },
      ],
    });
  }

  return questions;
}
