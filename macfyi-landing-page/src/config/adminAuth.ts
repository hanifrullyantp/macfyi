/** Demo credentials — override with VITE_ADMIN_EMAIL / VITE_ADMIN_PASSWORD in production. */
export const ADMIN_EMAIL =
  (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim() || "hanif.rullyant@gmail.com";
export const ADMIN_PASSWORD =
  (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined) || "123";

export const SESSION_KEY = "macfyi_landing_admin_session";
export const SESSION_MS = 1000 * 60 * 60 * 12; // 12h

export function isValidAdminSession(): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const { email, exp } = JSON.parse(raw) as { email: string; exp: number };
    if (email !== ADMIN_EMAIL || Date.now() > exp) {
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function saveAdminSession(): void {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ email: ADMIN_EMAIL, exp: Date.now() + SESSION_MS })
  );
}

export function clearAdminSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function tryLogin(email: string, password: string): boolean {
  if (email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
    saveAdminSession();
    return true;
  }
  return false;
}
