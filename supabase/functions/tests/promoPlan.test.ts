import { describe, it, expect } from "vitest";
import { resolvePromoContext, shouldBlockCheckoutForSlots } from "../_shared/promoPlan.ts";

describe("promoPlan", () => {
  const base = 299_000;

  it("returns base price when no promo plan", () => {
    const r = resolvePromoContext({
      now: new Date("2026-06-01T12:00:00Z"),
      baseLifetimeIdr: base,
      plan: null,
      promoSlotsRemaining: 0,
    });
    expect(r.active).toBe(false);
    expect(r.lifetime_price_idr).toBe(base);
  });

  it("returns promo price when phase active and slots allow", () => {
    const r = resolvePromoContext({
      now: new Date("2026-06-01T12:00:00Z"),
      baseLifetimeIdr: base,
      plan: {
        phases: [
          {
            starts_at: "2026-05-01T00:00:00.000Z",
            ends_at: "2026-07-01T00:00:00.000Z",
            lifetime_price_idr: 199_000,
            compare_at_idr: 299_000,
          },
        ],
        block_checkout_when_slots_zero: false,
      },
      promoSlotsRemaining: 10,
    });
    expect(r.active).toBe(true);
    expect(r.lifetime_price_idr).toBe(199_000);
  });

  it("returns base when promo expired", () => {
    const r = resolvePromoContext({
      now: new Date("2026-08-01T12:00:00Z"),
      baseLifetimeIdr: base,
      plan: {
        phases: [
          {
            starts_at: "2026-05-01T00:00:00.000Z",
            ends_at: "2026-07-01T00:00:00.000Z",
            lifetime_price_idr: 199_000,
          },
        ],
      },
      promoSlotsRemaining: 10,
    });
    expect(r.active).toBe(false);
    expect(r.lifetime_price_idr).toBe(base);
  });

  it("shouldBlockCheckoutForSlots when flag set and counter zero", () => {
    const r = resolvePromoContext({
      now: new Date("2026-06-01T12:00:00Z"),
      baseLifetimeIdr: base,
      plan: {
        phases: [
          {
            starts_at: "2026-05-01T00:00:00.000Z",
            ends_at: "2026-07-01T00:00:00.000Z",
            lifetime_price_idr: 199_000,
          },
        ],
        block_checkout_when_slots_zero: true,
      },
      promoSlotsRemaining: 0,
    });
    expect(shouldBlockCheckoutForSlots(r)).toBe(true);
  });
});
