// Create Midtrans Snap token (server-side). Deploy: supabase functions deploy create-midtrans-snap --no-verify-jwt
// Secrets: MIDTRANS_SERVER_KEY, MIDTRANS_IS_PRODUCTION (optional, "true" | "false")

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SNAP_SANDBOX = "https://app.sandbox.midtrans.com/snap/v1/transactions";
const SNAP_PROD = "https://app.midtrans.com/snap/v1/transactions";

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
}

function cleanPhone(d: string): string {
  const x = d.replace(/\D/g, "");
  return x.length >= 10 && x.length <= 15 ? x : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY")?.trim();
    const clientKey = Deno.env.get("MIDTRANS_CLIENT_KEY")?.trim();
    const isProd = Deno.env.get("MIDTRANS_IS_PRODUCTION") === "true";

    if (!supabaseUrl || !serviceKey || !serverKey || !clientKey) {
      return new Response(
        JSON.stringify({ error: "server_misconfigured", hint: "MIDTRANS_SERVER_KEY and MIDTRANS_CLIENT_KEY required" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const email = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim().slice(0, 200);
    const phoneRaw = String(body.phone ?? "").trim();

    if (!name || name.length < 2) {
      return new Response(JSON.stringify({ error: "invalid_name" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "invalid_email" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const phone = cleanPhone(phoneRaw);
    if (!phone) {
      return new Response(JSON.stringify({ error: "invalid_phone" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: settings } = await supabase
      .from("app_settings")
      .select("lifetime_price_idr")
      .eq("id", "default")
      .maybeSingle();

    const grossAmount = Number(settings?.lifetime_price_idr) > 0 ? Number(settings?.lifetime_price_idr) : 173000;
    const orderId = `MFY-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    const snapBody = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      customer_details: {
        first_name: name.slice(0, 50),
        email,
        phone,
      },
      item_details: [
        {
          id: "macfyi-lifetime",
          price: grossAmount,
          quantity: 1,
          name: "Macfyi Lifetime (1 Mac)",
        },
      ],
    };

    const auth = btoa(`${serverKey}:`);
    const snapUrl = isProd ? SNAP_PROD : SNAP_SANDBOX;
    const midtransRes = await fetch(snapUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(snapBody),
    });

    const midtransJson = await midtransRes.json().catch(() => ({}));
    if (!midtransRes.ok) {
      console.error("midtrans_snap_error", midtransRes.status, midtransJson);
      return new Response(
        JSON.stringify({
          error: "midtrans_rejected",
          status: midtransRes.status,
          details: midtransJson,
        }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const token = String((midtransJson as { token?: string }).token ?? "");
    if (!token) {
      return new Response(JSON.stringify({ error: "no_snap_token", details: midtransJson }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { error: insErr } = await supabase.from("payment_transactions").insert({
      order_id: orderId,
      email,
      customer_name: name,
      phone,
      gross_amount_idr: grossAmount,
      status: "pending",
      provider: "midtrans",
    });

    if (insErr) {
      console.error("payment_transactions_insert", insErr);
      return new Response(JSON.stringify({ error: "db_insert_failed" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        snap_token: token,
        order_id: orderId,
        client_key: clientKey,
        is_production: isProd,
        gross_amount_idr: grossAmount,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
