// Create Lynk.id (or compatible) hosted checkout — server-side. Deploy: supabase functions deploy create-lynk-checkout --no-verify-jwt
// Secrets: LYNK_CREATE_URL (full POST URL), LYNK_BEARER_TOKEN (Authorization: Bearer …)
// Optional: LYNK_AUTH_HEADER = "Authorization" | "X-Api-Key" (default Authorization)
// Body/response mapping defaults below; adjust to match https://documenter.getpostman.com/view/43601478/2sBXc8o3kn

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { asBool, getPlatformSetting } from "../_shared/platformSettings.ts";
import { resolveMidtransCheckoutPricing } from "../_shared/checkoutPricing.ts";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
}

function cleanPhone(d: string): string {
  const x = d.replace(/\D/g, "");
  return x.length >= 10 && x.length <= 15 ? x : "";
}

function pickUrl(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  const direct = ["checkout_url", "payment_url", "pay_url", "url", "redirect_url", "link"];
  for (const k of direct) {
    const v = o[k];
    if (typeof v === "string" && /^https?:\/\//i.test(v)) return v;
  }
  const data = o.data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    for (const k of direct) {
      const v = d[k];
      if (typeof v === "string" && /^https?:\/\//i.test(v)) return v;
    }
  }
  const result = o.result;
  if (result && typeof result === "object") {
    const r = result as Record<string, unknown>;
    for (const k of direct) {
      const v = r[k];
      if (typeof v === "string" && /^https?:\/\//i.test(v)) return v;
    }
  }
  return null;
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
    const lynkUrl = Deno.env.get("LYNK_CREATE_URL")?.trim();
    const bearer = Deno.env.get("LYNK_BEARER_TOKEN")?.trim() ?? Deno.env.get("LYNK_API_KEY")?.trim();

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "server_misconfigured" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!lynkUrl || !/^https?:\/\//i.test(lynkUrl) || !bearer) {
      return new Response(
        JSON.stringify({
          error: "lynk_misconfigured",
          hint: "Set LYNK_CREATE_URL (full HTTPS POST URL) and LYNK_BEARER_TOKEN (or LYNK_API_KEY)",
        }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
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

    const referralSlugRaw = String(body.referral_slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    let affiliateId: string | null = null;
    let referralSlugSaved: string | null = null;

    if (referralSlugRaw.length >= 2) {
      const { data: affRow } = await supabase
        .from("affiliates")
        .select("id, user_id")
        .eq("slug", referralSlugRaw)
        .eq("status", "active")
        .maybeSingle();

      if (affRow) {
        const allowSelf = asBool(await getPlatformSetting(supabase, "affiliate.allow_self_referral"), false);
        let blockSelf = false;
        const authHeader = req.headers.get("Authorization") ?? "";
        if (authHeader.startsWith("Bearer ") && !allowSelf) {
          const jwt = authHeader.slice(7).trim();
          if (jwt.length > 20) {
            const { data: userRes, error: userErr } = await supabase.auth.getUser(jwt);
            if (!userErr && userRes.user?.id && userRes.user.id === affRow.user_id) {
              blockSelf = true;
            }
          }
        }
        if (!blockSelf) {
          affiliateId = affRow.id;
          referralSlugSaved = referralSlugRaw;
        }
      }
    }

    const visitorId = String(body.visitor_id ?? "").trim();

    const { data: settings } = await supabase
      .from("app_settings")
      .select("lifetime_price_idr, checkout_success_base_url, promo_plan, promo_slots_remaining, checkout_coupons")
      .eq("id", "default")
      .maybeSingle();

    let crmContactId: string | null = null;
    if (visitorId.length >= 8) {
      const { data: lead } = await supabase
        .from("crm_contacts")
        .select("id")
        .eq("visitor_id", visitorId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      crmContactId = (lead?.id as string) ?? null;
    }
    if (!crmContactId) {
      const { data: byEmail } = await supabase
        .from("crm_contacts")
        .select("id")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      crmContactId = (byEmail?.id as string) ?? null;
    }

    const couponCodeRaw = body.coupon_code != null ? String(body.coupon_code).trim() : "";
    const skipAutoCoupon = Boolean(body.skip_auto_coupon);

    const priced = resolveMidtransCheckoutPricing({
      appRow: {
        lifetime_price_idr: settings?.lifetime_price_idr,
        promo_plan: settings?.promo_plan ?? null,
        promo_slots_remaining: settings?.promo_slots_remaining ?? null,
        checkout_coupons: settings?.checkout_coupons ?? null,
      },
      couponCode: couponCodeRaw || null,
      skipAutoCoupon,
      now: new Date(),
    });

    if (!priced.ok) {
      if (priced.error === "promo_slots_exhausted") {
        return new Response(JSON.stringify({ error: "promo_slots_exhausted" }), {
          status: 409,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      if (priced.error === "invalid_coupon") {
        return new Response(JSON.stringify({ error: "invalid_coupon" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "multiple_auto_coupon" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const grossAmount = priced.grossAmount;
    const orderId = `MFY-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    const finishBase = String(settings?.checkout_success_base_url ?? "").trim().replace(/\/$/, "");
    const finishUrl = finishBase
      ? `${finishBase}/checkout/success?order_id=${encodeURIComponent(orderId)}`
      : undefined;

    const notifyUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/payment-webhook`;

    const { error: insErr } = await supabase.from("payment_transactions").insert({
      order_id: orderId,
      email,
      customer_name: name,
      phone,
      gross_amount_idr: grossAmount,
      base_amount_idr: priced.baseAmount,
      discount_idr: priced.discountIdr,
      coupon_id: priced.couponId,
      coupon_code: priced.couponCode,
      status: "pending",
      provider: "lynk",
      affiliate_id: affiliateId,
      referral_slug: referralSlugSaved,
      referral_attribution: referralSlugSaved
        ? { slug: referralSlugSaved, source: "referral_link" }
        : {},
      crm_contact_id: crmContactId,
    });

    if (insErr) {
      console.error("payment_transactions_insert", insErr);
      return new Response(JSON.stringify({ error: "db_insert_failed" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    /** Default JSON shape — edit if Lynk Postman collection differs. */
    const lynkBody: Record<string, unknown> = {
      reference: orderId,
      reference_id: orderId,
      external_id: orderId,
      order_id: orderId,
      amount: grossAmount,
      currency: "IDR",
      description: "Macfyi Lifetime (1 Mac)",
      title: "Macfyi Lifetime",
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      success_redirect_url: finishUrl,
      return_url: finishUrl,
      callback_url: notifyUrl,
      notify_url: notifyUrl,
      webhook_url: notifyUrl,
    };

    const authMode = (Deno.env.get("LYNK_AUTH_MODE") ?? "bearer").toLowerCase();
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (authMode === "x-api-key" || authMode === "apikey") {
      headers["X-Api-Key"] = bearer;
    } else {
      headers.Authorization = `Bearer ${bearer}`;
    }

    const lynkRes = await fetch(lynkUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(lynkBody),
    });

    const lynkJson = await lynkRes.json().catch(() => ({}));
    if (!lynkRes.ok) {
      console.error("lynk_create_error", lynkRes.status, lynkJson);
      return new Response(
        JSON.stringify({
          error: "lynk_rejected",
          status: lynkRes.status,
          details: lynkJson,
        }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const checkoutUrl = pickUrl(lynkJson);
    if (!checkoutUrl) {
      return new Response(
        JSON.stringify({
          error: "lynk_no_checkout_url",
          hint: "Response had no recognizable payment URL; extend pickUrl() or set LYNK_CREATE_URL to an endpoint that returns checkout_url / payment_url / data.url",
          details: lynkJson,
        }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        checkout_url: checkoutUrl,
        order_id: orderId,
        gross_amount_idr: grossAmount,
        base_amount_idr: priced.baseAmount,
        discount_idr: priced.discountIdr,
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
