/** Kupon checkout (JSON di app_settings.checkout_coupons). */

export type CheckoutCouponMode = "fixed_price" | "percent_off" | "amount_off_idr";

export type CheckoutCouponDef = {
  id: string;
  code: string;
  label?: string | null;
  enabled: boolean;
  auto_apply: boolean;
  mode: CheckoutCouponMode;
  percent?: number | null;
  amount_off_idr?: number | null;
  fixed_price_idr?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

export type CheckoutCouponsDoc = {
  coupons: CheckoutCouponDef[];
};

const MIN_IDR = 1000;

function normCode(s: string): string {
  return s.trim().toUpperCase();
}

function inWindow(c: CheckoutCouponDef, nowMs: number): boolean {
  if (c.starts_at) {
    const t = Date.parse(c.starts_at);
    if (Number.isFinite(t) && nowMs < t) return false;
  }
  if (c.ends_at) {
    const t = Date.parse(c.ends_at);
    if (Number.isFinite(t) && nowMs >= t) return false;
  }
  return true;
}

export function parseCheckoutCouponsDoc(raw: unknown): CheckoutCouponDef[] {
  if (raw == null || typeof raw !== "object") return [];
  const c = (raw as { coupons?: unknown }).coupons;
  if (!Array.isArray(c)) return [];
  const out: CheckoutCouponDef[] = [];
  for (const x of c) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const id = String(o.id ?? "").trim();
    const code = String(o.code ?? "").trim();
    const mode = String(o.mode ?? "").trim() as CheckoutCouponMode;
    if (!id || !["fixed_price", "percent_off", "amount_off_idr"].includes(mode)) continue;
    out.push({
      id,
      code,
      label: o.label != null ? String(o.label) : null,
      enabled: Boolean(o.enabled),
      auto_apply: Boolean(o.auto_apply),
      mode,
      percent: o.percent == null || o.percent === "" ? null : Number(o.percent),
      amount_off_idr: o.amount_off_idr == null || o.amount_off_idr === "" ? null : Math.round(Number(o.amount_off_idr)),
      fixed_price_idr:
        o.fixed_price_idr == null || o.fixed_price_idr === "" ? null : Math.round(Number(o.fixed_price_idr)),
      starts_at: o.starts_at != null ? String(o.starts_at).trim() || null : null,
      ends_at: o.ends_at != null ? String(o.ends_at).trim() || null : null,
    });
  }
  return out;
}

export function listActiveCoupons(coupons: CheckoutCouponDef[], now: Date): CheckoutCouponDef[] {
  const nowMs = now.getTime();
  return coupons.filter((c) => c.enabled && inWindow(c, nowMs));
}

/** Pilih kupon: kode eksplisit mengalahkan; jika tidak ada kode dan tidak skip auto, pakai tepat satu auto_apply. */
export function pickApplicableCoupon(
  coupons: CheckoutCouponDef[],
  now: Date,
  explicitCode: string | null | undefined,
  skipAutoCoupon: boolean
): { coupon: CheckoutCouponDef | null; error: string | null } {
  const active = listActiveCoupons(coupons, now);
  const code = explicitCode?.trim() ? normCode(explicitCode) : "";

  if (code) {
    const found = active.find((c) => normCode(c.code) === code);
    if (!found) return { coupon: null, error: "invalid_coupon" };
    return { coupon: found, error: null };
  }

  if (skipAutoCoupon) return { coupon: null, error: null };

  const autos = active.filter((c) => c.auto_apply);
  if (autos.length === 0) return { coupon: null, error: null };
  if (autos.length > 1) return { coupon: null, error: "multiple_auto_coupon" };
  return { coupon: autos[0], error: null };
}

export function applyCouponToBase(baseIdr: number, coupon: CheckoutCouponDef | null): {
  finalIdr: number;
  discountIdr: number;
} {
  const base = Math.max(MIN_IDR, Math.round(Number(baseIdr)) || MIN_IDR);
  if (!coupon) return { finalIdr: base, discountIdr: 0 };

  switch (coupon.mode) {
    case "fixed_price": {
      const fp = Math.round(Number(coupon.fixed_price_idr) || 0);
      const finalIdr = Math.max(MIN_IDR, fp);
      return { finalIdr, discountIdr: Math.max(0, base - finalIdr) };
    }
    case "percent_off": {
      const p = Math.min(100, Math.max(0, Number(coupon.percent) || 0));
      const discountIdr = Math.min(base - MIN_IDR, Math.floor((base * p) / 100));
      return { finalIdr: Math.max(MIN_IDR, base - discountIdr), discountIdr };
    }
    case "amount_off_idr": {
      const off = Math.max(0, Math.round(Number(coupon.amount_off_idr) || 0));
      const discountIdr = Math.min(base - MIN_IDR, off);
      return { finalIdr: Math.max(MIN_IDR, base - discountIdr), discountIdr };
    }
    default:
      return { finalIdr: base, discountIdr: 0 };
  }
}
