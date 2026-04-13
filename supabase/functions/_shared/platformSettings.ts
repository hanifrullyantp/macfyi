/** Baca nilai dari public.platform_settings (jsonb). */
// deno-lint-ignore no-explicit-any
export async function getPlatformSetting(supabase: any, key: string): Promise<unknown> {
  const { data } = await supabase.from("platform_settings").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

export function asBool(v: unknown, defaultVal: boolean): boolean {
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  return defaultVal;
}

export function asNumber(v: unknown, defaultVal: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : defaultVal;
}
