/** Auth demo-request: current pipeline → phase-1 → legacy. */
export const CRM_STAGE_TRIALS_AUTH_DEMO = ["demo", "DEMO_REQUESTED", "lead"] as const;

/** track-event anonymous lead row: modern `lead` → phase-1 → `demo`. */
export const CRM_STAGE_TRIALS_TRACK_LEAD = ["lead", "DEMO_REQUESTED", "demo"] as const;

/** Postgres `check_violation` or crm_contacts stage constraint message. */
export function isCheckConstraintViolation(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  if (err.code === "23514") return true;
  const m = String(err.message ?? "");
  return m.includes("violates check constraint") || m.includes("crm_contacts_stage_check");
}
