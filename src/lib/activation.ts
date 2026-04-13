const TOKEN_KEY = "macfyi.license.token";
const EMAIL_KEY = "macfyi.license.email";

export function getStoredLicenseToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredLicenseEmail(): string | null {
  try {
    return localStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}

export function setLicenseSession(token: string, email: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EMAIL_KEY, email);
  } catch {
    /* */
  }
}

export function clearLicenseSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
  } catch {
    /* */
  }
}

export function shouldSkipLicenseGate(): boolean {
  return import.meta.env.VITE_SKIP_LICENSE === "true";
}

/**
 * When VITE_DEV_LICENSE_BYPASS=true, accept fixed email+key without calling Supabase (testing only).
 * Defaults: email `xx`, key `xxx` — override with VITE_DEV_LICENSE_EMAIL / VITE_DEV_LICENSE_KEY.
 */
export function tryDevLicenseBypass(email: string, licenseKey: string): string | null {
  if (import.meta.env.VITE_DEV_LICENSE_BYPASS !== "true") {
    return null;
  }
  const wantEmail = (import.meta.env.VITE_DEV_LICENSE_EMAIL ?? "xx").trim().toLowerCase();
  const wantKey = (import.meta.env.VITE_DEV_LICENSE_KEY ?? "xxx").trim();
  if (email.trim().toLowerCase() === wantEmail && licenseKey.trim() === wantKey) {
    return `dev-bypass-${crypto.randomUUID()}`;
  }
  return null;
}

export function licenseActivateUrl(): string {
  return (import.meta.env.VITE_LICENSE_ACTIVATE_URL as string | undefined)?.trim() ?? "";
}
