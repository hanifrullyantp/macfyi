// Create CRM lead + demo token. Authenticated path (recommended): Supabase JWT required unless demo.allow_anonymous_demo_request=true.
// Deploy: supabase functions deploy demo-request --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { asBool, asNumber, getPlatformSetting } from "../_shared/platformSettings.ts";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-forwarded-for",
};

async function sha256hex(plain: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(plain));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomTokenHex(bytes = 32): string {
  const u = new Uint8Array(bytes);
  crypto.getRandomValues(u);
  return Array.from(u)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const rateBucket = new Map<string, { n: number; reset: number }>();
const RATE_WINDOW_MS = 3_600_000;
const RATE_MAX = 30;

function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xf) return xf;
  return req.headers.get("cf-connecting-ip") ?? "unknown";
}

function rateLimit(key: string): boolean {
  const now = Date.now();
  const row = rateBucket.get(key);
  if (!row || now > row.reset) {
    rateBucket.set(key, { n: 1, reset: now + RATE_WINDOW_MS });
    return true;
  }
  if (row.n >= RATE_MAX) return false;
  row.n += 1;
  return true;
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
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

  const supabase = createClient(url, serviceKey);
  const allowAnon = asBool(await getPlatformSetting(supabase, "demo.allow_anonymous_demo_request"), false);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const jwt = bearerJwt(req);
  const ip = clientIp(req);

  let userId: string | null = null;
  let userEmail = "";
  let userDisplayName = "";

  if (jwt) {
    const authClient = createClient(url, anonKey);
    const { data, error } = await authClient.auth.getUser(jwt);
    if (error || !data?.user) {
      return new Response(JSON.stringify({ error: "invalid_session", message: "Login tidak valid atau sudah kedaluwarsa." }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const u = data.user;
    userId = u.id;
    userEmail = (u.email ?? "").trim().toLowerCase();
    userDisplayName =
      String(body.name ?? "").trim() ||
      String(u.user_metadata?.full_name ?? u.user_metadata?.name ?? "").trim() ||
      (userEmail ? userEmail.split("@")[0]! : "User");
    if (!userEmail || !isValidEmail(userEmail)) {
      return new Response(JSON.stringify({ error: "invalid_email" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!rateLimit(`uid:${userId}`)) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  } else {
    if (!allowAnon) {
      return new Response(
        JSON.stringify({
          error: "login_required",
          message: "Silakan daftar / masuk dengan email dan password untuk mendapatkan demo.",
        }),
        {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        }
      );
    }
    if (!rateLimit(`ip:${ip}`)) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  }

  const name = userId
    ? userDisplayName.slice(0, 200)
    : String(body.name ?? "").trim().slice(0, 200);
  const email = userId ? userEmail : String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").replace(/\D/g, "").slice(0, 20);
  const message = String(body.message ?? "").trim().slice(0, 2000);
  let visitorId = String(body.visitor_id ?? "").trim();
  if (userId) {
    visitorId = `auth:${userId}`;
  } else if (!visitorId || visitorId.length < 8) {
    visitorId = crypto.randomUUID();
  }

  if (!userId) {
    if (name.length < 2) {
      return new Response(JSON.stringify({ error: "invalid_name" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "invalid_email" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  }

  const now = new Date().toISOString();
  const ttlDays = asNumber(await getPlatformSetting(supabase, "demo.token_ttl_days"), 14);
  const expiresAt = new Date(Date.now() + ttlDays * 864e5).toISOString();

  let contactId: string;

  if (userId) {
    const row = {
      user_id: userId,
      visitor_id: visitorId,
      email,
      display_name: name,
      phone: phone || null,
      stage: "demo",
      source: "demo_landing_auth",
      last_activity_at: now,
      updated_at: now,
      metadata: { message: message || null, ip },
    };

    // Prefer upsert on user_id (requires unique index). If project missed the migration, fallback to select+update/insert.
    const { data: up, error: upErr } = await supabase
      .from("crm_contacts")
      .upsert(row, { onConflict: "user_id" })
      .select("id")
      .single();

    if (!upErr && up?.id) {
      contactId = up.id as string;
    } else {
      const msg = String((upErr as { message?: string } | null)?.message ?? "");
      const looksLikeNoUnique =
        msg.includes("no unique") ||
        msg.includes("no unique constraint") ||
        msg.includes("no unique or exclusion constraint") ||
        msg.includes("42P10");

      if (!looksLikeNoUnique) {
        console.error("crm_upsert_auth", upErr);
        return new Response(JSON.stringify({ error: "db_error" }), {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const { data: existing, error: selErr } = await supabase
        .from("crm_contacts")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (selErr) {
        console.error("crm_select_by_user_id", selErr);
        return new Response(JSON.stringify({ error: "db_error" }), {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      if (existing?.id) {
        const { data: upd, error: updErr } = await supabase
          .from("crm_contacts")
          .update(row)
          .eq("id", existing.id as string)
          .select("id")
          .single();
        if (updErr || !upd?.id) {
          console.error("crm_update_auth", updErr);
          return new Response(JSON.stringify({ error: "db_error" }), {
            status: 500,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }
        contactId = upd.id as string;
      } else {
        const { data: ins, error: insErr } = await supabase
          .from("crm_contacts")
          .insert(row)
          .select("id")
          .single();
        if (insErr || !ins?.id) {
          console.error("crm_insert_auth", insErr);
          return new Response(JSON.stringify({ error: "db_error" }), {
            status: 500,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }
        contactId = ins.id as string;
      }
    }
  } else {
    const { data: contact, error: cErr } = await supabase
      .from("crm_contacts")
      .insert({
        visitor_id: visitorId,
        email,
        display_name: name,
        phone: phone || null,
        stage: "demo",
        source: "demo_landing",
        last_activity_at: now,
        metadata: { message: message || null, ip },
      })
      .select("id")
      .single();

    if (cErr || !contact) {
      console.error("crm_insert", cErr);
      return new Response(JSON.stringify({ error: "db_error" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    contactId = contact.id as string;
  }

  await supabase.from("crm_events").insert({
    contact_id: contactId,
    event_type: "lead_submitted",
    payload: { name, email, phone: phone || null, source: userId ? "demo_request_auth" : "demo_request" },
  });

  const plainToken = randomTokenHex(24);
  const tokenHash = await sha256hex(plainToken);

  const { error: tErr } = await supabase.from("demo_tokens").insert({
    token_hash: tokenHash,
    contact_id: contactId,
    expires_at: expiresAt,
    metadata: userId ? { auth_user_id: userId } : {},
  });

  if (tErr) {
    console.error("demo_token_insert", tErr);
    return new Response(JSON.stringify({ error: "token_create_failed" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { data: settings } = await supabase
    .from("app_settings")
    .select("checkout_success_base_url, download_base_url")
    .eq("id", "default")
    .maybeSingle();

  const base =
    String(settings?.checkout_success_base_url ?? "").trim().replace(/\/$/, "") ||
    Deno.env.get("LANDING_PUBLIC_URL")?.trim().replace(/\/$/, "") ||
    "";

  const downloadPath = `/download?token=${encodeURIComponent(plainToken)}`;
  const download_url = base ? `${base}${downloadPath}` : downloadPath;

  return new Response(
    JSON.stringify({
      ok: true,
      token: plainToken,
      contact_id: contactId,
      visitor_id: visitorId,
      download_url,
      expires_at: expiresAt,
    }),
    { headers: { ...cors, "Content-Type": "application/json" } }
  );
});
