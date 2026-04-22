// Midtrans HTTP notification + Lynk.id (HMAC) + generic fallback. Deploy: supabase functions deploy payment-webhook --no-verify-jwt
// Dashboard Midtrans: Notification URL → …/payment-webhook
// Dashboard Lynk: webhook/callback URL → …/payment-webhook
// Secrets: MIDTRANS_SERVER_KEY, LYNK_WEBHOOK_SECRET (optional), LYNK_WEBHOOK_SIGNATURE_HEADER (default x-lynk-signature), SMTP_*, EMAIL_FROM

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { processAffiliateCommission } from "../_shared/affiliateCommission.ts";
import { verifyMidtransSignature } from "../_shared/midtransSignature.ts";
import { sendResendHtml } from "../_shared/resendHtml.ts";

async function sha256hex(plain: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(plain));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const x = a.toLowerCase().replace(/^0x/, "");
  const y = b.toLowerCase().replace(/^0x/, "").replace(/^sha256=/i, "");
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) {
    diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  }
  return diff === 0;
}

function extractOrderId(payload: Record<string, unknown>, isMidtrans: boolean): string {
  if (isMidtrans) return String(payload.order_id ?? "");
  const data = payload.data;
  const nested =
    data && typeof data === "object"
      ? (data as Record<string, unknown>).reference_id ??
        (data as Record<string, unknown>).order_id ??
        (data as Record<string, unknown>).external_id
      : undefined;
  return String(
    payload.order_id ??
      payload.reference_id ??
      payload.reference ??
      payload.external_id ??
      nested ??
      ""
  );
}

function isLynkPaidStatus(payload: Record<string, unknown>): boolean {
  const s = String(payload.status ?? payload.payment_status ?? payload.transaction_status ?? "").toLowerCase();
  return s === "paid" || s === "success" || s === "completed" || s === "settlement";
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

    const rawBody = await req.text();
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
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

    const lynkSecret = Deno.env.get("LYNK_WEBHOOK_SECRET")?.trim();
    const sigHeaderName = (Deno.env.get("LYNK_WEBHOOK_SIGNATURE_HEADER") ?? "x-lynk-signature").trim();
    const sigValRaw = req.headers.get(sigHeaderName) ?? req.headers.get(sigHeaderName.toLowerCase());
    const sigVal = sigValRaw?.trim() ?? "";

    const orderId = extractOrderId(payload, isMidtrans);

    let isLynkSigOk = false;
    if (!isMidtrans && lynkSecret) {
      if (!sigVal) {
        if (orderId.startsWith("MFY-")) {
          return new Response(JSON.stringify({ ok: false, error: "missing_lynk_signature" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }
      } else {
        const expectedHex = await hmacSha256Hex(lynkSecret, rawBody);
        isLynkSigOk = timingSafeEqualHex(expectedHex, sigVal);
        if (!isLynkSigOk) {
          return new Response(JSON.stringify({ ok: false, error: "invalid_lynk_signature" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
    }

    const transactionId = String(payload.transaction_id ?? "");
    const txStatus = String(
      payload.transaction_status ?? payload.status ?? payload.payment_status ?? "unknown"
    );
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
      : isLynkSigOk
        ? isLynkPaidStatus(payload)
        : payload.status === "paid" ||
          payload.transaction_status === "settlement" ||
          isLynkPaidStatus(payload);

    if ((isMidtrans || isLynkSigOk) && orderId) {
      const statusLabel = String(
        payload.transaction_status ?? payload.status ?? payload.payment_status ?? "unknown"
      );
      await supabase
        .from("payment_transactions")
        .update({
          status: statusLabel,
          midtrans_transaction_id: isMidtrans ? transactionId || null : null,
          raw_last_payload: payload,
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", orderId);
    }

    if (!paid) {
      await supabase.from("payment_events").insert({
        id: eventId,
        provider: isMidtrans ? "midtrans" : isLynkSigOk ? "lynk" : "generic",
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
        provider: isMidtrans ? "midtrans" : isLynkSigOk ? "lynk" : "generic",
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

    const grossFromPayload = parseGrossAmountIdr(payload);
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
        .update({ stage: "customer", last_activity_at: tsNow, updated_at: tsNow })
        .eq("id", crmCid);
      await supabase.from("crm_events").insert({
        contact_id: crmCid,
        event_type: "purchase_completed",
        payload: { order_id: orderId || null, email },
      });
    }

    await supabase.from("payment_events").insert({
      id: eventId,
      provider: isMidtrans ? "midtrans" : isLynkSigOk ? "lynk" : "generic",
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
