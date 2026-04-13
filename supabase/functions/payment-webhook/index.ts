// Midtrans HTTP notification + generic fallback. Deploy: supabase functions deploy payment-webhook --no-verify-jwt
// Dashboard: set Notification URL to https://<ref>.supabase.co/functions/v1/payment-webhook
// Secrets: MIDTRANS_SERVER_KEY (for SHA512 verification), RESEND_API_KEY, EMAIL_FROM (optional email)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { processAffiliateCommission } from "../_shared/affiliateCommission.ts";

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

async function sendLicenseEmail(opts: {
  to: string;
  licenseKey: string;
  downloadUrl: string;
  from: string;
  resendKey: string;
}): Promise<{ ok: boolean; status: number; body: string }> {
  const { to, licenseKey, downloadUrl, from, resendKey } = opts;
  const html = `
    <p>Thank you for purchasing Macfyi.</p>
    <p><strong>Your license key:</strong> <code>${licenseKey}</code></p>
    <p>Use the <strong>same email address</strong> as at checkout when activating the app.</p>
    <p><a href="${downloadUrl}">Download Macfyi (DMG)</a></p>
    <p>Activation: open Macfyi and enter your email + license key on the first screen.</p>
  `;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Your Macfyi license and download",
      html,
    }),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
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

    await supabase.from("payment_events").insert({
      id: eventId,
      provider: isMidtrans ? "midtrans" : "generic",
      payload,
      processed: true,
    });

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
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const emailFrom = Deno.env.get("EMAIL_FROM");

    let emailSent: boolean | null = null;
    if (email && resendKey && emailFrom) {
      const fromLabel = settings?.email_from_name?.trim() || "Macfyi";
      const r = await sendLicenseEmail({
        to: email,
        licenseKey: rawLicense,
        downloadUrl,
        from: `${fromLabel} <${emailFrom}>`,
        resendKey,
      });
      emailSent = r.ok;
      if (!r.ok) {
        console.error("resend_failed", r.status, r.body);
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
