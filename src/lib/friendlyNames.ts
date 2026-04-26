const PATH_HUMAN: { pattern: RegExp; label: string }[] = [
  { pattern: /\/Library\/Caches\//i, label: "Cache" },
  { pattern: /\/Library\/Logs\//i, label: "Log" },
  { pattern: /\/Library\/Application Support\//i, label: "Data app" },
  { pattern: /\/Downloads\//i, label: "Unduhan" },
  { pattern: /\/\.npm\//i, label: "npm" },
  { pattern: /DerivedData/i, label: "Xcode build" },
];

function folderHint(path: string): string {
  for (const { pattern, label } of PATH_HUMAN) {
    if (pattern.test(path)) return label;
  }
  return "File";
}

/** Prefer short display: friendly filename + light folder hint. */
export function getFriendlyName(path: string, fileName: string): string {
  const base = fileName || path.split("/").pop() || path;
  const hint = folderHint(path);
  if (hint === "File") return base;
  return `${base} · ${hint}`;
}
