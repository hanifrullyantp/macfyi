// Supabase Edge Function: monefyi-admin-users
// -------------------------------------------
// Endpoint admin untuk mengambil daftar user & membership plan.
// Hanya boleh dipanggil oleh admin (profiles.role = 'admin').
//
// Request (POST JSON):
// {
//   "q"?: string,          // substring email (opsional)
//   "plan"?: string,       // "all" | "none" | "monthly" | "lifetime" (default: "all")
//   "status"?: string      // "all" | "active" | "expired" | "none" (default: "all")
// }
//
// Response:
// {
//   "ok": true,
//   "items": [ { ... } ],
//   "total": number
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...jsonHeaders },
  });
}

// Decode JWT manual untuk ambil user_id (sub)
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
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const SUPABASE_URL = pickEnv("SUPABASE_URL");
    const SERVICE_ROLE = pickEnv("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return json(
        { error: "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" },
        500,
      );
    }

    const authHeader = req.headers.get("Authorization") || "";
    const callerId = decodeUserIdFromAuthHeader(authHeader);
    if (!callerId) {
      return json({ error: "Unauthorized (invalid token)" }, 401);
    }

    const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) Pastikan caller adalah admin (profiles.role = 'admin')
    const { data: callerProfile, error: profErr } = await supa
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .maybeSingle();

    if (profErr) {
      console.error("monefyi-admin-users profErr:", profErr);
      return json({ error: "Failed to load profile" }, 500);
    }

    const callerRole = String(callerProfile?.role || "").toLowerCase();
    if (callerRole !== "admin") {
      return json({ error: "Forbidden (admin only)" }, 403);
    }

    // 2) Parse filter dari body
    const body = await req.json().catch(() => ({}));
    const q = String(body?.q || "").trim().toLowerCase();
    const planFilter = String(body?.plan || "all").toLowerCase();   // "all" | "none" | "monthly" | "lifetime"
    const statusFilter = String(body?.status || "all").toLowerCase(); // "all" | "active" | "expired" | "none"

    const page = Math.max(1, Number(body?.page || 1));
    const perPage = Math.min(200, Math.max(1, Number(body?.pageSize || 100)));

    // 3) Ambil list user dari auth.admin.listUsers
    const { data: listData, error: listErr } = await supa.auth.admin.listUsers({
      page,
      perPage,
    });

    if (listErr) {
      console.error("monefyi-admin-users listUsers error:", listErr);
      return json({ error: "Failed to list users" }, 500);
    }

    let users = listData?.users || [];

    // Filter by q (email substring) jika ada
    if (q) {
      users = users.filter((u) =>
        String(u.email || "").toLowerCase().includes(q)
      );
    }

    const ids = users.map((u) => u.id);
    if (ids.length === 0) {
      return json({ ok: true, items: [], total: 0 }, 200);
    }

    // 4) Ambil user_plans & profiles untuk id tersebut
    const { data: planRows, error: planErr } = await supa
      .from("user_plans")
      .select("user_id, plan_type, expires_at, ai_daily_limit")
      .in("user_id", ids);

    if (planErr) {
      console.error("monefyi-admin-users planErr:", planErr);
      return json({ error: "Failed to load user_plans" }, 500);
    }

    const { data: profileRows, error: prof2Err } = await supa
      .from("profiles")
      .select("id, name, role")
      .in("id", ids);

    if (prof2Err) {
      console.error("monefyi-admin-users profilesErr:", prof2Err);
      return json({ error: "Failed to load profiles" }, 500);
    }

    const planByUser = new Map<string, any>();
    for (const p of planRows || []) {
      if (p?.user_id) planByUser.set(p.user_id, p);
    }

    const profileByUser = new Map<string, any>();
    for (const p of profileRows || []) {
      if (p?.id) profileByUser.set(p.id, p);
    }

    // 5) Susun items
    const now = new Date();
    const items = [];

    for (const u of users) {
      const planRow = planByUser.get(u.id) || null;
      const prof = profileByUser.get(u.id) || {};
      const planType = String(planRow?.plan_type || "none").toLowerCase();
      const expiresAt = planRow?.expires_at || null;
      const aiDailyLimit =
        typeof planRow?.ai_daily_limit === "number"
          ? planRow.ai_daily_limit
          : null;

      let planStatus: "none" | "active" | "expired" = "none";
      if (planType === "none") {
        planStatus = "none";
      } else {
        if (!expiresAt) {
          planStatus = "active";
        } else {
          const exp = new Date(String(expiresAt));
          planStatus = exp.getTime() > now.getTime() ? "active" : "expired";
        }
      }

      // Filter oleh planFilter
      if (planFilter !== "all" && planType !== planFilter) continue;
      // Filter oleh statusFilter
      if (statusFilter !== "all" && planStatus !== statusFilter) continue;

      const name =
        prof?.name ||
        u.user_metadata?.name ||
        (u.email ? String(u.email).split("@")[0] : "");

      items.push({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        name,
        plan_type: planType,
        plan_status: planStatus,
        expires_at: expiresAt,
        ai_daily_limit: aiDailyLimit,
        profile_role: prof?.role || null,
      });
    }

    // Bisa tambahkan sort (mis. created_at desc)
    items.sort((a, b) => {
      if (!a.created_at || !b.created_at) return 0;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return json(
      {
        ok: true,
        items,
        total: items.length,
        page,
        pageSize: perPage,
      },
      200,
    );
  } catch (e) {
    console.error("❌ monefyi-admin-users error:", e);
    return json({ error: String(e?.message || e) }, 500);
  }
});