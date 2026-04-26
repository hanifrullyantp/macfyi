import {
  getStoredIsPro,
  getStoredLicenseEmail,
  getStoredLicenseToken,
  shouldSkipLicenseGate,
} from "./activation";
import { isDemoMode } from "./demoSession";

/** Paid Pro: cleanup, uninstall, trash empty, etc. Demo and logged-in non-buyers are not Pro. */
export function getIsProEntitled(): boolean {
  if (shouldSkipLicenseGate()) return true;
  if (import.meta.env.VITE_DEV_PRO_ENTITLED === "true") return true;
  if (isDemoMode()) return false;
  if (!getStoredLicenseToken() || !getStoredLicenseEmail()) return false;
  const p = getStoredIsPro();
  if (p === true) return true;
  if (p === false) return false;
  // Legacy sessions (before is_pro flag): non-demo token implied license-key activation = Pro
  return true;
}
