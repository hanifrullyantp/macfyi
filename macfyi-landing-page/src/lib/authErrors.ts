export const SERVICE_UNAVAILABLE_MESSAGE =
  "Layanan sementara tidak tersedia. Silakan coba lagi nanti.";

/** Supabase / fetch sometimes surface `"{}"` or empty message; never show that to users. */
export function normalizeUserFacingMessage(message: string): string {
  const t = message.trim();
  if (!t || t === "{}" || t === "[]" || t === "null") return "";
  return t;
}

const API_ERROR_MESSAGES: Record<string, string> = {
  db_error: "Gagal menyimpan data akun. Silakan coba lagi atau hubungi dukungan jika masalah berlanjut.",
  invalid_session: "Sesi login tidak valid atau sudah kedaluwarsa. Silakan masuk kembali.",
  login_required: "Silakan daftar atau masuk dengan email dan password.",
  invalid_email: "Format email tidak valid.",
  invalid_name: "Nama tidak valid.",
  rate_limited: "Terlalu banyak percobaan. Coba lagi nanti.",
  token_create_failed: "Gagal membuat token demo. Silakan coba lagi.",
  server_misconfigured: "Server belum dikonfigurasi dengan benar.",
};

/** Maps Edge Function error codes to user-friendly Indonesian messages. */
export function describeApiError(error?: string, message?: string): string {
  const msg = normalizeUserFacingMessage(message ?? "");
  if (msg) return msg;
  const code = (error ?? "").trim();
  if (code && API_ERROR_MESSAGES[code]) return API_ERROR_MESSAGES[code];
  if (code) return code;
  return "Terjadi kesalahan. Silakan coba lagi.";
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
