/**
 * Keep in sync with supabase/functions/_shared/promoPlan.ts (client-safe copy).
 */
export type PromoPhase = {
  starts_at: string;
  ends_at: string;
  lifetime_price_idr: number;
  compare_at_idr?: number | null;
  slots_initial?: number | null;
};

export type PromoPlanDoc = {
  phases: PromoPhase[];
  block_checkout_when_slots_zero?: boolean;
};

export type ResolvePromoInput = {
  now: Date;
  baseLifetimeIdr: number;
  plan: unknown;
  promoSlotsRemaining: number | null | undefined;
};

export type ResolvedPromo = {
  active: boolean;
  lifetime_price_idr: number;
  compare_at_idr: number | null;
  ends_at: string | null;
  slots_initial_active: number | null;
  slots_remaining: number | null;
  slots_display: number | null;
  block_checkout_when_slots_zero: boolean;
};

function asFiniteInt(n: unknown, fallback: number): number {
  const x = Math.round(Number(n));
  return Number.isFinite(x) && x > 0 ? x : fallback;
}

export function parsePromoPlan(raw: unknown): PromoPlanDoc | null {
  if (raw == null || typeof raw !== "object") return null;
  const phases = (raw as { phases?: unknown }).phases;
  if (!Array.isArray(phases) || phases.length === 0) return null;
  const out: PromoPhase[] = [];
  for (const p of phases) {
    if (!p || typeof p !== "object") continue;
    const o = p as Record<string, unknown>;
    const starts = String(o.starts_at ?? "").trim();
    const ends = String(o.ends_at ?? "").trim();
    const idr = Number(o.lifetime_price_idr);
    if (!starts || !ends || !Number.isFinite(idr) || idr <= 0) continue;
    const compareRaw = o.compare_at_idr;
    const compare =
      compareRaw == null || compareRaw === ""
        ? null
        : (() => {
            const c = Number(compareRaw);
            return Number.isFinite(c) && c > 0 ? Math.round(c) : null;
          })();
    const si = o.slots_initial;
    const slotsInitial =
      si == null || si === ""
        ? null
        : (() => {
            const s = Math.round(Number(si));
            return Number.isFinite(s) && s >= 0 ? s : null;
          })();
    out.push({
      starts_at: starts,
      ends_at: ends,
      lifetime_price_idr: Math.round(idr),
      compare_at_idr: compare,
      slots_initial: slotsInitial,
    });
  }
  if (out.length === 0) return null;
  const block = Boolean((raw as { block_checkout_when_slots_zero?: unknown }).block_checkout_when_slots_zero);
  return { phases: out, block_checkout_when_slots_zero: block };
}

export function findActivePhase(nowMs: number, phases: PromoPhase[]): PromoPhase | null {
  for (const p of phases) {
    const start = Date.parse(p.starts_at);
    const end = Date.parse(p.ends_at);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (start <= nowMs && nowMs < end) return p;
  }
  return null;
}

export function resolvePromoContext(input: ResolvePromoInput): ResolvedPromo {
  const base = asFiniteInt(input.baseLifetimeIdr, 173000);
  const doc = parsePromoPlan(input.plan);
  const nowMs = input.now.getTime();

  const activePhase = doc ? findActivePhase(nowMs, doc.phases) : null;
  const active = activePhase !== null;
  const block = Boolean(doc?.block_checkout_when_slots_zero);

  const priceFromPhase = activePhase ? Math.round(Number(activePhase.lifetime_price_idr)) : base;
  const lifetime_price_idr = Number.isFinite(priceFromPhase) && priceFromPhase > 0 ? priceFromPhase : base;

  let compare_at_idr: number | null = null;
  if (activePhase && activePhase.compare_at_idr != null) {
    const c = Math.round(Number(activePhase.compare_at_idr));
    if (Number.isFinite(c) && c > 0) compare_at_idr = c;
  }

  const ends_at = activePhase ? activePhase.ends_at : null;

  const rawRem = input.promoSlotsRemaining;
  const hasCounter =
    rawRem !== null && rawRem !== undefined && Number.isFinite(Number(rawRem)) && Math.round(Number(rawRem)) >= 0;

  let slots_remaining: number | null = null;
  if (hasCounter) {
    slots_remaining = Math.max(0, Math.round(Number(rawRem)));
  }

  let slots_initial_active: number | null = null;
  if (activePhase && activePhase.slots_initial != null) {
    const si = Math.round(Number(activePhase.slots_initial));
    if (Number.isFinite(si) && si >= 0) slots_initial_active = si;
  }

  let slots_display: number | null = null;
  if (slots_remaining !== null) {
    slots_display = slots_remaining;
  } else if (slots_initial_active !== null) {
    slots_display = slots_initial_active;
  }

  return {
    active,
    lifetime_price_idr,
    compare_at_idr,
    ends_at,
    slots_initial_active,
    slots_remaining,
    slots_display,
    block_checkout_when_slots_zero: block,
  };
}
