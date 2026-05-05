import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ProviderId = "gemini" | "groq";

type ProviderHealthEntry = {
  status: "ok" | "error" | "not_configured" | "inactive";
  httpStatus?: number;
  /** Short machine-readable hint for client mapping */
  code?: "TIMEOUT" | "NETWORK" | "HTTP_ERROR" | "EMPTY_RESPONSE";
};

const healthRate = new Map<string, { count: number; resetAt: number }>();
const HEALTH_MAX_PER_WINDOW = 24;
const HEALTH_WINDOW_MS = 60 * 60 * 1000;

function clientKey(req: Request, deviceFingerprint: string | undefined): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() ?? "unknown";
  return `health:${deviceFingerprint ?? "none"}:${ip}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const deviceFingerprint = typeof body?.deviceFingerprint === "string" ? body.deviceFingerprint : undefined;

    const key = clientKey(req, deviceFingerprint);
    const now = Date.now();
    const slot = healthRate.get(key);
    if (slot && now < slot.resetAt) {
      if (slot.count >= HEALTH_MAX_PER_WINDOW) {
        return Response.json(
          {
            error: "RATE_LIMIT",
            message: "Too many health checks. Try again later.",
            providers: emptyProviders(),
          },
          { status: 429, headers: corsHeaders },
        );
      }
      slot.count += 1;
    } else {
      healthRate.set(key, { count: 1, resetAt: now + HEALTH_WINDOW_MS });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: rows } = await supabase
      .from("platform_api_keys")
      .select("provider,key_value,is_active")
      .in("provider", ["gemini", "groq"]);

    const byProvider = {
      gemini: rows?.find((r) => r.provider === "gemini"),
      groq: rows?.find((r) => r.provider === "groq"),
    };

    const providers: Record<ProviderId, ProviderHealthEntry> = {
      gemini: await resolveProviderHealth("gemini", byProvider.gemini),
      groq: await resolveProviderHealth("groq", byProvider.groq),
    };

    return Response.json(
      {
        providers,
        checkedAt: new Date().toISOString(),
      },
      { headers: corsHeaders },
    );
  } catch {
    return Response.json(
      { error: "server_error", providers: emptyProviders(), checkedAt: new Date().toISOString() },
      { status: 500, headers: corsHeaders },
    );
  }
});

function emptyProviders(): Record<ProviderId, ProviderHealthEntry> {
  return {
    gemini: { status: "error", code: "NETWORK" },
    groq: { status: "error", code: "NETWORK" },
  };
}

async function resolveProviderHealth(
  id: ProviderId,
  row: { provider: string; key_value: string; is_active: boolean } | undefined,
): Promise<ProviderHealthEntry> {
  if (!row) return { status: "not_configured" };
  if (!row.is_active) return { status: "inactive" };
  const key = (row.key_value ?? "").trim();
  if (!key || key === "BELUM_DIISI") return { status: "not_configured" };

  try {
    if (id === "gemini") {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(10_000),
          body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
        },
      );
      const httpStatus = res.status;
      if (!res.ok) return { status: "error", httpStatus, code: "HTTP_ERROR" };
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return { status: "error", httpStatus, code: "EMPTY_RESPONSE" };
      return { status: "ok", httpStatus };
    }
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5,
      }),
    });
    const httpStatus = res.status;
    if (!res.ok) return { status: "error", httpStatus, code: "HTTP_ERROR" };
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) return { status: "error", httpStatus, code: "EMPTY_RESPONSE" };
    return { status: "ok", httpStatus };
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      return { status: "error", code: "TIMEOUT" };
    }
    return { status: "error", code: "NETWORK" };
  }
}
