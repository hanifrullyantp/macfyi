/** Edge functions in repo (for admin health checks — not from Supabase metrics API). */
export const EDGE_FUNCTIONS_IN_REPO = [
  "public-config",
  "ai-proxy",
  "create-midtrans-snap",
  "preview-checkout-price",
  "create-lynk-checkout",
  "payment-webhook",
  "activate-license",
  "demo-request",
  "demo-verify",
  "demo-download-verify",
  "client-telemetry",
  "track-event",
  "submit-withdrawal",
  "admin-withdrawal",
  "scheduled-ops",
] as const;

export type EdgeFunctionName = (typeof EDGE_FUNCTIONS_IN_REPO)[number];
