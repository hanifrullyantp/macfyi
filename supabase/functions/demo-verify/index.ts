// Verify demo token (hash lookup, not expired). Deploy: supabase functions deploy demo-verify --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { asNumber, asBool, getPlatformSetting } from "../_shared/platformSettings.ts";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256hex(plain: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(plain));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: { token?: string };
  try {
    body = (await req.json()) as { token?: string };
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const token = String(body.token ?? "").trim();
  if (token.length < 16) {
    return new Response(JSON.stringify({ valid: false, error: "invalid_token" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(url, key);
  const tokenHash = await sha256hex(token);

  const { data: row, error } = await supabase
    .from("demo_tokens")
    .select("id, contact_id, expires_at, redeemed_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !row) {
    return new Response(JSON.stringify({ valid: false }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const now = Date.now();
  if (new Date(row.expires_at).getTime() < now) {
    return new Response(JSON.stringify({ valid: false, error: "expired" }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const cleanDailyGb = asNumber(await getPlatformSetting(supabase, "demo.clean_daily_gb_cap"), 2);
  const cleanDailyItems = asNumber(await getPlatformSetting(supabase, "demo.clean_daily_items_cap"), 30);
  const aiDaily = asNumber(await getPlatformSetting(supabase, "demo.ai_questions_per_day"), 10);
  const uninstallDaily = asNumber(await getPlatformSetting(supabase, "demo.uninstall_actions_per_day"), 1);
  const safeOnly = asBool(await getPlatformSetting(supabase, "demo.clean_safe_risk_only"), true);

  const rules_snapshot = {
    clean_daily_gb_cap: cleanDailyGb,
    clean_daily_items_cap: cleanDailyItems,
    ai_questions_per_day: aiDaily,
    uninstall_actions_per_day: uninstallDaily,
    clean_safe_risk_only: safeOnly,
  };

  return new Response(
    JSON.stringify({
      valid: true,
      contact_id: row.contact_id,
      rules_snapshot,
    }),
    { headers: { ...cors, "Content-Type": "application/json" } }
  );
});
