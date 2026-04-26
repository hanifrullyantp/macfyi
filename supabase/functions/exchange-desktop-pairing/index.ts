// Exchange pairing code + device fingerprint for a session token; bind Pro license if email has active license.
// Deploy: supabase functions deploy exchange-desktop-pairing --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(url, serviceKey);

  let body: { code?: string; device_fingerprint?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const rawCode = String(body.code ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const device_fingerprint = String(body.device_fingerprint ?? "").trim();
  const codeNorm = rawCode.includes("-") ? rawCode : `${rawCode.slice(0, 4)}-${rawCode.slice(4, 8)}`;

  if (!codeNorm || codeNorm.length < 7 || !device_fingerprint) {
    return new Response(JSON.stringify({ error: "missing_fields" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { data: row, error: findErr } = await supabase
    .from("desktop_pairing_codes")
    .select("id, user_id, expires_at, consumed_at")
    .eq("code", codeNorm)
    .maybeSingle();

  if (findErr || !row) {
    return new Response(JSON.stringify({ error: "invalid_code" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (row.consumed_at) {
    return new Response(JSON.stringify({ error: "code_used" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return new Response(JSON.stringify({ error: "code_expired" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { data: userData, error: uerr } = await supabase.auth.admin.getUserById(row.user_id);
  if (uerr || !userData.user?.email) {
    return new Response(JSON.stringify({ error: "user_not_found" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const email = String(userData.user.email).toLowerCase();

  const { data: lic } = await supabase
    .from("licenses")
    .select("id, status, email")
    .ilike("email", email)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const token = crypto.randomUUID();
  const isPro = Boolean(lic?.id);

  if (!isPro) {
    await supabase
      .from("desktop_pairing_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);
    return new Response(
      JSON.stringify({
        token,
        email,
        is_pro: false,
        license_id: null,
        expires_at: null,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  const licenseId = lic!.id as string;

  const { data: existing } = await supabase
    .from("activations")
    .select("device_fingerprint")
    .eq("license_id", licenseId)
    .maybeSingle();

  if (existing && existing.device_fingerprint !== device_fingerprint) {
    return new Response(JSON.stringify({ error: "device_already_bound" }), {
      status: 409,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (!existing) {
    await supabase.from("activations").insert({
      license_id: licenseId,
      device_fingerprint,
    });
  } else {
    await supabase
      .from("activations")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("license_id", licenseId);
  }

  const ts = new Date().toISOString();
  const { data: paidLead } = await supabase
    .from("crm_contacts")
    .select("id")
    .eq("email", email)
    .eq("stage", "PAID")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const leadId = (paidLead?.id as string) ?? null;
  if (leadId) {
    await supabase
      .from("crm_contacts")
      .update({ stage: "ACTIVATED", last_activity_at: ts, updated_at: ts })
      .eq("id", leadId);
    await supabase.from("crm_events").insert({
      contact_id: leadId,
      event_type: "license_activated",
      payload: { license_id: licenseId, source: "desktop_pairing" },
    });
  }

  await supabase
    .from("desktop_pairing_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id);

  return new Response(
    JSON.stringify({
      token,
      email,
      is_pro: true,
      license_id: licenseId,
      expires_at: null,
    }),
    { headers: { ...cors, "Content-Type": "application/json" } }
  );
});
