// Verify that a demo token belongs to the signed-in user (CRM contact.user_id = auth uid). Used before showing DMG download.
// Deploy: supabase functions deploy demo-download-verify --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

function bearerJwt(req: Request): string {
  const h = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ?? "";
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
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !anonKey) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const jwt = bearerJwt(req);
  if (!jwt) {
    return new Response(JSON.stringify({ ok: false, error: "login_required" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const authClient = createClient(url, anonKey);
  const { data: userData, error: userErr } = await authClient.auth.getUser(jwt);
  if (userErr || !userData?.user?.id) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_session" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const uid = userData.user.id;

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
    return new Response(JSON.stringify({ ok: false, error: "invalid_token" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(url, serviceKey);
  const tokenHash = await sha256hex(token);

  const { data: tok, error: tErr } = await supabase
    .from("demo_tokens")
    .select("id, expires_at, contact_id")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tErr || !tok) {
    return new Response(JSON.stringify({ ok: false, error: "not_found" }), {
      status: 404,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (new Date(tok.expires_at).getTime() < Date.now()) {
    return new Response(JSON.stringify({ ok: false, error: "expired" }), {
      status: 410,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { data: contact, error: cErr } = await supabase
    .from("crm_contacts")
    .select("user_id, email")
    .eq("id", tok.contact_id as string)
    .maybeSingle();

  if (cErr || !contact) {
    return new Response(JSON.stringify({ ok: false, error: "not_found" }), {
      status: 404,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const sessionEmail = (userData.user.email ?? "").trim().toLowerCase();
  const contactEmail = (contact.email as string | null | undefined)?.trim().toLowerCase() ?? "";

  if (!contact.user_id) {
    if (sessionEmail && contactEmail && sessionEmail === contactEmail) {
      await supabase.from("crm_contacts").update({ user_id: uid }).eq("id", tok.contact_id as string);
    } else {
      return new Response(JSON.stringify({ ok: false, error: "token_owner_mismatch" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  } else if (contact.user_id !== uid) {
    return new Response(JSON.stringify({ ok: false, error: "token_owner_mismatch" }), {
      status: 403,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
