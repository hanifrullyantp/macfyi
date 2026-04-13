import type { FileItem } from "../types";

/** Guess app display name from .app path or Library folders. */
export function deriveAssociatedApp(path: string): string | undefined {
  const norm = path.replace(/\\/g, "/");
  const appMatch = norm.match(/\/Applications\/([^/]+)\.app\//i);
  if (appMatch) return appMatch[1].replace(/\.app$/i, "");
  const sup = norm.match(/Application Support\/([^/]+)/i);
  if (sup?.[1] && !["Mozilla", "Google", "Microsoft"].includes(sup[1])) return sup[1];
  const cache = norm.match(/Library\/Caches\/([^/]+)/);
  if (cache?.[1] && !cache[1].includes(".")) return cache[1];
  return undefined;
}

export function attachAssociatedApp(items: FileItem[]): FileItem[] {
  return items.map((i) => {
    if (i.associatedApp) return i;
    const a = deriveAssociatedApp(i.path);
    return a ? { ...i, associatedApp: a } : i;
  });
}
