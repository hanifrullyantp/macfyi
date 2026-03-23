// Supabase Edge Function: monefyi-upload-logo
// Admin-only endpoint to upload a logo image to Supabase Storage (bucket: app-branding)
// and persist it to public.app_config (id: 'global', column: logo_url).
//
// Why Edge Function?
// - Avoids client-side Storage write permissions
// - Keeps updates admin-only (checked via profiles.role)
//
// Required secrets (Supabase Dashboard → Edge Functions → Secrets):
// - SUPABASE_URL
// - SUPABASE_ANON_KEY
// - SUPABASE_SERVICE_ROLE_KEY
// Optional:
// - APP_BRANDING_BUCKET (default: app-branding)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function pickEnv(name: string, fallback = "") {
  return (Deno.env.get(name) ?? fallback).trim();
}

function guessExt(fileName: string, contentType: string) {
  const n = (fileName || "").toLowerCase();
  const byName = n.split(".").pop() || "";
  const ct = (contentType || "").toLowerCase();

  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(byName)) return byName === "jpeg" ? "jpg" : byName;
  if (ct.includes("png")) return "png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("svg")) return "svg";
  return "png";
}

async function getAuthedUser(supaAnon: any) {
  const { data, error } = await supaAnon.auth.getUser();
  if (error || !data?.user) throw new Error("Unauthorized");
  return data.user;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, ...jsonHeaders } });
  }

  const SUPABASE_URL = pickEnv("SUPABASE_URL");
  const SUPABASE_ANON_KEY = pickEnv("SUPABASE_ANON_KEY");
  const SERVICE_ROLE = pickEnv("SUPABASE_SERVICE_ROLE_KEY");
  const BUCKET = pickEnv("APP_BRANDING_BUCKET", "app-branding");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "Missing env SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY" }), {
      status: 500,
      headers: { ...corsHeaders, ...jsonHeaders },
    });
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: { ...corsHeaders, ...jsonHeaders } });
  }

  // Client that respects RLS + can read the caller profile
  const supaAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  // Service client to bypass RLS for updating global config & uploading to storage
  const supaAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const user = await getAuthedUser(supaAnon);

    // Check admin role
    const { data: prof, error: profErr } = await supaAnon
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr) throw profErr;
    if (String(prof?.role || "").toLowerCase() !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, ...jsonHeaders } });
    }

    let logoUrl = "";

    const ct = (req.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const f = form.get("file");
      if (!(f instanceof File)) {
        return new Response(JSON.stringify({ error: "Missing file" }), { status: 400, headers: { ...corsHeaders, ...jsonHeaders } });
      }

      const ext = guessExt(f.name, f.type);
      const path = `logo/${Date.now()}_${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supaAdmin.storage.from(BUCKET).upload(path, f, {
        upsert: true,
        contentType: f.type || (ext === "svg" ? "image/svg+xml" : "image/png"),
      });
      if (upErr) throw upErr;

      const { data } = supaAdmin.storage.from(BUCKET).getPublicUrl(path);
      logoUrl = String(data?.publicUrl || "");
      if (!logoUrl) throw new Error("Failed to create public URL");
    } else {
      // JSON body mode: set logoUrl directly
      const body = await req.json().catch(() => ({}));
      logoUrl = String(body?.logoUrl || "").trim();
      if (!logoUrl) {
        return new Response(JSON.stringify({ error: "logoUrl is required" }), { status: 400, headers: { ...corsHeaders, ...jsonHeaders } });
      }
    }

    // Preserve existing app_config values while updating logo_url
    const { data: curCfg } = await supaAdmin
      .from("app_config")
      .select("*")
      .eq("id", "global")
      .maybeSingle();

    const payload = {
      id: "global",
      logo_url: logoUrl,
      checkout_monthly_url: curCfg?.checkout_monthly_url ?? null,
      checkout_lifetime_url: curCfg?.checkout_lifetime_url ?? null,
      affiliate_commission: curCfg?.affiliate_commission ?? 100000,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error: saveErr } = await supaAdmin.from("app_config").upsert(payload).select("*").single();
    if (saveErr) throw saveErr;

    return new Response(JSON.stringify({ ok: true, logoUrl, appConfig: saved }), { headers: { ...corsHeaders, ...jsonHeaders } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, ...jsonHeaders } });
  }
});
