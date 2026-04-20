import { useEffect, useState } from "react";
import { activateLicense } from "../lib/backend";
import { licenseActivateUrl, setLicenseSession, tryDevLicenseBypass } from "../lib/activation";

type Mode = "license" | "demo";

type ActivationScreenProps = {
  brandLogoUrl?: string | null;
  onActivated: () => void;
  onDemoStart: (token: string, rules: Record<string, unknown>) => void;
  prefillEmail?: string | null;
  prefillLicense?: string | null;
};

export function ActivationScreen({
  brandLogoUrl,
  onActivated,
  onDemoStart,
  prefillEmail,
  prefillLicense,
}: ActivationScreenProps) {
  const [mode, setMode] = useState<Mode>("demo");
  const [email, setEmail] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [demoToken, setDemoToken] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prefillEmail) setEmail(prefillEmail);
  }, [prefillEmail]);

  useEffect(() => {
    if (prefillLicense) {
      setLicenseKey(prefillLicense);
      setMode("license");
    }
  }, [prefillLicense]);

  const verifyUrl = (): string | null => {
    const base = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, "");
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
    if (!base || !anon) return null;
    return `${base}/functions/v1/demo-verify`;
  };

  const submitLicense = async () => {
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

  const submitDemo = async () => {
    setErr(null);
    const token = demoToken.trim();
    if (token.length < 16) {
      setErr("Paste the demo token from the download page.");
      return;
    }
    const url = verifyUrl();
    if (!url) {
      setErr("Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for demo verification.");
      return;
    }
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!.trim();
    setLoading(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          apikey: anon,
          Authorization: `Bearer ${anon}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        valid?: boolean;
        rules_snapshot?: Record<string, unknown>;
        error?: string;
      };
      if (!res.ok || !data.valid) {
        setErr(data.error === "expired" ? "Demo token expired." : "Invalid demo token.");
        return;
      }
      onDemoStart(token, data.rules_snapshot ?? {});
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <img
            src={brandLogoUrl || ""}
            alt=""
            className="h-16 w-16 object-contain rounded-2xl bg-white/5 border border-white/10"
          />
        </div>
        <div className="flex rounded-lg border border-white/10 p-0.5 mb-6">
          <button
            type="button"
            className={`flex-1 rounded-md py-2 text-sm font-medium ${mode === "demo" ? "bg-white/10 text-white" : "text-white/45"}`}
            onClick={() => setMode("demo")}
          >
            Free demo
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md py-2 text-sm font-medium ${mode === "license" ? "bg-white/10 text-white" : "text-white/45"}`}
            onClick={() => setMode("license")}
          >
            I have a license
          </button>
        </div>

        {mode === "license" ? (
          <>
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
              onClick={() => void submitLicense()}
              className="mt-6 w-full btn-primary py-2.5 disabled:opacity-50"
            >
              {loading ? "Activating…" : "Activate"}
            </button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-white">Start free demo</h1>
            <p className="text-sm text-white/55 mt-2">
              Get a token from the Macfyi website (Coba Gratis), or open the <code className="text-white/70">macfyi://demo?token=…</code> link from
              your browser.
            </p>
            <div className="mt-6">
              <label className="text-[11px] uppercase tracking-wider text-white/40">Demo token</label>
              <textarea
                value={demoToken}
                onChange={(e) => setDemoToken(e.target.value)}
                rows={3}
                placeholder="Paste token…"
                className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-brand)] font-mono"
              />
            </div>
            {err && <p className="mt-3 text-sm text-red-300/90">{err}</p>}
            <button
              type="button"
              disabled={loading || !demoToken.trim()}
              onClick={() => void submitDemo()}
              className="mt-6 w-full btn-primary py-2.5 disabled:opacity-50"
            >
              {loading ? "Checking…" : "Start demo"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
