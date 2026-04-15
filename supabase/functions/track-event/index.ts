// Batch analytics → CRM. Deploy: supabase functions deploy track-event --no-verify-jwt
// Service role; validasi ringan (whitelist tipe, ukuran body).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_TYPES = new Set([
  "page_view",
  "scroll_depth",
  "time_on_page",
  "cta_click",
  "form_open",
  "form_field_focus",
  "form_abandoned",
  "form_submitted",
  "snap_opened",
  "snap_closed",
  "payment_success",
  "download_completed",
  "affiliate_applied",
  "lead_submitted",
  "download_clicked",
  "checkout_started",
  "purchase_completed",
]);

/** Maps event → CRM stage when stage should advance. */
const STAGE_MAP: Record<string, string> = {
  cta_click: "UPGRADE_INTENT",
  form_open: "UPGRADE_INTENT",
  form_submitted: "UPGRADE_INTENT",
  checkout_started: "UPGRADE_INTENT",
  snap_opened: "UPGRADE_INTENT",
  payment_success: "PAID",
  purchase_completed: "PAID",
  download_completed: "DOWNLOADED",
  lead_submitted: "DEMO_REQUESTED",
  affiliate_applied: "affiliate_customer",
};

const FUNNEL_ORDER = [
  "DEMO_REQUESTED",
  "DOWNLOADED",
  "DEMO_ACTIVATED",
  "SCANNED",
  "UPGRADE_INTENT",
  "PAID",
  "ACTIVATED",
  "ARCHIVED",
] as const;

function funnelRank(stage: string): number {
  const i = (FUNNEL_ORDER as readonly string[]).indexOf(stage);
  return i < 0 ? -1 : i;
}

function maxStage(a: string, b: string): string {
  if (a === "affiliate_customer" || b === "affiliate_customer") return "affiliate_customer";
  const ra = funnelRank(a);
  const rb = funnelRank(b);
  if (ra < 0 && rb < 0) return "DEMO_REQUESTED";
  if (ra < 0) return b;
  if (rb < 0) return a;
  return ra >= rb ? a : b;
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
    return new Response("misconfigured", { status: 500, headers: cors });
  }

  let body: {
    visitor_id?: string;
    events?: { type: string; payload?: Record<string, unknown> }[];
    page_url?: string;
    referrer?: string;
    referral_slug?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const visitorId = String(body.visitor_id ?? "").trim();
  const events = Array.isArray(body.events) ? body.events.slice(0, 30) : [];
  if (!visitorId || visitorId.length < 8 || events.length === 0) {
    return new Response(JSON.stringify({ error: "invalid_body" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  for (const ev of events) {
    if (!ALLOWED_TYPES.has(String(ev.type))) {
      return new Response(JSON.stringify({ error: "invalid_event_type", type: ev.type }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  }

  const supabase = createClient(url, key);
  const now = new Date().toISOString();

  const refSlug = String(body.referral_slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (refSlug.length >= 2) {
    const { data: aff } = await supabase
      .from("affiliates")
      .select("id")
      .eq("slug", refSlug)
      .eq("status", "active")
      .maybeSingle();
    if (aff) {
      const dayAgo = new Date(Date.now() - 864e5).toISOString();
      const { data: recent } = await supabase
        .from("referral_clicks")
        .select("id")
        .eq("affiliate_id", aff.id)
        .eq("visitor_id", visitorId)
        .gte("created_at", dayAgo)
        .limit(1)
        .maybeSingle();
      if (!recent) {
        await supabase.from("referral_clicks").insert({
          affiliate_id: aff.id,
          visitor_id: visitorId,
        });
      }
    }
  }

  const { data: existing } = await supabase.from("crm_contacts").select("id, stage").eq("visitor_id", visitorId).maybeSingle();

  let contactId = existing?.id as string | undefined;
  if (!contactId) {
    const { data: ins, error: insErr } = await supabase
      .from("crm_contacts")
      .insert({
        visitor_id: visitorId,
        stage: "DEMO_REQUESTED",
        source: "direct",
        last_activity_at: now,
        metadata: { page_url: body.page_url ?? null, referrer: body.referrer ?? null },
      })
      .select("id")
      .single();
    if (insErr) {
      console.error("crm_contact_insert", insErr);
      return new Response(JSON.stringify({ error: "db_error" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    contactId = ins.id;
  }

  let newStage = (existing?.stage as string) ?? "DEMO_REQUESTED";
  for (const ev of events) {
    await supabase.from("crm_events").insert({
      contact_id: contactId,
      event_type: ev.type,
      payload: { ...(ev.payload ?? {}), page_url: body.page_url },
    });
    const mapped = STAGE_MAP[ev.type];
    if (mapped) {
      if (mapped === "affiliate_customer") {
        newStage = "affiliate_customer";
      } else if (newStage !== "affiliate_customer") {
        newStage = maxStage(newStage, mapped);
      }
    }
  }

  await supabase
    .from("crm_contacts")
    .update({
      stage: newStage,
      last_activity_at: now,
      updated_at: now,
    })
    .eq("id", contactId);

  return new Response(JSON.stringify({ ok: true, contact_id: contactId }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
