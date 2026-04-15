/** Referral cookie + batch analytics → Supabase Edge `track-event`. */

const COOKIE = "macfyi_ref";
const VISITOR_KEY = "macfyi_vid";
const SENT_REF_KEY = "macfyi_ref_click_sent";

export function normalizeReferralSlug(raw: string): string | null {
  const t = raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (t.length < 2 || t.length > 48) return null;
  return t;
}

export function setReferralCookie(slug: string): void {
  const n = Number(import.meta.env.VITE_REFERRAL_COOKIE_DAYS);
  const days = Number.isFinite(n) ? Math.min(365, Math.max(1, n)) : 30;
  const maxAge = days * 86400;
  const safe = encodeURIComponent(slug);
  document.cookie = `${COOKIE}=${safe};path=/;max-age=${maxAge};SameSite=Lax`;
}

export function getReferralSlugFromCookie(): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
  if (!m?.[1]) return null;
  try {
    return normalizeReferralSlug(decodeURIComponent(m[1]));
  } catch {
    return null;
  }
}

/** Baca `?ref=` atau `/ref/slug`, set cookie, bersihkan URL. */
export function applyReferralFromUrl(): string | null {
  try {
    const u = new URL(window.location.href);
    const q = u.searchParams.get("ref");
    if (q) {
      const slug = normalizeReferralSlug(q);
      if (slug) {
        setReferralCookie(slug);
        u.searchParams.delete("ref");
        const next = u.pathname + (u.search || "") + u.hash;
        window.history.replaceState({}, "", next || "/");
        return slug;
      }
    }
    const path = u.pathname;
    const match = path.match(/^\/ref\/([a-z0-9-]{2,48})\/?$/i);
    if (match) {
      const slug = normalizeReferralSlug(match[1]);
      if (slug) {
        setReferralCookie(slug);
        window.history.replaceState({}, "", "/" + (u.search || "") + u.hash);
        return slug;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

function ensureVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id || id.length < 8) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

/** Visitor id for CRM + checkout attribution (persisted). */
export function getMacfyiVisitorId(): string {
  if (typeof window === "undefined") return crypto.randomUUID();
  return ensureVisitorId();
}

function trackingEnabled(): boolean {
  if (import.meta.env.VITE_SITE_TRACKING === "false") return false;
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && anon);
}

const queue: { type: string; payload?: Record<string, unknown> }[] = [];
let intervalId: ReturnType<typeof setInterval> | null = null;

async function flush(): Promise<void> {
  if (!trackingEnabled() || queue.length === 0) return;
  const events = queue.splice(0, 30);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!.trim().replace(/\/$/, "");
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!.trim();
  const visitor_id = ensureVisitorId();
  const ref = getReferralSlugFromCookie();
  const includeReferral = Boolean(ref && sessionStorage.getItem(SENT_REF_KEY) !== "1");

  const body: Record<string, unknown> = {
    visitor_id,
    events,
    page_url: typeof window !== "undefined" ? window.location.href : undefined,
    referrer: typeof document !== "undefined" && document.referrer ? document.referrer : undefined,
  };
  if (includeReferral && ref) body.referral_slug = ref;

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/track-event`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${anon}`,
        apikey: anon,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (res.ok && includeReferral && ref) {
      sessionStorage.setItem(SENT_REF_KEY, "1");
    }
  } catch {
    /* non-blocking */
  }
}

export function queueSiteEvent(type: string, payload?: Record<string, unknown>): void {
  if (!trackingEnabled()) return;
  queue.push(payload ? { type, payload } : { type });
  if (queue.length >= 12) void flush();
}

const scrollMilestones = new Set<number>();

export function startSiteAnalytics(): void {
  if (!trackingEnabled() || typeof window === "undefined") return;
  ensureVisitorId();
  queueSiteEvent("page_view", { path: window.location.pathname });

  if (intervalId != null) return;
  intervalId = window.setInterval(() => void flush(), 8000);
  window.addEventListener("beforeunload", () => void flush());

  const onScroll = () => {
    const doc = document.documentElement;
    const h = doc.scrollHeight - window.innerHeight;
    if (h <= 0) return;
    const p = Math.min(100, Math.round((window.scrollY / h) * 100));
    for (const m of [25, 50, 75, 90]) {
      if (p >= m && !scrollMilestones.has(m)) {
        scrollMilestones.add(m);
        queueSiteEvent("scroll_depth", { percent: m });
      }
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
}

export function bootstrapReferralAndTracking(): void {
  if (typeof window === "undefined") return;
  applyReferralFromUrl();
  startSiteAnalytics();
}
