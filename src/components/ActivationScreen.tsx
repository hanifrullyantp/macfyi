import { useState } from "react";
import { activateLicense } from "../lib/backend";
import { licenseActivateUrl, setLicenseSession, tryDevLicenseBypass } from "../lib/activation";

type ActivationScreenProps = {
  onActivated: () => void;
};

export function ActivationScreen({ onActivated }: ActivationScreenProps) {
  const [email, setEmail] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(null);
    const bypassToken = tryDevLicenseBypass(email.trim(), licenseKey.trim());
    if (bypassToken) {
      setLicenseSession(bypassToken, email.trim());
      onActivated();
      return;
    }
    const url = licenseActivateUrl();
    if (!url) {
      setErr(
        "Set VITE_LICENSE_ACTIVATE_URL to your Supabase function URL, VITE_DEV_LICENSE_BYPASS=true for fixed test credentials, or VITE_SKIP_LICENSE=true to skip this screen."
      );
      return;
    }
    setLoading(true);
    try {
      const res = await activateLicense(email.trim(), licenseKey.trim(), url);
      if (!res.token) {
        setErr("Invalid response from server.");
        return;
      }
      setLicenseSession(res.token, email.trim());
      onActivated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-8 shadow-2xl">
        <h1 className="text-xl font-semibold text-white">Activate Macfyi</h1>
        <p className="text-sm text-white/55 mt-2">
          Enter the email used at purchase and your license key from the confirmation email.
        </p>
        <div className="mt-6 space-y-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/40">Email</label>
            <input
              type="text"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-brand)]"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/40">License key</label>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-brand)]"
              autoComplete="off"
            />
          </div>
        </div>
        {err && <p className="mt-3 text-sm text-red-300/90">{err}</p>}
        <button
          type="button"
          disabled={loading || !email.trim() || !licenseKey.trim()}
          onClick={() => void submit()}
          className="mt-6 w-full btn-primary py-2.5 disabled:opacity-50"
        >
          {loading ? "Activating…" : "Activate"}
        </button>
      </div>
    </div>
  );
}
