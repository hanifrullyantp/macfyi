import { useState } from "react";
import { activateLicense } from "../lib/backend";
import { licenseActivateUrl, setLicenseSession, tryDevLicenseBypass } from "../lib/activation";
import { applyPairingResult, exchangeDesktopPairingCode } from "../lib/desktopPairing";
import { setDemoSession } from "../lib/demoSession";
import { DEFAULT_BRAND_LOGO_URL } from "../lib/defaultBrandLogo";
import { sendClientTelemetry } from "../lib/telemetry";

const webLoginBase = () =>
  import.meta.env.VITE_WEB_LOGIN_URL?.trim() ||
  `${(import.meta.env.VITE_MARKETING_SITE_URL?.trim().replace(/\/$/, "") || "https://macfyi.com")}/login?redirect=${encodeURIComponent("/desktop-connect")}`;

export function AccountGateScreen({
  brandLogoUrl,
  onReady,
}: {
  brandLogoUrl: string;
  onReady: () => void;
  /** @deprecated use onReady */
  onActivated?: () => void;
  onDemoStart?: (token: string, rules: Record<string, unknown>) => void;
}) {
  const [pairCode, setPairCode] = useState("");
  const [pairErr, setPairErr] = useState<string | null>(null);
  const [pairLoading, setPairLoading] = useState(false);
  const [showAlt, setShowAlt] = useState(false);

  const [mode, setMode] = useState<"demo" | "license">("demo");
  const [email, setEmail] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [demoToken, setDemoToken] = useState("");
  const [altErr, setAltErr] = useState<string | null>(null);
  const [altLoading, setAltLoading] = useState(false);

  const openWebLogin = () => {
    try {
      window.open(webLoginBase(), "_blank", "noopener,noreferrer");
      void sendClientTelemetry("DesktopLoginWebOpened", {});
    } catch {
      /* */
    }
  };

  const submitPairing = async () => {
    setPairErr(null);
    if (!pairCode.trim()) {
      setPairErr("Tempel kode dari halaman web.");
      return;
    }
    setPairLoading(true);
    try {
      const r = await exchangeDesktopPairingCode(pairCode);
      applyPairingResult(r);
      void sendClientTelemetry("DesktopPairingSuccess", { is_pro: r.is_pro });
      onReady();
    } catch (e) {
      setPairErr(e instanceof Error ? e.message : String(e));
    } finally {
      setPairLoading(false);
    }
  };

  const submitLicense = async () => {
    setAltErr(null);
    const bypassToken = tryDevLicenseBypass(email.trim(), licenseKey.trim());
    if (bypassToken) {
      setLicenseSession(bypassToken, email.trim(), { isPro: true });
      onReady();
      return;
    }
    const url = licenseActivateUrl();
    if (!url) {
      setAltErr("Set VITE_LICENSE_ACTIVATE_URL or use pairing / demo.");
      return;
    }
    setAltLoading(true);
    try {
      const res = await activateLicense(email.trim(), licenseKey.trim(), url);
      if (!res.token) {
        setAltErr("Invalid response from server.");
        return;
      }
      setLicenseSession(res.token, email.trim(), { isPro: true, licenseId: res.licenseId });
      onReady();
    } catch (e) {
      setAltErr(e instanceof Error ? e.message : String(e));
    } finally {
      setAltLoading(false);
    }
  };

  const submitDemo = async () => {
    setAltErr(null);
    const token = demoToken.trim();
    if (token.length < 16) {
      setAltErr("Paste the demo token from the download page.");
      return;
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, "");
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
    if (!supabaseUrl || !anon) {
      setAltErr("Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }
    setAltLoading(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/demo-verify`, {
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
        setAltErr(data.error === "expired" ? "Demo token expired." : "Invalid demo token.");
        return;
      }
      setDemoSession(token, data.rules_snapshot ?? {});
      onReady();
    } catch (e) {
      setAltErr(e instanceof Error ? e.message : String(e));
    } finally {
      setAltLoading(false);
    }
  };

  const logo = brandLogoUrl || DEFAULT_BRAND_LOGO_URL;

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[var(--color-bg)] px-6 overflow-y-auto py-8">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-8 shadow-2xl space-y-6">
        <div className="flex justify-center">
          <img src={logo} alt="" className="h-16 w-16 object-contain rounded-2xl bg-white/5 border border-white/10" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white text-center">Masuk ke Macfyi</h1>
          <p className="text-sm text-white/50 mt-2 text-center leading-relaxed">
            Buka browser untuk login, lalu dapatkan kode sambung di halaman <span className="text-white/70">/desktop-connect</span>. Tempel kode di bawah.
          </p>
        </div>
        <button
          type="button"
          onClick={openWebLogin}
          className="w-full py-3 rounded-xl font-semibold bg-white/10 hover:bg-white/15 border border-white/15 text-white"
        >
          Buka login di browser
        </button>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-white/40">Kode sambung desktop</label>
          <input
            value={pairCode}
            onChange={(e) => setPairCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX"
            className="mt-1 w-full font-mono rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--color-brand)]"
            autoComplete="one-time-code"
          />
        </div>
        {pairErr ? <p className="text-sm text-red-300/90">{pairErr}</p> : null}
        <button
          type="button"
          disabled={pairLoading || !pairCode.trim()}
          onClick={() => void submitPairing()}
          className="w-full btn-primary py-3 disabled:opacity-50"
        >
          {pairLoading ? "Memverifikasi…" : "Sambungkan ke akun saya"}
        </button>
        <button
          type="button"
          onClick={() => setShowAlt((v) => !v)}
          className="w-full text-xs text-white/40 hover:text-white/65 py-1"
        >
          {showAlt ? "Tutup metode lain" : "Token demo / kunci lisensi"}
        </button>
        {showAlt ? (
          <div className="border-t border-white/10 pt-4 space-y-4">
            <div className="flex rounded-lg border border-white/10 p-0.5">
              <button
                type="button"
                className={`flex-1 rounded-md py-2 text-sm font-medium ${
                  mode === "demo" ? "bg-white/10 text-white" : "text-white/45"
                }`}
                onClick={() => setMode("demo")}
              >
                Demo
              </button>
              <button
                type="button"
                className={`flex-1 rounded-md py-2 text-sm font-medium ${
                  mode === "license" ? "bg-white/10 text-white" : "text-white/45"
                }`}
                onClick={() => setMode("license")}
              >
                License key
              </button>
            </div>
            {mode === "license" ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] uppercase text-white/40">Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="text-[11px] uppercase text-white/40">License key</label>
                  <input
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
                  />
                </div>
                {altErr ? <p className="text-sm text-red-300/90">{altErr}</p> : null}
                <button
                  type="button"
                  disabled={altLoading}
                  onClick={() => void submitLicense()}
                  className="w-full py-2.5 btn-primary disabled:opacity-50"
                >
                  {altLoading ? "…" : "Activate"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={demoToken}
                  onChange={(e) => setDemoToken(e.target.value)}
                  rows={3}
                  placeholder="Paste demo token…"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white font-mono"
                />
                {altErr ? <p className="text-sm text-red-300/90">{altErr}</p> : null}
                <button
                  type="button"
                  disabled={altLoading}
                  onClick={() => void submitDemo()}
                  className="w-full py-2.5 btn-primary disabled:opacity-50"
                >
                  {altLoading ? "…" : "Start demo"}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
