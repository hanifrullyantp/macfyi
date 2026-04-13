import { asBool, getPlatformSetting } from "./platformSettings.ts";

// deno-lint-ignore no-explicit-any
type SB = any;

export async function sendResendHtml(opts: {
  supabase: SB;
  to: string[];
  subject: string;
  html: string;
  /** Jika diisi, email tidak dikirim bila toggle false */
  platformToggleKey?: string;
}): Promise<{ ok: boolean; skipped?: boolean; status?: number }> {
  if (opts.platformToggleKey) {
    const v = await getPlatformSetting(opts.supabase, opts.platformToggleKey);
    if (!asBool(v, true)) return { ok: true, skipped: true };
  }
  const resendKey = Deno.env.get("RESEND_API_KEY")?.trim();
  const from = Deno.env.get("EMAIL_FROM")?.trim() ?? "Macfyi <onboarding@resend.dev>";
  if (!resendKey || opts.to.length === 0) return { ok: false, status: 0 };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  });
  return { ok: res.ok, status: res.status };
}

export function parseAlertEmails(): string[] {
  const raw = Deno.env.get("OPS_ALERT_EMAIL")?.trim() ?? "";
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
}
