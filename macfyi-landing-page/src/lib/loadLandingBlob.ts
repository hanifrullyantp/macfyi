import type { ContentData } from "../types/content";
import { getSupabaseBrowserClient } from "./supabase";

/** Konten landing yang dipublikasikan (Supabase) atau draft lokal. */
export async function fetchLandingContentBlob(): Promise<Partial<ContentData> | null> {
  const client = getSupabaseBrowserClient();
  if (client) {
    const { data } = await client.from("landing_site_content").select("content").eq("id", "default").maybeSingle();
    if (data?.content && typeof data.content === "object" && !Array.isArray(data.content)) {
      return data.content as Partial<ContentData>;
    }
  }
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem("macfyi_data");
      if (raw) return JSON.parse(raw) as Partial<ContentData>;
    } catch {
      /* */
    }
  }
  return null;
}
