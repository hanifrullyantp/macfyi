// supabase/functions/monefyi-landing-config/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;
const ADMIN_USER = Deno.env.get("ADMIN_USER")!;
const ADMIN_PASS = Deno.env.get("ADMIN_PASS")!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "Content-Type, X-Admin-User, X-Admin-Pass",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") || "default";

  if (req.method === "GET") {
    // Ambil config landing
    const { data, error } = await supabaseAdmin
      .from("landing_content")
      .select("content")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("GET landing_content error:", error);
      return jsonResponse({ error: "Failed to load content" }, 500);
    }

    if (!data) {
      // tidak ada row, kirim kosong
      return jsonResponse({ slug, content: null }, 200);
    }

    return jsonResponse({ slug, content: data.content }, 200);
  }

  if (req.method === "POST") {
    // Validasi admin lewat header
    const hUser = req.headers.get("X-Admin-User") || "";
    const hPass = req.headers.get("X-Admin-Pass") || "";

    if (hUser !== ADMIN_USER || hPass !== ADMIN_PASS) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    const bodySlug = body.slug || slug || "default";
    const content = body.content;
    if (!content) {
      return jsonResponse({ error: "Missing content" }, 400);
    }

    // Upsert row
    const { error } = await supabaseAdmin.from("landing_content").upsert(
      {
        slug: bodySlug,
        content,
      },
      { onConflict: "slug" },
    );

    if (error) {
      console.error("POST landing_content error:", error);
      return jsonResponse({ error: "Failed to save content" }, 500);
    }

    return jsonResponse({ ok: true, slug: bodySlug }, 200);
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
});