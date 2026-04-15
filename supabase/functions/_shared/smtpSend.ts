/**
 * Transactional HTML email via SMTP (same credentials as Supabase Dashboard Custom SMTP
 * when you mirror them into Edge Function secrets — Edge does not read Dashboard SMTP).
 */
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

function parsePort(raw: string | undefined, tls: boolean): number {
  const n = parseInt(String(raw ?? "").trim(), 10);
  if (Number.isFinite(n) && n > 0) return n;
  return tls ? 465 : 587;
}

/** Parse `Name <addr@domain>` or bare email for the From header */
function parseFromHeader(from: string): { display: string; address: string } {
  const trimmed = from.trim();
  const m = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (m) {
    const name = m[1].trim().replace(/^"|"$/g, "");
    const addr = m[2].trim();
    return name.length > 0 ? { display: `${name} <${addr}>`, address: addr } : { display: addr, address: addr };
  }
  return { display: trimmed, address: trimmed };
}

export async function sendSmtpHtml(opts: {
  to: string[];
  subject: string;
  html: string;
  from: string;
}): Promise<{ ok: boolean; status: number; error?: string }> {
  const host = Deno.env.get("SMTP_HOST")?.trim();
  const user = Deno.env.get("SMTP_USER")?.trim();
  const pass = Deno.env.get("SMTP_PASS")?.trim();
  const tlsEnv = (Deno.env.get("SMTP_TLS") ?? Deno.env.get("SMTP_SECURE") ?? "")
    .trim()
    .toLowerCase();
  const implicitTls = tlsEnv === "true" || tlsEnv === "1" || tlsEnv === "465";

  if (!host || !user || !pass || opts.to.length === 0) {
    return { ok: false, status: 0, error: "smtp_missing_host_user_pass_or_empty_to" };
  }

  const port = parsePort(Deno.env.get("SMTP_PORT"), implicitTls);
  const fromParsed = parseFromHeader(opts.from);

  const client = new SMTPClient({
    connection: {
      hostname: host,
      port,
      tls: implicitTls,
      auth: { username: user, password: pass },
    },
  });

  try {
    await client.send({
      from: fromParsed.display,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return { ok: true, status: 250 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("smtp_send_failed", msg);
    return { ok: false, status: 0, error: msg };
  } finally {
    try {
      await client.close();
    } catch {
      /* */
    }
  }
}
