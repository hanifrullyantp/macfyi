import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Copy, ExternalLink, Download, Loader2 } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { queueSiteEvent } from "../lib/siteAnalytics";
import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from "../lib/supabase";
import { isValidEmail, normalizeEmail } from "../lib/formValidation";

export function DownloadPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token")?.trim() ?? "", [params]);
  const [dmgUrl, setDmgUrl] = useState<string | null>(null);
  const [copyOk, setCopyOk] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [mintBusy, setMintBusy] = useState(false);
  const autoMintOnce = useRef(false);
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  useEffect(() => {
    queueSiteEvent("download_clicked", { has_token: Boolean(token) });
  }, [token]);

  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, "");
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
    if (!supabaseUrl || !anon) return;
    void (async () => {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/public-config`, {
          headers: { apikey: anon, Authorization: `Bearer ${anon}` },
        });
        const j = (await res.json()) as { download_url?: string | null };
        if (j.download_url) setDmgUrl(j.download_url);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    if (!isSupabaseBrowserConfigured()) {
      setAuthLoading(false);
      return;
    }
    const sb = getSupabaseBrowserClient();
    if (!sb) {
      setAuthLoading(false);
      return;
    }
    void sb.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setAuthLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, sess) => {
      setSession(sess);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const deepLink = token ? `macfyi://demo?token=${encodeURIComponent(token)}` : "macfyi://demo";

  const copyToken = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopyOk(true);
      window.setTimeout(() => setCopyOk(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const verifyTokenForUser = useCallback(async (): Promise<boolean> => {
    if (!token) return true;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, "");
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
    const sb = getSupabaseBrowserClient();
    const access = session?.access_token;
    if (!supabaseUrl || !anon || !access) return false;
    const res = await fetch(`${supabaseUrl}/functions/v1/demo-download-verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        apikey: anon,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    return res.ok && j.ok === true;
  }, [session?.access_token, token]);

  const openDmg = () => {
    if (!dmgUrl) return;
    window.open(dmgUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownloadClick = async () => {
    setAuthErr(null);
    if (!dmgUrl) {
      setAuthErr("Tautan unduhan belum dikonfigurasi.");
      return;
    }
    if (!session?.access_token) {
      setAuthErr("Silakan masuk terlebih dahulu untuk mengunduh.");
      return;
    }
    setDownloadBusy(true);
    try {
      if (token) {
        const ok = await verifyTokenForUser();
        if (!ok) {
          setAuthErr("Token demo tidak cocok dengan akun yang sedang masuk. Gunakan akun yang sama saat mendaftar demo.");
          return;
        }
      }
      openDmg();
    } finally {
      setDownloadBusy(false);
    }
  };

  const handleMintToken = async () => {
    setAuthErr(null);
    if (!session?.access_token) {
      setAuthErr("Masuk dulu untuk membuat token demo.");
      return;
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, "");
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
    if (!supabaseUrl || !anon) {
      setAuthErr("Supabase belum dikonfigurasi.");
      return;
    }
    setMintBusy(true);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/demo-request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: anon,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; download_url?: string; error?: string; message?: string };
      if (!res.ok || !data.ok || !data.download_url) {
        setAuthErr(data.message ?? data.error ?? "Gagal membuat token.");
        return;
      }
      const target = data.download_url.startsWith("http")
        ? data.download_url
        : `${window.location.origin}${data.download_url}`;
      window.location.href = target;
    } finally {
      setMintBusy(false);
    }
  };

  // Jika user datang dari email verifikasi (session terbentuk via URL) dan belum ada token,
  // otomatis buat token demo dan redirect ke /download?token=...
  useEffect(() => {
    if (!session?.access_token) return;
    if (token) return;
    if (mintBusy) return;
    if (autoMintOnce.current) return;
    autoMintOnce.current = true;
    void handleMintToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token, token, mintBusy]);

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErr(null);
    if (!isValidEmail(loginEmail)) {
      setAuthErr("Email tidak valid.");
      return;
    }
    if (!loginPassword.trim()) {
      setAuthErr("Password wajib diisi.");
      return;
    }
    const sb = getSupabaseBrowserClient();
    if (!sb) return;
    setDownloadBusy(true);
    try {
      const { error } = await sb.auth.signInWithPassword({
        email: normalizeEmail(loginEmail),
        password: loginPassword,
      });
      if (error) {
        setAuthErr(error.message);
        return;
      }
    } finally {
      setDownloadBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-white flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full rounded-2xl border border-white/10 bg-[#0B1220] p-8">
        <h1 className="text-2xl font-bold mb-2">Unduh Macfyi (Demo)</h1>
        <p className="text-sm text-white/55 mb-6">
          Pasang aplikasi desktop. Tombol unduh memerlukan akun (sesuai kebijakan demo). Token di bawah dipakai di dalam aplikasi untuk
          aktivasi demo.
        </p>

        {authLoading ? (
          <div className="flex items-center gap-2 text-white/45 text-sm mb-6">
            <Loader2 className="animate-spin" size={16} /> Memuat sesi…
          </div>
        ) : session ? (
          <p className="text-sm text-emerald-200/90 mb-4">
            Masuk sebagai <strong className="text-white">{session.user.email}</strong>
          </p>
        ) : (
          <div className="rounded-xl border border-white/10 bg-black/30 p-4 mb-6 space-y-3">
            <p className="text-sm text-white/60">Belum masuk. Login untuk membuka unduhan installer.</p>
            <form onSubmit={(e) => void handleQuickLogin(e)} className="space-y-2">
              <input
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm"
                placeholder="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                autoComplete="email"
              />
              <input
                type="password"
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="submit"
                disabled={downloadBusy}
                className="w-full rounded-lg bg-white/10 hover:bg-white/15 py-2 text-sm font-medium disabled:opacity-50"
              >
                {downloadBusy ? "Memproses…" : "Masuk"}
              </button>
            </form>
          </div>
        )}

        {token ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 mb-6">
            <div className="text-xs uppercase tracking-wide text-amber-200/80 mb-1">Token demo</div>
            <code className="text-xs break-all text-amber-100 block mb-3">{token}</code>
            <button
              type="button"
              onClick={() => void copyToken()}
              className="inline-flex items-center gap-2 text-sm text-amber-300 hover:text-amber-200"
            >
              <Copy size={16} /> {copyOk ? "Disalin" : "Salin token"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-white/45 mb-4">
            Tidak ada token di URL. Jika Anda sudah punya akun demo, buat token baru di sini setelah masuk.
          </p>
        )}

        {!token && session && (
          <button
            type="button"
            disabled={mintBusy}
            onClick={() => void handleMintToken()}
            className="w-full mb-4 rounded-xl border border-white/20 py-2.5 text-sm font-medium hover:bg-white/5 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {mintBusy ? <Loader2 className="animate-spin" size={16} /> : null}
            Buat / perbarui token demo
          </button>
        )}

        {authErr && <p className="text-sm text-red-300/90 mb-4">{authErr}</p>}

        <div className="space-y-3">
          {dmgUrl ? (
            <button
              type="button"
              onClick={() => void handleDownloadClick()}
              disabled={downloadBusy || authLoading || !session}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-red-600 hover:bg-red-500 font-bold py-3 disabled:opacity-40 disabled:pointer-events-none"
            >
              {downloadBusy ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
              Unduh installer / DMG
            </button>
          ) : (
            <p className="text-sm text-amber-200/90">
              Atur <strong>download_base_url</strong> di admin (app_settings) agar tautan unduhan tampil di sini.
            </p>
          )}
          <a
            href={deepLink}
            className="flex items-center justify-center gap-2 w-full rounded-xl border border-white/20 py-3 text-sm font-medium hover:bg-white/5"
          >
            <ExternalLink size={16} /> Buka Macfyi (deep link)
          </a>
        </div>

        <p className="text-xs text-white/35 mt-8 text-center">
          <Link to="/" className="underline hover:text-white">
            Kembali ke beranda
          </Link>
        </p>
      </div>
    </div>
  );
}
