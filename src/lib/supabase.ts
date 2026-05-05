import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

export const supabaseConfigured = Boolean(url && anon);

let client: SupabaseClient | null = null;

/** Avoid createClient("", "") — it throws and breaks any chunk that imports this module. */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  client ??= createClient(url, anon);
  return client;
}
