// Admin memperbarui status penarikan + refund bila ditolak. Deploy: supabase functions deploy admin-withdrawal --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { withdrawalProcessedAffiliateEmail } from "../_shared/emailTemplates.ts";
import { sendResendHtml } from "../_shared/resendHtml.ts";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isAdminUser(user: { app_metadata?: Record<string, unknown> } | null): boolean {
  return user?.app_metadata?.role === "admin";
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
  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: "misconfigured" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(url, serviceKey);
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !isAdminUser(userData.user)) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: {
    id?: string;
    status?: string;
    admin_note?: string;
    proof_url?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const id = String(body.id ?? "").trim();
  const nextStatus = String(body.status ?? "").trim() as "pending" | "approved" | "rejected" | "completed";
  if (!id || !["pending", "approved", "rejected", "completed"].includes(nextStatus)) {
    return new Response(JSON.stringify({ error: "invalid_body" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { data: row, error: loadErr } = await supabase
    .from("withdrawal_requests")
    .select("id, status, amount_idr, fee_idr, affiliate_id")
    .eq("id", id)
    .maybeSingle();

  if (loadErr || !row) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { data: affRow } = await supabase
    .from("affiliates")
    .select("user_id, slug")
    .eq("id", row.affiliate_id)
    .maybeSingle();

  const prev = row.status as string;
  if (prev === "completed" || prev === "rejected") {
    return new Response(JSON.stringify({ error: "terminal_state" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const amount = Number(row.amount_idr) || 0;
  const fee = Number(row.fee_idr) || 0;
  const refundTotal = amount + fee;
  const affiliateUserId = affRow?.user_id as string | undefined;

  const now = new Date().toISOString();

  const needRefund = nextStatus === "rejected" && (prev === "pending" || prev === "approved");
  if (needRefund) {
    const { data: aff } = await supabase
      .from("affiliates")
      .select("balance_available_idr")
      .eq("id", row.affiliate_id)
      .single();
    const bal = Number(aff?.balance_available_idr) || 0;
    await supabase
      .from("affiliates")
      .update({
        balance_available_idr: bal + refundTotal,
        updated_at: now,
      })
      .eq("id", row.affiliate_id);
  }

  const { error: upErr } = await supabase
    .from("withdrawal_requests")
    .update({
      status: nextStatus,
      admin_note: body.admin_note?.trim() || null,
      proof_url: body.proof_url?.trim() || null,
      updated_at: now,
    })
    .eq("id", id);

  if (upErr) {
    console.error("withdrawal_update", upErr);
    return new Response(JSON.stringify({ error: "db_error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (affiliateUserId) {
    await supabase.from("notifications").insert({
      user_id: affiliateUserId,
      type: "withdrawal_status",
      title: "Status penarikan diperbarui",
      body: `Status: ${nextStatus}. Jumlah Rp ${amount.toLocaleString("id-ID")}.`,
      link: "/member/penarikan",
    });

    const { data: u } = await supabase.auth.admin.getUserById(affiliateUserId);
    const em = u.user?.email;
    if (em && (nextStatus === "completed" || nextStatus === "rejected")) {
      const tpl = withdrawalProcessedAffiliateEmail({
        status: nextStatus,
        amountIdr: amount,
        note: body.admin_note?.trim(),
      });
      await sendResendHtml({
        supabase,
        to: [em],
        subject: tpl.subject,
        html: tpl.html,
        platformToggleKey: "email.withdrawal_processed_to_affiliate",
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, id, status: nextStatus }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
