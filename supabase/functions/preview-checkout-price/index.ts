// Preview harga checkout + kupon (tanpa membuat transaksi). Deploy: supabase functions deploy preview-checkout-price --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveMidtransCheckoutPricing } from "../_shared/checkoutPricing.ts";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const coupon_code = body?.coupon_code != null ? String(body.coupon_code).trim() : "";
  const skip_auto_coupon = Boolean(body?.skip_auto_coupon);

  const supabase = createClient(url, key);
  const { data: settings } = await supabase
    .from("app_settings")
    .select("lifetime_price_idr, promo_plan, promo_slots_remaining, checkout_coupons")
    .eq("id", "default")
    .maybeSingle();

  const priced = resolveMidtransCheckoutPricing({
    appRow: {
      lifetime_price_idr: settings?.lifetime_price_idr,
      promo_plan: settings?.promo_plan ?? null,
      promo_slots_remaining: settings?.promo_slots_remaining ?? null,
      checkout_coupons: settings?.checkout_coupons ?? null,
    },
    couponCode: coupon_code || null,
    skipAutoCoupon: skip_auto_coupon,
    now: new Date(),
  });

  if (!priced.ok) {
    const status =
      priced.error === "promo_slots_exhausted" ? 409 : priced.error === "invalid_coupon" ? 400 : 500;
    return new Response(
      JSON.stringify({
        error: priced.error,
        compare_at_idr: priced.promoResolved.compare_at_idr,
        base_lifetime_idr:
          priced.promoResolved.lifetime_price_idr > 0 ? priced.promoResolved.lifetime_price_idr : 173000,
      }),
      { status, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      compare_at_idr: priced.compareAtIdr,
      base_lifetime_idr: priced.baseAmount,
      final_idr: priced.grossAmount,
      discount_idr: priced.discountIdr,
      coupon:
        priced.couponId && priced.couponCode
          ? { id: priced.couponId, code: priced.couponCode }
          : null,
    }),
    { headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } }
  );
});
