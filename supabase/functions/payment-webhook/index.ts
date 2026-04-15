// Midtrans HTTP notification + generic fallback. Deploy: supabase functions deploy payment-webhook --no-verify-jwt
// Dashboard: set Notification URL to https://<ref>.supabase.co/functions/v1/payment-webhook
// Secrets: MIDTRANS_SERVER_KEY (for SHA512 verification), SMTP_*, EMAIL_FROM (optional license email)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { processAffiliateCommission } from "../_shared/affiliateCommission.ts";
import { sendResendHtml } from "../_shared/resendHtml.ts";

async function sha256hex(plain: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(plain));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha512hex(plain: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-512", new TextEncoder().encode(plain));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Midtrans: SHA512(order_id + status_code + gross_amount + server_key) */
async function verifyMidtransSignature(
  payload: Record<string, unknown>,
  serverKey: string
): Promise<boolean> {
  const orderId = String(payload.order_id ?? "");
  const statusCode = String(payload.status_code ?? "");
  const grossAmount = String(payload.gross_amount ?? "");
  const sig = String(payload.signature_key ?? "").toLowerCase();
  if (!orderId || !statusCode || !grossAmount || !sig) return false;
  const raw = orderId + statusCode + grossAmount + serverKey;
  const hex = await sha512hex(raw);
  return hex.toLowerCase() === sig;
}

function isMidtransPaymentComplete(payload: Record<string, unknown>): boolean {
  const ts = String(payload.transaction_status ?? "");
  const fraud = String(payload.fraud_status ?? "accept");
  if (ts === "settlement") return true;
  if (ts === "capture" && fraud === "accept") return true;
  return false;
}

Deno.serve(async (req) => {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const midtransServerKey = Deno.env.get("MIDTRANS_SERVER_KEY")?.trim();

    if (!url || !key) {
      return new Response("misconfigured", { status: 500 });
    }

    let payload: Record<string, unknown>;
    try {
      payload = (await req.json()) as Record<string, unknown>;
    } catch {
      return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const isMidtrans = Boolean(payload.signature_key && payload.order_id && payload.status_code);
    if (isMidtrans) {
      if (!midtransServerKey) {
        console.error("MIDTRANS_SERVER_KEY missing but Midtrans-shaped notification received");
        return new Response(JSON.stringify({ ok: false, error: "midtrans_not_configured" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      const okSig = await verifyMidtransSignature(payload, midtransServerKey);
      if (!okSig) {
        return new Response(JSON.stringify({ ok: false, error: "invalid_signature" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const transactionId = String(payload.transaction_id ?? "");
    const orderId = String(payload.order_id ?? "");
    const txStatus = String(payload.transaction_status ?? "unknown");
    /** One row per Midtrans notification (same tx id can appear as pending then settlement). */
    const eventId = transactionId
      ? `${transactionId}_${txStatus}`
      : `${orderId}_${txStatus}_${String(payload.status_code ?? "")}`;

    const supabase = createClient(url, key);

    const { data: dup } = await supabase.from("payment_events").select("id").eq("id", eventId).maybeSingle();
    if (dup) {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const paid = isMidtrans
      ? isMidtransPaymentComplete(payload)
      : payload.status === "paid" || payload.transaction_status === "settlement";

    if (isMidtrans && orderId) {
      const statusLabel = String(payload.transaction_status ?? "unknown");
      await supabase
        .from("payment_transactions")
        .update({
          status: statusLabel,
          midtrans_transaction_id: transactionId || null,
          raw_last_payload: payload,
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", orderId);
    }

    if (!paid) {
      await supabase.from("payment_events").insert({
        id: eventId,
        provider: isMidtrans ? "midtrans" : "generic",
        payload,
        processed: false,
      });
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let email = "";
    if (orderId) {
      const { data: row } = await supabase
        .from("payment_transactions")
        .select("email, gross_amount_idr")
        .eq("order_id", orderId)
        .maybeSingle();
      email = String(row?.email ?? "").toLowerCase().trim();
    }
    if (!email) {
      email = String(
        payload.customer_email ?? payload.email ?? (payload as { customer_details?: { email?: string } }).customer_details?.email ?? ""
      )
        .toLowerCase()
        .trim();
    }

    if (!email) {
      await supabase.from("payment_events").insert({
        id: eventId,
        provider: isMidtrans ? "midtrans" : "generic",
        payload,
        processed: false,
      });
      return new Response(JSON.stringify({ ok: false, error: "no_buyer_email", order_id: orderId }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const rawLicense = crypto.randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase();
    const license_key_hash = await sha256hex(rawLicense);

    const grossFromPayload = parseInt(String(payload.gross_amount ?? "0").split(".")[0], 10);
    const { data: pt } = orderId
      ? await supabase.from("payment_transactions").select("gross_amount_idr").eq("order_id", orderId).maybeSingle()
      : { data: null };
    const pricePaid = Number.isFinite(grossFromPayload) && grossFromPayload > 0
      ? grossFromPayload
      : Number(pt?.gross_amount_idr ?? 173000);

    await supabase.from("licenses").insert({
      email,
      license_key_hash,
      price_paid_idr: pricePaid,
      status: "active",
    });

    const tsNow = new Date().toISOString();
    let crmCid: string | null = null;
    if (orderId) {
      const { data: ptRow } = await supabase
        .from("payment_transactions")
        .select("crm_contact_id")
        .eq("order_id", orderId)
        .maybeSingle();
      crmCid = (ptRow?.crm_contact_id as string) ?? null;
    }
    if (!crmCid) {
      const { data: lead } = await supabase
        .from("crm_contacts")
        .select("id")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      crmCid = (lead?.id as string) ?? null;
    }
    if (crmCid) {
      await supabase
        .from("crm_contacts")
        .update({ stage: "PAID", last_activity_at: tsNow, updated_at: tsNow })
        .eq("id", crmCid);
      await supabase.from("crm_events").insert({
        contact_id: crmCid,
        event_type: "purchase_completed",
        payload: { order_id: orderId || null, email },
      });
    }

    await supabase.from("payment_events").insert({
      id: eventId,
      provider: isMidtrans ? "midtrans" : "generic",
      payload,
      processed: true,
    });

    if (orderId) {
      const { error: logIns } = await supabase.from("promo_slot_decrement_log").insert({ order_id: orderId });
      if (!logIns) {
        const { data: aset } = await supabase
          .from("app_settings")
          .select("promo_slots_remaining")
          .eq("id", "default")
          .maybeSingle();
        const cur = aset?.promo_slots_remaining;
        if (cur != null && Number.isFinite(Number(cur)) && Math.round(Number(cur)) > 0) {
          await supabase
            .from("app_settings")
            .update({
              promo_slots_remaining: Math.max(0, Math.round(Number(cur)) - 1),
              promo_updated_at: new Date().toISOString(),
            })
            .eq("id", "default");
        }
      } else if (logIns.code !== "23505") {
        console.error("promo_slot_decrement_log_insert", logIns);
      }
    }

    try {
      await processAffiliateCommission(supabase, orderId, pricePaid);
    } catch (affErr) {
      console.error("affiliate_commission_error", affErr);
    }

    const { data: settings } = await supabase
      .from("app_settings")
      .select("download_base_url, email_from_name, lifetime_price_idr")
      .eq("id", "default")
      .maybeSingle();

    const downloadUrl =
      settings?.download_base_url?.trim() || "https://YOUR_CDN/macfyi.dmg";
    const emailFrom = Deno.env.get("EMAIL_FROM")?.trim();
    const smtpReady =
      Boolean(Deno.env.get("SMTP_HOST")?.trim()) &&
      Boolean(Deno.env.get("SMTP_USER")?.trim()) &&
      Boolean(Deno.env.get("SMTP_PASS")?.trim());

    const activateDeep = `macfyi://activate?email=${encodeURIComponent(email)}&license=${encodeURIComponent(rawLicense)}`;

    let emailSent: boolean | null = null;
    if (email && smtpReady && emailFrom) {
      const fromLabel = settings?.email_from_name?.trim() || "Macfyi";
      const html = `
    <p>Thank you for purchasing Macfyi.</p>
    <p><strong>Your license key:</strong> <code>${rawLicense}</code></p>
    <p>Use the <strong>same email address</strong> as at checkout when activating the app.</p>
    <p><a href="${activateDeep}">Activate in Macfyi (app)</a> — if the link does not open, copy the key above and paste it in the app.</p>
    <p><a href="${downloadUrl}">Download Macfyi (DMG)</a></p>
  `;
      const r = await sendResendHtml({
        supabase,
        to: [email],
        subject: "Your Macfyi license and download",
        html,
        fromOverride: `${fromLabel} <${emailFrom}>`,
      });
      emailSent = r.ok;
      if (!r.ok) {
        console.error("license_email_failed", r.status, r.error ?? "");
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        note: "license_issued",
        email_sent: emailSent,
        license_key: rawLicense,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response("error", { status: 500 });
  }
});
