import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

export const supabaseConfigured = Boolean(url && anon);

// Prevent hard crash during module import when env is missing in dev/preview.
// App-level guards use `supabaseConfigured` before making authenticated calls.
const safeUrl = url || "http://127.0.0.1:54321";
const safeAnon = anon || "public-anon-key";

export const supabase = createClient(safeUrl, safeAnon);
