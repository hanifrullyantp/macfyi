function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/** Deep-merge plain objects; arrays and scalars from `patch` replace. */
export function deepMerge<T extends Record<string, unknown>>(base: T, patch: Partial<T>): T {
  const out = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(patch)) {
    const pv = (patch as Record<string, unknown>)[key];
    const bv = base[key as keyof T];
    if (pv === undefined) continue;
    if (Array.isArray(pv)) {
      out[key as string] = pv;
    } else if (isPlainObject(pv) && isPlainObject(bv as unknown)) {
      out[key as string] = deepMerge(bv as Record<string, unknown>, pv as Record<string, unknown>);
    } else {
      out[key as string] = pv;
    }
  }
  return out as T;
}
