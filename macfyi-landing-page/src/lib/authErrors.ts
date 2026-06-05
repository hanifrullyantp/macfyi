export const SERVICE_UNAVAILABLE_MESSAGE =
  "Layanan sementara tidak tersedia. Silakan coba lagi nanti.";

export type AuthFormHint = "register" | "forgot" | "verify" | null;

export type AuthFormFeedback = {
  text: string;
  hint: AuthFormHint;
};

/** Supabase / fetch sometimes surface `"{}"` or empty message; never show that to users. */
export function normalizeUserFacingMessage(message: string): string {
  const t = message.trim();
  if (!t || t === "{}" || t === "[]" || t === "null") return "";
  return t;
}

const API_ERROR_MESSAGES: Record<string, string> = {
  db_error:
    "Login berhasil, tetapi unduhan demo belum bisa disiapkan. Buka halaman unduh dan coba lagi, atau hubungi dukungan.",
  invalid_session: "Sesi login tidak valid atau sudah kedaluwarsa. Silakan masuk kembali.",
  login_required: "Silakan daftar atau masuk dengan email dan password.",
  invalid_email: "Format email tidak valid.",
  invalid_name: "Nama tidak valid.",
  rate_limited: "Terlalu banyak percobaan. Coba lagi nanti.",
  token_create_failed: "Gagal membuat token demo. Silakan coba lagi dari halaman unduh.",
  server_misconfigured: "Layanan sementara tidak tersedia. Silakan coba lagi nanti.",
};

/** Maps Edge Function error codes to user-friendly Indonesian messages. */
export function describeApiError(error?: string, message?: string): string {
  const msg = normalizeUserFacingMessage(message ?? "");
  if (msg) return msg;
  const code = (error ?? "").trim();
  if (code && API_ERROR_MESSAGES[code]) return API_ERROR_MESSAGES[code];
  if (code === "db_error") return API_ERROR_MESSAGES.db_error;
  if (code) return code;
  return "Terjadi kesalahan. Silakan coba lagi.";
}

/** True when auth succeeded but demo-request failed — user should go to /download. */
export function isPostLoginDemoFailure(error?: string): boolean {
  return (error ?? "").trim() === "db_error";
}

/** Maps GoTrue sign-in errors to clear Indonesian guidance. */
export function describeSignInError(message: string, status?: number): AuthFormFeedback {
  const raw = normalizeUserFacingMessage(message);
  const lower = raw.toLowerCase();

  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials") ||
    lower.includes("wrong password") ||
    lower.includes("incorrect password")
  ) {
    return {
      text: "Email atau password salah. Jika belum punya akun, daftar terlebih dahulu.",
      hint: "register",
    };
  }

  if (
    lower.includes("user not found") ||
    lower.includes("no user found") ||
    lower.includes("not registered")
  ) {
    return {
      text: "Akun dengan email ini belum terdaftar. Silakan daftar dulu.",
      hint: "register",
    };
  }

  if (
    lower.includes("email not confirmed") ||
    lower.includes("not confirmed") ||
    lower.includes("confirm your email")
  ) {
    return {
      text: "Email belum diverifikasi. Cek kotak masuk (termasuk spam) lalu klik tautan verifikasi.",
      hint: "verify",
    };
  }

  if (lower.includes("too many requests") || status === 429) {
    return {
      text: "Terlalu banyak percobaan masuk. Tunggu beberapa menit lalu coba lagi.",
      hint: null,
    };
  }

  if (lower.includes("user banned") || lower.includes("disabled")) {
    return {
      text: "Akun ini tidak dapat digunakan. Hubungi dukungan Macfyi.",
      hint: null,
    };
  }

  if (raw) {
    return { text: raw, hint: null };
  }

  return {
    text: "Gagal masuk. Periksa email dan password Anda.",
    hint: "register",
  };
}

/** Maps GoTrue sign-up errors to clear Indonesian guidance. */
export function describeSignUpError(message: string): AuthFormFeedback {
  const raw = normalizeUserFacingMessage(message);
  const lower = raw.toLowerCase();

  if (
    lower.includes("already registered") ||
    lower.includes("already exists") ||
    lower.includes("user already")
  ) {
    return {
      text: "Email ini sudah terdaftar. Silakan masuk dengan password Anda.",
      hint: null,
    };
  }

  if (lower.includes("password")) {
    return { text: raw || "Password tidak memenuhi syarat.", hint: null };
  }

  return { text: raw || "Gagal mendaftar. Silakan coba lagi.", hint: null };
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
  return `${base} Coba lagi nanti atau hubungi dukungan jika masalah berlanjut.`;
}
