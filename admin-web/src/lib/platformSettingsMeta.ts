/** Short per-key hints for admins (subset + common prefixes). */
export const PLATFORM_SETTING_HINTS: Record<string, string> = {
  "demo.token_ttl_days": "How long a demo session token remains valid (days).",
  "demo.clean_daily_gb_cap": "Soft cap on GB cleaned per demo user per day.",
  "demo.clean_daily_items_cap": "Soft cap on file/folder items cleaned per demo user per day.",
  "demo.clean_safe_risk_only": "When true, demo clean only runs on items tagged low-risk.",
  "demo.uninstall_actions_per_day": "Limit uninstall-related demo actions per day.",
  "demo.ai_questions_per_day": "Cap on AI Q&A turns per demo user per day.",
  "ai.global_enabled": "Master switch for AI features in the desktop app.",
  "ai.default_model_id": "Default model slug when the user has not chosen one.",
  "ai.max_output_tokens": "Upper bound on completion length from the model.",
  "marketing.notification_banner_enabled": "Show the in-app marketing / notification banner strip.",
  "marketing.social_toast_enabled": "Show lightweight social proof / promo toasts.",
  "seo.ga4_measurement_id": "Google Analytics 4 measurement ID (G-…).",
  "seo.facebook_pixel_id": "Meta Pixel ID if you run ads retargeting.",
  "desktop.upgrade_paywall.use_session_clean_amount":
    "true = after a clean, subtitle uses the real freed space from Macfyi. false = always generic subtitle (no session amount).",
  "desktop.upgrade_paywall.subtitle_with_amount_id": "Indonesian copy; must include {amount} placeholder.",
  "desktop.upgrade_paywall.subtitle_with_amount_en": "English copy; include {amount} placeholder.",
  "desktop.upgrade_paywall.subtitle_generic_id": "Indonesian subtitle when no session amount is shown (no {amount}).",
  "desktop.upgrade_paywall.subtitle_generic_en": "English subtitle when no session amount is shown.",
  "checkout.snap_client_key": "Midtrans Snap client key exposed to the landing checkout (public).",
  "checkout.enabled": "When false, hide or block checkout flows that read this flag.",
};

/** Group keys for nicer admin UX; unknown keys still appear under "Other". */
export const PLATFORM_SETTING_GROUPS: { id: string; label: string; prefix: string }[] = [
  { id: "demo", label: "Demo & limits", prefix: "demo." },
  { id: "ai", label: "AI", prefix: "ai." },
  { id: "marketing", label: "Marketing", prefix: "marketing." },
  { id: "seo", label: "SEO & pixels", prefix: "seo." },
  { id: "desktop", label: "Desktop app", prefix: "desktop." },
  { id: "checkout", label: "Checkout", prefix: "checkout." },
];

export function groupKeyForSetting(key: string): string {
  for (const g of PLATFORM_SETTING_GROUPS) {
    if (key.startsWith(g.prefix)) return g.id;
  }
  return "other";
}

export const GROUP_ORDER = ["demo", "ai", "marketing", "seo", "desktop", "checkout", "other"];
