import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

export const supabaseConfigured = Boolean(url && anon);

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    autoRefreshToken: true,
  },
});
