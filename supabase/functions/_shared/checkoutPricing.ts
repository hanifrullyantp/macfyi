import { resolvePromoContext, shouldBlockCheckoutForSlots, type ResolvedPromo } from "./promoPlan.ts";
import { parseCheckoutCouponsDoc, pickApplicableCoupon, applyCouponToBase } from "./checkoutCoupons.ts";

export type MidtransPricingOk = {
  ok: true;
  grossAmount: number;
  baseAmount: number;
  discountIdr: number;
  compareAtIdr: number | null;
  couponId: string | null;
  couponCode: string | null;
  promoResolved: ResolvedPromo;
};

export type MidtransPricingErr = {
  ok: false;
  error: "promo_slots_exhausted" | "invalid_coupon" | "multiple_auto_coupon";
  promoResolved: ResolvedPromo;
};

export function resolveMidtransCheckoutPricing(input: {
  appRow: {
    lifetime_price_idr?: number | null;
    promo_plan?: unknown;
    promo_slots_remaining?: number | null;
    checkout_coupons?: unknown;
  };
  couponCode?: string | null;
  skipAutoCoupon?: boolean;
  now?: Date;
}): MidtransPricingOk | MidtransPricingErr {
  const now = input.now ?? new Date();
  const baseIdr = Number(input.appRow.lifetime_price_idr) > 0 ? Number(input.appRow.lifetime_price_idr) : 173000;
  const promoResolved = resolvePromoContext({
    now,
    baseLifetimeIdr: baseIdr,
    plan: input.appRow.promo_plan ?? null,
    promoSlotsRemaining: input.appRow.promo_slots_remaining ?? null,
  });

  if (shouldBlockCheckoutForSlots(promoResolved)) {
    return { ok: false, error: "promo_slots_exhausted", promoResolved };
  }

  const effectiveBase =
    promoResolved.lifetime_price_idr > 0 ? promoResolved.lifetime_price_idr : 173000;

  const coupons = parseCheckoutCouponsDoc(input.appRow.checkout_coupons ?? null);
  const { coupon, error } = pickApplicableCoupon(
    coupons,
    now,
    input.couponCode ?? null,
    Boolean(input.skipAutoCoupon)
  );

  if (error === "invalid_coupon") {
    return { ok: false, error: "invalid_coupon", promoResolved };
  }
  if (error === "multiple_auto_coupon") {
    return { ok: false, error: "multiple_auto_coupon", promoResolved };
  }

  const { finalIdr, discountIdr } = applyCouponToBase(effectiveBase, coupon);

  return {
    ok: true,
    grossAmount: finalIdr,
    baseAmount: effectiveBase,
    discountIdr,
    compareAtIdr: promoResolved.compare_at_idr,
    couponId: coupon?.id ?? null,
    couponCode: coupon?.code ? String(coupon.code) : null,
    promoResolved,
  };
}
