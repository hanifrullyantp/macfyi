// Cron / scheduler: komisi jatuh tempo, tier, lifecycle event. Deploy: supabase functions deploy scheduled-ops --no-verify-jwt
// Header: Authorization: Bearer <CRON_SECRET> atau x-cron-secret

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { asBool, getPlatformSetting } from "../_shared/platformSettings.ts";
import { commissionConfirmedAffiliateEmail } from "../_shared/emailTemplates.ts";
import { sendResendHtml } from "../_shared/resendHtml.ts";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function authorize(req: Request): boolean {
  const secret = Deno.env.get("CRON_SECRET")?.trim();
  if (!secret) return false;
  const auth = req.headers.get("Authorization") ?? "";
  const tok = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (tok === secret) return true;
  return (req.headers.get("x-cron-secret") ?? "").trim() === secret;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  if (!authorize(req)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    return new Response(JSON.stringify({ error: "misconfigured" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(url, key);
  const nowIso = new Date().toISOString();
  const report: Record<string, number> = {
    commissions_confirmed: 0,
    tiers_updated: 0,
    events_ended: 0,
  };

  const autoConfirm = asBool(await getPlatformSetting(supabase, "affiliate.auto_confirm_commission"), true);
  if (autoConfirm) {
    const { data: due } = await supabase
      .from("commissions")
      .select("id, affiliate_id, amount_idr, order_id")
      .eq("status", "pending")
      .lte("available_at", nowIso)
      .limit(300);

    for (const c of due ?? []) {
      const { data: aff } = await supabase
        .from("affiliates")
        .select("balance_pending_idr, balance_available_idr, user_id")
        .eq("id", c.affiliate_id)
        .maybeSingle();
      if (!aff) continue;

      const amt = Number(c.amount_idr) || 0;
      const pend = Math.max(0, (Number(aff.balance_pending_idr) || 0) - amt);
      const avail = (Number(aff.balance_available_idr) || 0) + amt;

      const { error: u1 } = await supabase
        .from("commissions")
        .update({ status: "confirmed", updated_at: nowIso })
        .eq("id", c.id)
        .eq("status", "pending");
      if (u1) continue;

      await supabase
        .from("affiliates")
        .update({
          balance_pending_idr: pend,
          balance_available_idr: avail,
          updated_at: nowIso,
        })
        .eq("id", c.affiliate_id);

      await supabase.from("notifications").insert({
        user_id: aff.user_id,
        type: "commission_confirmed",
        title: "Komisi dikonfirmasi",
        body: `Rp ${amt.toLocaleString("id-ID")} untuk order ${c.order_id} siap dicairkan.`,
        link: "/member/komisi",
      });

      const { data: urow } = await supabase.auth.admin.getUserById(aff.user_id);
      const em = urow.user?.email;
      if (em) {
        const tpl = commissionConfirmedAffiliateEmail({ amountIdr: amt, orderId: c.order_id });
        await sendResendHtml({
          supabase,
          to: [em],
          subject: tpl.subject,
          html: tpl.html,
          platformToggleKey: "email.commission_confirmed_to_affiliate",
        });
      }
      report.commissions_confirmed++;
    }
  }

  const autoTier = asBool(await getPlatformSetting(supabase, "affiliate.auto_tier_upgrade"), true);
  if (autoTier) {
    const { data: tiers } = await supabase.from("affiliate_tiers").select("*").order("min_sales", { ascending: false });
    const { data: affs } = await supabase.from("affiliates").select("id, total_sales, tier_id, user_id, slug").eq("status", "active").limit(500);

    for (const a of affs ?? []) {
      const sales = Number(a.total_sales) || 0;
      const match = (tiers ?? []).find((t) => sales >= (Number(t.min_sales) || 0));
      if (!match || match.id === a.tier_id) continue;
      await supabase
        .from("affiliates")
        .update({
          tier_id: match.id,
          commission_rate_bps: match.commission_rate_bps,
          updated_at: nowIso,
        })
        .eq("id", a.id);

      await supabase.from("notifications").insert({
        user_id: a.user_id,
        type: "tier_upgrade",
        title: "Tier affiliate naik",
        body: `Anda sekarang di tier ${match.name ?? match.code}.`,
        link: "/member/affiliate",
      });
      report.tiers_updated++;
    }
  }

  const { data: ended } = await supabase
    .from("promo_events")
    .update({ status: "ended", updated_at: nowIso })
    .eq("status", "active")
    .lt("ends_at", nowIso)
    .select("id");

  report.events_ended = ended?.length ?? 0;

  await supabase
    .from("promo_events")
    .update({ status: "active", updated_at: nowIso })
    .eq("status", "draft")
    .lte("starts_at", nowIso)
    .gte("ends_at", nowIso);

  return new Response(JSON.stringify({ ok: true, at: nowIso, ...report }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
