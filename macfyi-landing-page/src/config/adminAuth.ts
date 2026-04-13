import { isSupabaseBrowserConfigured } from "../lib/supabase";

/** Hanya dipakai jika VITE_SUPABASE_* tidak diatur (mode lokal). */
export const ADMIN_EMAIL =
  (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim() || "hanif.rullyant@gmail.com";
export const ADMIN_PASSWORD =
  (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined) || "123";

export const SESSION_KEY = "macfyi_landing_admin_session";
export const SESSION_MS = 1000 * 60 * 60 * 12; // 12h

export function isValidLegacyAdminSession(): boolean {
  if (isSupabaseBrowserConfigured()) return false;
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

/** @deprecated gunakan isValidLegacyAdminSession — nama lama untuk kompatibilitas */
export function isValidAdminSession(): boolean {
  return isValidLegacyAdminSession();
}

export function saveLegacyAdminSession(): void {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ email: ADMIN_EMAIL, exp: Date.now() + SESSION_MS })
  );
}

export function clearLegacyAdminSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

/** @deprecated */
export function saveAdminSession(): void {
  saveLegacyAdminSession();
}

export function clearAdminSession(): void {
  clearLegacyAdminSession();
}

export function tryLegacyLogin(email: string, password: string): boolean {
  if (email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
    saveLegacyAdminSession();
    return true;
  }
  return false;
}

export function tryLogin(email: string, password: string): boolean {
  return tryLegacyLogin(email, password);
}
