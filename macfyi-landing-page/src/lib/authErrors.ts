/** Supabase / fetch sometimes surface `"{}"` or empty message; never show that to users. */
export function normalizeUserFacingMessage(message: string): string {
  const t = message.trim();
  if (!t || t === "{}" || t === "[]" || t === "null") return "";
  return t;
}

/** Maps GoTrue / network errors; 504 on signup is usually custom SMTP timeout. */
export function describeAuthEmailFailureHint(status: number | undefined, message: string): string {
  const raw = normalizeUserFacingMessage(message);
  const lower = raw.toLowerCase();
  const smtpLikely =
    status === 504 ||
    status === 500 ||
    lower.includes("504") ||
    lower.includes("500") ||
    lower.includes("timeout") ||
    lower.includes("gateway") ||
    lower.includes("error sending") ||
    lower.includes("confirmation email") ||
    lower.includes("smtp");
  const base = raw || "Gagal mengirim email verifikasi.";
  if (!smtpLikely) return base;
  return `${base} Penyebab umum: SMTP custom di Supabase (Authentication → SMTP) tidak terhubung dari cloud Supabase—coba username = alamat email pengirim lengkap (mis. no-reply@macfyi.com), cocokkan port 465 (SSL) vs 587 (STARTTLS) dengan panel hosting, pastikan mail server tidak hanya mengizinkan IP situs Anda, atau gunakan penyedia transaksional (Resend, SES, SendGrid). Agar daftar & user di tabel Auth kembali jalan seperti sebelumnya: nonaktifkan Custom SMTP di Dashboard (kembali ke pengiriman bawaan Supabase) sampai SMTP Anda benar-benar stabil.`;
}
