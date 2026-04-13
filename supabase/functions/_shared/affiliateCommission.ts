import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { asNumber, getPlatformSetting } from "./platformSettings.ts";
import { saleReferralAffiliateEmail } from "./emailTemplates.ts";
import { sendResendHtml } from "./resendHtml.ts";

/** Setelah pembayaran sukses: komisi idempotent per order_id, update saldo affiliate, sale + notifikasi. */
export async function processAffiliateCommission(
  supabase: SupabaseClient,
  orderId: string,
  grossFallback: number
): Promise<void> {
  const { data: pt } = await supabase
    .from("payment_transactions")
    .select("id, affiliate_id, gross_amount_idr, email, customer_name")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!pt?.affiliate_id) return;

  const { data: dup } = await supabase.from("commissions").select("id").eq("order_id", orderId).maybeSingle();
  if (dup) return;

  const holdDays = asNumber(await getPlatformSetting(supabase, "affiliate.commission_hold_days"), 7);

  const { data: aff } = await supabase
    .from("affiliates")
    .select("id, user_id, commission_rate_bps, tier_id, balance_pending_idr, balance_available_idr, total_sales, total_commission_idr")
    .eq("id", pt.affiliate_id)
    .maybeSingle();

  if (!aff) return;

  let rateBps = aff.commission_rate_bps as number | null;
  if (rateBps == null && aff.tier_id) {
    const { data: tier } = await supabase
      .from("affiliate_tiers")
      .select("commission_rate_bps")
      .eq("id", aff.tier_id)
      .maybeSingle();
    rateBps = tier?.commission_rate_bps ?? null;
  }
  if (rateBps == null) {
    const pct = asNumber(await getPlatformSetting(supabase, "affiliate.default_commission_percent"), 30);
    rateBps = Math.round(pct * 100);
  }

  const gross = Number(pt.gross_amount_idr) > 0 ? Number(pt.gross_amount_idr) : grossFallback;
  const amountIdr = Math.max(0, Math.floor((gross * rateBps) / 10000));

  const availableAt = new Date();
  availableAt.setUTCDate(availableAt.getUTCDate() + holdDays);

  const { error: insC } = await supabase.from("commissions").insert({
    affiliate_id: aff.id,
    order_id: orderId,
    payment_transaction_id: pt.id,
    gross_amount_idr: gross,
    amount_idr: amountIdr,
    rate_bps: rateBps,
    status: "pending",
    available_at: availableAt.toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (insC) {
    console.error("commission_insert_failed", insC);
    return;
  }

  await supabase
    .from("affiliates")
    .update({
      balance_pending_idr: (Number(aff.balance_pending_idr) || 0) + amountIdr,
      balance_available_idr: Number(aff.balance_available_idr) || 0,
      total_sales: (Number(aff.total_sales) || 0) + 1,
      total_commission_idr: (Number(aff.total_commission_idr) || 0) + amountIdr,
      updated_at: new Date().toISOString(),
    })
    .eq("id", aff.id);

  const buyerName = String(pt.customer_name ?? "").trim() || "Pembeli";
  await supabase.from("affiliate_referral_sales").upsert(
    {
      affiliate_id: aff.id,
      order_id: orderId,
      buyer_display_name: buyerName.slice(0, 120),
      gross_amount_idr: gross,
      payment_status: "paid",
    },
    { onConflict: "affiliate_id,order_id" }
  );

  await supabase.from("notifications").insert({
    user_id: aff.user_id,
    type: "sale_referral",
    title: "Penjualan dari referral",
    body: `Pesanan baru. Komisi perkiraan Rp ${amountIdr.toLocaleString("id-ID")} (order ${orderId}).`,
    link: "/member/komisi",
  });

  const { data: authAff } = await supabase.auth.admin.getUserById(aff.user_id);
  const affEmail = authAff.user?.email;
  if (affEmail) {
    const tpl = saleReferralAffiliateEmail({
      amountIdr: amountIdr,
      orderId,
      buyerName,
    });
    await sendResendHtml({
      supabase,
      to: [affEmail],
      subject: tpl.subject,
      html: tpl.html,
      platformToggleKey: "email.sale_to_affiliate",
    });
  }
}
