export function describeSignInError(message: string): string {
  const lower = (message ?? "").trim().toLowerCase();
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials") ||
    lower.includes("wrong password")
  ) {
    return "Email atau password salah. Jika belum punya akun, daftar terlebih dahulu.";
  }
  if (lower.includes("user not found") || lower.includes("not registered")) {
    return "Akun belum terdaftar. Silakan daftar dulu.";
  }
  if (lower.includes("email not confirmed") || lower.includes("not confirmed")) {
    return "Email belum diverifikasi. Cek kotak masuk Anda.";
  }
  return message?.trim() || "Gagal masuk. Periksa email dan password.";
}
