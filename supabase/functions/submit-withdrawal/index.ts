// Affiliate menarik saldo. Deploy: supabase functions deploy submit-withdrawal --no-verify-jwt
// Header: Authorization: Bearer <user access token>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { asBool, asNumber, getPlatformSetting } from "../_shared/platformSettings.ts";
import { withdrawalRequestAdminEmail } from "../_shared/emailTemplates.ts";
import { parseAlertEmails, sendResendHtml } from "../_shared/resendHtml.ts";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function startOfUtcDay(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function computeFee(
  amount: number,
  feeType: string,
  feeVal: number
): number {
  if (feeType === "percent") {
    return Math.max(0, Math.round((amount * feeVal) / 100));
  }
  return Math.max(0, Math.round(feeVal));
}

async function listAdminUserIds(supabase: ReturnType<typeof createClient>): Promise<string[]> {
  const ids: string[] = [];
  let page = 1;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) {
      if (u.app_metadata?.role === "admin") ids.push(u.id);
    }
    if (data.users.length < 200) break;
    page++;
  }
  return ids;
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
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "invalid_token" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const uid = userData.user.id;

  let body: {
    amount_idr?: number;
    method?: string;
    account_details?: Record<string, unknown>;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const amount = Math.floor(Number(body.amount_idr));
  const method = String(body.method ?? "").trim() as "bank" | "ewallet";
  const account = body.account_details && typeof body.account_details === "object" ? body.account_details : null;

  if (!Number.isFinite(amount) || amount <= 0) {
    return new Response(JSON.stringify({ error: "invalid_amount" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  if (method !== "bank" && method !== "ewallet") {
    return new Response(JSON.stringify({ error: "invalid_method" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  if (!account || Object.keys(account).length === 0) {
    return new Response(JSON.stringify({ error: "invalid_account_details" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const minAmt = asNumber(await getPlatformSetting(supabase, "withdrawal.min_amount_idr"), 100_000);
  const maxDay = asNumber(await getPlatformSetting(supabase, "withdrawal.max_per_day_idr"), 10_000_000);
  const feeType = String(await getPlatformSetting(supabase, "withdrawal.fee_type") ?? "fixed").replace(/"/g, "");
  const feeVal = asNumber(await getPlatformSetting(supabase, "withdrawal.fee_value_idr"), 0);
  const autoApprove = asBool(await getPlatformSetting(supabase, "withdrawal.auto_approve"), false);

  if (amount < minAmt) {
    return new Response(JSON.stringify({ error: "below_minimum", min_amount_idr: minAmt }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { data: aff, error: affErr } = await supabase
    .from("affiliates")
    .select("id, slug, status, balance_available_idr, user_id")
    .eq("user_id", uid)
    .maybeSingle();

  if (affErr || !aff || aff.status !== "active") {
    return new Response(JSON.stringify({ error: "affiliate_not_active" }), {
      status: 403,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const feeIdr = computeFee(amount, feeType, feeVal);
  const totalDebit = amount + feeIdr;
  const bal = Number(aff.balance_available_idr) || 0;
  if (bal < totalDebit) {
    return new Response(JSON.stringify({ error: "insufficient_balance", balance_available_idr: bal }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { data: todayRows } = await supabase
    .from("withdrawal_requests")
    .select("amount_idr")
    .eq("affiliate_id", aff.id)
    .neq("status", "rejected")
    .gte("created_at", startOfUtcDay());

  const todaySum = (todayRows ?? []).reduce((s, r) => s + (Number(r.amount_idr) || 0), 0);
  if (todaySum + amount > maxDay) {
    return new Response(JSON.stringify({ error: "exceeds_daily_limit", max_per_day_idr: maxDay, used_today_idr: todaySum }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const initialStatus = autoApprove ? "approved" : "pending";
  const now = new Date().toISOString();

  const { data: ins, error: insErr } = await supabase
    .from("withdrawal_requests")
    .insert({
      affiliate_id: aff.id,
      amount_idr: amount,
      fee_idr: feeIdr,
      method,
      account_details: account,
      status: initialStatus,
      updated_at: now,
    })
    .select("id")
    .single();

  if (insErr || !ins) {
    console.error("withdrawal_insert", insErr);
    return new Response(JSON.stringify({ error: "db_error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { error: balErr } = await supabase
    .from("affiliates")
    .update({
      balance_available_idr: bal - totalDebit,
      updated_at: now,
    })
    .eq("id", aff.id);

  if (balErr) {
    console.error("balance_update", balErr);
    await supabase.from("withdrawal_requests").delete().eq("id", ins.id);
    return new Response(JSON.stringify({ error: "db_error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  await supabase.from("notifications").insert({
    user_id: uid,
    type: "withdrawal_submitted",
    title: "Permintaan penarikan dikirim",
    body: `Jumlah Rp ${amount.toLocaleString("id-ID")} (${method}). Status: ${initialStatus}.`,
    link: "/member/penarikan",
  });

  const adminIds = await listAdminUserIds(supabase);
  for (const aid of adminIds) {
    await supabase.from("notifications").insert({
      user_id: aid,
      type: "withdrawal_admin_alert",
      title: "Penarikan affiliate baru",
      body: `${aff.slug} — Rp ${amount.toLocaleString("id-ID")}`,
      link: "/penarikan",
    });
  }

  const accountSummary = JSON.stringify(account).slice(0, 2000);
  const affiliateEmail = userData.user.email ?? undefined;
  const alertEmails = parseAlertEmails();
  const { subject, html } = withdrawalRequestAdminEmail({
    amountIdr: amount,
    feeIdr: feeIdr,
    method,
    affiliateSlug: aff.slug,
    affiliateEmail,
    accountSummary,
  });
  for (const em of alertEmails) {
    await sendResendHtml({
      supabase,
      to: [em],
      subject,
      html,
      platformToggleKey: "email.withdrawal_request_to_admin",
    });
  }

  return new Response(JSON.stringify({ ok: true, id: ins.id, status: initialStatus }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
