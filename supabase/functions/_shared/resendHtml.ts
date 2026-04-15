import { asBool, getPlatformSetting } from "./platformSettings.ts";
import { sendSmtpHtml } from "./smtpSend.ts";

// deno-lint-ignore no-explicit-any
type SB = any;

const DEFAULT_FROM = "Macfyi <noreply@example.com>";

/**
 * Sends transactional HTML email via SMTP (secrets: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM).
 * Mirror the same SMTP values you use under Supabase Dashboard → Authentication → SMTP (Edge does not read Dashboard).
 */
export async function sendResendHtml(opts: {
  supabase: SB;
  to: string[];
  subject: string;
  html: string;
  /** Jika diisi, email tidak dikirim bila toggle false */
  platformToggleKey?: string;
  /** Ganti alamat From (mis. dari app_settings + EMAIL_FROM) */
  fromOverride?: string;
}): Promise<{ ok: boolean; skipped?: boolean; status?: number; error?: string }> {
  if (opts.platformToggleKey) {
    const v = await getPlatformSetting(opts.supabase, opts.platformToggleKey);
    if (!asBool(v, true)) return { ok: true, skipped: true };
  }
  const from = opts.fromOverride?.trim() || Deno.env.get("EMAIL_FROM")?.trim() || DEFAULT_FROM;
  if (opts.to.length === 0) return { ok: false, status: 0 };

  const r = await sendSmtpHtml({
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    from,
  });
  return { ok: r.ok, status: r.status, error: r.error };
}

export function parseAlertEmails(): string[] {
  const raw = Deno.env.get("OPS_ALERT_EMAIL")?.trim() ?? "";
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
}
