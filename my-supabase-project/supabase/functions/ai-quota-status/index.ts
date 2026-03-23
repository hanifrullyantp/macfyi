// Supabase Edge Function: ai-quota-status
// ---------------------------------------
// Mengembalikan status kuota AI harian user saat ini.
//
// Respon:
// {
//   "limit": 20,
//   "usedToday": 5,
//   "remaining": 15,
//   "resetTime": "2025-12-28T00:00:00+07:00"
// }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json" };
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // produksi: ganti ke origin app jika mau
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function pickEnv(name: string, fallback = "") {
  return (Deno.env.get(name) ?? fallback).trim();
}

// Hitung "hari ini" dan resetTime versi WIB (+7)
function getTodayAndResetWIB() {
  const nowUtc = new Date();
  const offsetMs = 7 * 60 * 60 * 1000; // +7 jam
  const wibNow = new Date(nowUtc.getTime() + offsetMs);

  const y = wibNow.getUTCFullYear();
  const m = wibNow.getUTCMonth();
  const d = wibNow.getUTCDate();

  // hari ini di WIB, jam 00:00
  const todayWib = new Date(Date.UTC(y, m, d, 0, 0, 0));
  // besok jam 00:00 WIB
  const tomorrowWib = new Date(Date.UTC(y, m, d + 1, 0, 0, 0));

  const todayStr = todayWib.toISOString().slice(0, 10);
  const resetISO = tomorrowWib.toISOString(); // ISO UTC; cukup untuk klien

  return { todayStr, resetISO };
}

// decode JWT manual untuk ambil sub (user_id)
function decodeUserIdFromAuthHeader(authHeader: string): string | null {
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1];
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payloadJson = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    return String(payload.sub || payload.user_id || "");
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, ...jsonHeaders } },
    );
  }

  try {
    const SUPABASE_URL = pickEnv("SUPABASE_URL");
    const SERVICE_ROLE = pickEnv("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(
        JSON.stringify({
          error: "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
        }),
        { status: 500, headers: { ...corsHeaders, ...jsonHeaders } },
      );
    }

    const authHeader = req.headers.get("Authorization") || "";
    const userId = decodeUserIdFromAuthHeader(authHeader);
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized (invalid token)" }),
        { status: 401, headers: { ...corsHeaders, ...jsonHeaders } },
      );
    }

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { todayStr, resetISO } = getTodayAndResetWIB();

    // Ambil plan & limit
    const { data: planRow, error: planErr } = await supa
      .from("user_plans")
      .select("plan_type, ai_daily_limit")
      .eq("user_id", userId)
      .maybeSingle();

    if (planErr) {
      console.error("ai-quota-status planErr:", planErr);
    }

    let limit = 0;
    let planType = "none";

    if (planRow) {
      planType = String(planRow.plan_type || "none");
      if (typeof planRow.ai_daily_limit === "number") {
        limit = planRow.ai_daily_limit;
      } else {
        // fallback default
        if (planType === "lifetime") limit = 50;
        else if (planType === "monthly") limit = 20;
        else limit = 0;
      }
    }

    // Ambil usage hari ini
    const { data: usageRow, error: usageErr } = await supa
      .from("ai_usage")
      .select("requests_count")
      .eq("user_id", userId)
      .eq("usage_date", todayStr)
      .maybeSingle();

    if (usageErr) {
      console.error("ai-quota-status usageErr:", usageErr);
    }

    const usedToday = usageRow?.requests_count ?? 0;
    const remaining = Math.max(0, limit - usedToday);

    return new Response(
      JSON.stringify({
        limit,
        usedToday,
        remaining,
        resetTime: resetISO,
        planType,
        today: todayStr,
      }),
      { status: 200, headers: { ...corsHeaders, ...jsonHeaders } },
    );
  } catch (e) {
    console.error("❌ ai-quota-status error:", e);
    return new Response(
      JSON.stringify({ error: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, ...jsonHeaders } },
    );
  }
});