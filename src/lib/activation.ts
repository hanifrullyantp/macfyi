const TOKEN_KEY = "macfyi.license.token";
const EMAIL_KEY = "macfyi.license.email";
const IS_PRO_KEY = "macfyi.license.is_pro";
const LICENSE_ID_KEY = "macfyi.license.id";

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

export function setLicenseSession(
  token: string,
  email: string,
  opts?: { isPro?: boolean; licenseId?: string | null }
): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(EMAIL_KEY, email);
    if (opts?.isPro != null) {
      localStorage.setItem(IS_PRO_KEY, opts.isPro ? "true" : "false");
    } else {
      localStorage.setItem(IS_PRO_KEY, "true");
    }
    if (opts?.licenseId) localStorage.setItem(LICENSE_ID_KEY, opts.licenseId);
    else localStorage.removeItem(LICENSE_ID_KEY);
  } catch {
    /* */
  }
}

export function setPairingSession(token: string, email: string, isPro: boolean, licenseId: string | null): void {
  setLicenseSession(token, email, { isPro, licenseId: licenseId ?? undefined });
}

export function clearLicenseSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(IS_PRO_KEY);
    localStorage.removeItem(LICENSE_ID_KEY);
  } catch {
    /* */
  }
}

export function getStoredIsPro(): boolean | null {
  try {
    const p = localStorage.getItem(IS_PRO_KEY);
    if (p === "true") return true;
    if (p === "false") return false;
    return null;
  } catch {
    return null;
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
