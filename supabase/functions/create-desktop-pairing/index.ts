// Authenticated: creates a short-lived code for desktop linking. Deploy: supabase functions deploy create-desktop-pairing --no-verify-jwt
// In Dashboard, set verify_jwt = true for this function (Supabase links user JWT automatically when enabled).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function bearerToken(req: Request): string {
  const h = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ?? "";
}

function makePairingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const u = new Uint8Array(8);
  crypto.getRandomValues(u);
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[u[i]! % chars.length];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}`;
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
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !anon) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const jwt = bearerToken(req);
  if (!jwt) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user?.id) {
    return new Response(JSON.stringify({ error: "invalid_token" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(url, serviceKey);
  const ttlMin = 10;
  const expires = new Date(Date.now() + ttlMin * 60 * 1000).toISOString();

  await admin.from("desktop_pairing_codes").delete().eq("user_id", user.id).is("consumed_at", null);

  let code = makePairingCode();
  for (let attempt = 0; attempt < 8; attempt++) {
    const { error: insErr } = await admin.from("desktop_pairing_codes").insert({
      user_id: user.id,
      code,
      expires_at: expires,
    });
    if (!insErr) break;
    code = makePairingCode();
    if (attempt === 7) {
      return new Response(JSON.stringify({ error: "code_generation_failed" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ code, expires_at: expires, ttl_minutes: ttlMin }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
