const DEMO_TOKEN_KEY = "macfyi.demo.token_plain";
const DEMO_RULES_KEY = "macfyi.demo.rules_json";

export function getDemoToken(): string | null {
  try {
    return localStorage.getItem(DEMO_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setDemoSession(token: string, rulesSnapshot: Record<string, unknown>): void {
  try {
    localStorage.setItem(DEMO_TOKEN_KEY, token);
    localStorage.setItem(DEMO_RULES_KEY, JSON.stringify(rulesSnapshot));
  } catch {
    /* */
  }
}

export function clearDemoSession(): void {
  try {
    localStorage.removeItem(DEMO_TOKEN_KEY);
    localStorage.removeItem(DEMO_RULES_KEY);
  } catch {
    /* */
  }
}

export function isDemoMode(): boolean {
  return Boolean(getDemoToken()?.trim());
}

export function getDemoRules(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(DEMO_RULES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}
