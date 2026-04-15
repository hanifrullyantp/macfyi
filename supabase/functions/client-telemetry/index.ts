// Desktop/web telemetry (redacted, rate-limited). Deploy: supabase functions deploy client-telemetry --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED = new Set([
  "DemoActivated",
  "ScanCompleted",
  "PaywallShown",
  "UpgradeClicked",
  "LicenseActivated",
  "ErrorReport",
]);

const rateBucket = new Map<string, { n: number; reset: number }>();
const WINDOW_MS = 3_600_000;
const MAX_PER_HOUR = 120;

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("cf-connecting-ip") ?? "unknown";
}

function allow(ip: string): boolean {
  const now = Date.now();
  const r = rateBucket.get(ip);
  if (!r || now > r.reset) {
    rateBucket.set(ip, { n: 1, reset: now + WINDOW_MS });
    return true;
  }
  if (r.n >= MAX_PER_HOUR) return false;
  r.n++;
  return true;
}

function scrubPaths(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    if (obj.includes("/Users/") || obj.includes(":\\\\")) return "[path omitted]";
    return obj.slice(0, 4000);
  }
  if (Array.isArray(obj)) return obj.map(scrubPaths);
  if (typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      if (k.toLowerCase().includes("path") || k.toLowerCase().includes("filepath")) {
        out[k] = "[omitted]";
      } else {
        out[k] = scrubPaths(v);
      }
    }
    return out;
  }
  return obj;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const ip = clientIp(req);
  if (!allow(ip)) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
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

  let body: {
    event?: string;
    payload?: Record<string, unknown>;
    consent?: boolean;
    source?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const ev = String(body.event ?? "");
  if (!ALLOWED.has(ev)) {
    return new Response(JSON.stringify({ error: "invalid_event" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (ev === "ErrorReport" && body.consent !== true) {
    return new Response(JSON.stringify({ error: "consent_required" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const payload = scrubPaths(body.payload ?? {}) as Record<string, unknown>;
  const source = String(body.source ?? "unknown").slice(0, 32);
  const srcRow = source === "desktop" ? "desktop" : source === "web" ? "web" : "unknown";

  const supabase = createClient(url, key);

  if (ev === "ErrorReport") {
    const { error } = await supabase.from("app_error_reports").insert({
      source: srcRow,
      severity: "error",
      message: String(payload.message ?? "ErrorReport").slice(0, 500),
      stack_fingerprint: typeof payload.fingerprint === "string" ? String(payload.fingerprint).slice(0, 128) : null,
      user_or_lead_id: typeof payload.lead_id === "string" ? String(payload.lead_id).slice(0, 80) : null,
      payload: { event: ev, ...payload },
    });
    if (error) {
      console.error("error_report_insert", error);
      return new Response(JSON.stringify({ error: "db_error" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  } else {
    const { error } = await supabase.from("client_telemetry").insert({
      event_type: ev,
      source: srcRow,
      payload: { event: ev, ...payload },
    });
    if (error) {
      console.error("telemetry_insert", error);
      return new Response(JSON.stringify({ error: "db_error" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
