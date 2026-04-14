const USER_PATH_RE = /\/Users\/[^/\s]+(?:\/[^\s]*)?/g;
const HOME_PATH_RE = /~\/[^\s]*/g;

/**
 * Privacy-first redaction. Removes full local paths from any string.
 * We keep this intentionally simple and conservative.
 */
export function redactPaths(input: string): string {
  return input
    .replace(USER_PATH_RE, "[path omitted]")
    .replace(HOME_PATH_RE, "[path omitted]");
}

export function redactPathsDeep<T>(value: T): T {
  if (typeof value === "string") return redactPaths(value) as T;
  if (Array.isArray(value)) return value.map((x) => redactPathsDeep(x)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactPathsDeep(v);
    }
    return out as T;
  }
  return value;
}

