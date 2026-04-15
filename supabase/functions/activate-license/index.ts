// Supabase Edge Function: validate license + bind single device fingerprint.
// Deploy: supabase functions deploy activate-license --no-verify-jwt
// Set secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto in hosted)

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      return new Response(JSON.stringify({ error: "server_misconfigured" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(url, key);
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const license_key = String(body.license_key ?? "").trim();
    const device_fingerprint = String(body.device_fingerprint ?? "").trim();

    if (!email || !license_key || !device_fingerprint) {
      return new Response(JSON.stringify({ error: "missing_fields" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const license_key_hash = await sha256hex(license_key);

    const { data: lic, error: le } = await supabase
      .from("licenses")
      .select("id,email,status")
      .eq("license_key_hash", license_key_hash)
      .maybeSingle();

    if (le || !lic || lic.status !== "active") {
      return new Response(JSON.stringify({ error: "invalid_license" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (String(lic.email).toLowerCase() !== email) {
      return new Response(JSON.stringify({ error: "email_mismatch" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: existing } = await supabase
      .from("activations")
      .select("device_fingerprint")
      .eq("license_id", lic.id)
      .maybeSingle();

    if (existing && existing.device_fingerprint !== device_fingerprint) {
      return new Response(JSON.stringify({ error: "device_already_bound" }), {
        status: 409,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!existing) {
      await supabase.from("activations").insert({
        license_id: lic.id,
        device_fingerprint,
      });
    } else {
      await supabase
        .from("activations")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("license_id", lic.id);
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
        payload: { license_id: lic.id },
      });
    }

    const token = crypto.randomUUID();
    return new Response(
      JSON.stringify({ token, license_id: lic.id, expires_at: null }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
