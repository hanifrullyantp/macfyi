// Public marketing + demo rule snapshot (no secrets). Deploy: supabase functions deploy public-config --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { asBool, asNumber, getPlatformSetting } from "../_shared/platformSettings.ts";
import { resolvePromoContext } from "../_shared/promoPlan.ts";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") {
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

  const supabase = createClient(url, key);
  const { data: app } = await supabase
    .from("app_settings")
    .select(
      "lifetime_price_idr, download_base_url, checkout_success_base_url, terms_url, privacy_url, config_version, product_version, promo_plan, promo_slots_remaining"
    )
    .eq("id", "default")
    .maybeSingle();

  const cfgVersion = Number(app?.config_version ?? 1) || 1;
  const baseIdr = Number(app?.lifetime_price_idr) > 0 ? Number(app?.lifetime_price_idr) : 173000;
  const serverNow = new Date();
  const promoResolved = resolvePromoContext({
    now: serverNow,
    baseLifetimeIdr: baseIdr,
    plan: app?.promo_plan ?? null,
    promoSlotsRemaining: app?.promo_slots_remaining ?? null,
  });
  const effectiveIdr =
    promoResolved.lifetime_price_idr > 0 ? promoResolved.lifetime_price_idr : 173000;

  const demo = {
    token_ttl_days: asNumber(await getPlatformSetting(supabase, "demo.token_ttl_days"), 14),
    clean_daily_gb_cap: asNumber(await getPlatformSetting(supabase, "demo.clean_daily_gb_cap"), 2),
    clean_daily_items_cap: asNumber(await getPlatformSetting(supabase, "demo.clean_daily_items_cap"), 30),
    clean_safe_risk_only: asBool(await getPlatformSetting(supabase, "demo.clean_safe_risk_only"), true),
    uninstall_actions_per_day: asNumber(await getPlatformSetting(supabase, "demo.uninstall_actions_per_day"), 1),
    ai_questions_per_day: asNumber(await getPlatformSetting(supabase, "demo.ai_questions_per_day"), 10),
  };

  const ai = {
    global_enabled: asBool(await getPlatformSetting(supabase, "ai.global_enabled"), true),
    default_model_id: String(await getPlatformSetting(supabase, "ai.default_model_id") ?? "lite-3b-q4").replace(/^"|"$/g, ""),
    max_output_tokens: asNumber(await getPlatformSetting(supabase, "ai.max_output_tokens"), 512),
  };

  const marketing = {
    notification_banner_enabled: asBool(await getPlatformSetting(supabase, "marketing.notification_banner_enabled"), false),
    social_toast_enabled: asBool(await getPlatformSetting(supabase, "marketing.social_toast_enabled"), false),
  };

  const seo = {
    ga4_measurement_id: String(await getPlatformSetting(supabase, "seo.ga4_measurement_id") ?? "").replace(/^"|"$/g, ""),
    facebook_pixel_id: String(await getPlatformSetting(supabase, "seo.facebook_pixel_id") ?? "").replace(/^"|"$/g, ""),
  };

  const body = {
    version: cfgVersion,
    server_time: serverNow.toISOString(),
    pricing: {
      lifetime_price_idr: effectiveIdr,
      currency: "IDR",
    },
    promo: {
      active: promoResolved.active,
      ends_at: promoResolved.ends_at,
      compare_at_idr: promoResolved.compare_at_idr,
      slots_initial_active: promoResolved.slots_initial_active,
      slots_remaining: promoResolved.slots_remaining,
      slots_display: promoResolved.slots_display,
      block_checkout_when_slots_zero: promoResolved.block_checkout_when_slots_zero,
    },
    download_url: String(app?.download_base_url ?? "").trim() || null,
    checkout_success_base_url: String(app?.checkout_success_base_url ?? "").trim() || null,
    terms_url: app?.terms_url ?? null,
    privacy_url: app?.privacy_url ?? null,
    product_version: app?.product_version ?? "1.0.0",
    demo,
    ai,
    marketing,
    seo,
  };

  return new Response(JSON.stringify(body), {
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=30" },
  });
});
