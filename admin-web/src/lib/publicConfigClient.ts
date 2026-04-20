import { supabaseConfigured } from "../supabase";

export async function fetchPublicConfigJson(): Promise<unknown> {
  if (!supabaseConfigured) throw new Error("Supabase not configured");
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
  const res = await fetch(`${base}/functions/v1/public-config`, {
    method: "GET",
    headers: { apikey: anon },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`public-config ${res.status}: ${text.slice(0, 200)}`);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function healthCheckEdgeFunction(name: string, sessionAccessToken: string): Promise<{ ok: boolean; status: number; body: string }> {
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
  const path = name === "public-config" ? "public-config" : name;
  const method = name === "public-config" ? "GET" : "POST";
  const res = await fetch(`${base}/functions/v1/${path}`, {
    method,
    headers: {
      apikey: anon,
      Authorization: `Bearer ${sessionAccessToken}`,
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    body: method === "POST" ? "{}" : undefined,
  });
  const body = (await res.text()).slice(0, 400);
  return { ok: res.ok, status: res.status, body };
}
