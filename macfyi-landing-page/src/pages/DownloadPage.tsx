import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link, useNavigate, useLocation } from "react-router-dom";
import { Copy, ExternalLink, Download, Loader2, LogOut } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { queueSiteEvent } from "../lib/siteAnalytics";
import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from "../lib/supabase";

const CARD_BG = "/landing/detail-01-deep-scan.png";

function AppleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.48 0-1.87-.88-3.63-.88-1.76 0-2.31.91-3.65.91-1.35 0-2.37-1.21-3.42-2.67-1.75-2.66-1.87-5.94-.83-7.63.73-1.24 2.02-2.11 3.45-2.11 1.32 0 2.41.88 3.63.88 1.18 0 1.9-1 3.73-1 1.35 0 2.67.56 3.49 1.45-.09.06-2.09 1.28-2.2 3.72-.12 2.86 2.03 3.86 2.15 3.92z" />
    </svg>
  );
}

export function DownloadPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const token = useMemo(() => params.get("token")?.trim() ?? "", [params]);
  const [dmgUrl, setDmgUrl] = useState<string | null>(null);
  const [copyOk, setCopyOk] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [mintBusy, setMintBusy] = useState(false);
  const autoMintOnce = useRef(false);
  const [authErr, setAuthErr] = useState<string | null>(null);
  const loginRedirect = useMemo(
    () => `/login?redirect=${encodeURIComponent(`/download${location.search}`)}`,
    [location.search]
  );

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

  const handleMintToken = async () => {
    setAuthErr(null);
    if (!session?.access_token) {
      navigate(loginRedirect);
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
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        download_url?: string;
        error?: string;
        message?: string;
      };
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

  useEffect(() => {
    if (!session?.access_token) return;
    if (token) return;
    if (mintBusy) return;
    if (autoMintOnce.current) return;
    autoMintOnce.current = true;
    void handleMintToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token, token, mintBusy]);

  const startDmgDownload = useCallback(() => {
    if (!dmgUrl) return;
    queueSiteEvent("download_dmg_started", { has_token: Boolean(token) });
    window.location.href = dmgUrl;
  }, [dmgUrl, token]);

  const onMacDownloadClick = async () => {
    setAuthErr(null);
    if (!dmgUrl) {
      setAuthErr("Tautan unduhan belum dikonfigurasi di server.");
      return;
    }
    if (authLoading) return;
    if (!session?.access_token) {
      navigate(loginRedirect);
      return;
    }
    setDownloadBusy(true);
    try {
      if (token) {
        const ok = await verifyTokenForUser();
        if (!ok) {
          setAuthErr(
            "Token demo tidak cocok dengan akun yang sedang masuk. Gunakan akun yang sama saat mendaftar demo."
          );
          return;
        }
      }
      startDmgDownload();
    } finally {
      setDownloadBusy(false);
    }
  };

  const signOut = async () => {
    const sb = getSupabaseBrowserClient();
    if (!sb) return;
    await sb.auth.signOut();
    autoMintOnce.current = false;
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="border-b border-white/10 bg-black/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 text-white font-bold tracking-tight hover:opacity-90">
            <img src="/brand-logo-default.png" alt="" className="h-9 w-9 rounded-xl object-contain border border-white/10" />
            <span className="italic text-xl">Macfyi</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {authLoading ? (
              <span className="text-white/40">…</span>
            ) : session ? (
              <>
                <span className="text-white/45 max-w-[160px] truncate hidden sm:inline">{session.user.email}</span>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="inline-flex items-center gap-1.5 text-white/50 hover:text-white"
                >
                  <LogOut size={16} />
                  Keluar
                </button>
              </>
            ) : (
              <Link to={loginRedirect} className="text-white/70 hover:text-white font-medium">
                Masuk
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-10 sm:pt-16 pb-20">
        <h1 className="font-serif text-center text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">
          Unduh Macfyi
        </h1>
        <p className="text-center text-white/55 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-12 sm:mb-14">
          Analisis penyimpanan, pembersihan aman berbasis risiko, dan kontrol penuh di satu aplikasi untuk Mac—coba demo
          desktop untuk macOS.
        </p>

        <div className="max-w-xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden border border-white/12 shadow-2xl shadow-black/50">
            <div
              className="relative min-h-[300px] sm:min-h-[340px] bg-cover bg-center"
              style={{ backgroundImage: `url(${CARD_BG})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/25" />
              {mintBusy ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm">
                  <Loader2 className="animate-spin text-red-400" size={28} />
                  <p className="text-sm text-white/80 px-4 text-center">Menyiapkan akses demo…</p>
                </div>
              ) : null}
              <div className="relative z-[1] flex flex-col justify-end min-h-[300px] sm:min-h-[340px] p-6 sm:p-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                  Desktop <span className="text-white">macOS</span>
                </h2>
                <p className="text-sm text-white/65 leading-relaxed mb-6 max-w-md">
                  Dioptimalkan untuk Mac—berjalan di Apple silicon maupun Intel. Unduh installer, lalu tempel token demo di
                  aplikasi saat diminta.
                </p>
                <button
                  type="button"
                  onClick={() => void onMacDownloadClick()}
                  disabled={downloadBusy || authLoading || mintBusy || !dmgUrl}
                  className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto rounded-2xl bg-[#EF4444] hover:bg-red-500 text-white font-bold text-base px-8 py-3.5 shadow-lg shadow-red-900/30 disabled:opacity-45 disabled:pointer-events-none transition-colors"
                >
                  {downloadBusy ? <Loader2 className="animate-spin" size={22} /> : <AppleGlyph className="h-6 w-6" />}
                  Unduh untuk macOS
                </button>
                {!dmgUrl ? (
                  <p className="text-xs text-amber-200/90 mt-3">
                    Tautan DMG belum diatur. Konfigurasi unduhan di admin / app_settings.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {authErr ? <p className="text-sm text-red-300/95 mt-4 text-center px-2">{authErr}</p> : null}

          <div className="mt-10 rounded-2xl border border-white/10 bg-[#0B1220]/80 p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white/90">Token &amp; aplikasi</h3>
            {token ? (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
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
              <p className="text-sm text-white/45">
                {!session
                  ? "Setelah masuk, token demo akan dibuat otomatis bila Anda belum punya di URL."
                  : "Jika unduhan tidak memuat token di URL, gunakan tombol di bawah."}
              </p>
            )}

            {!token && session && !mintBusy ? (
              <button
                type="button"
                onClick={() => void handleMintToken()}
                className="w-full rounded-xl border border-white/15 py-2.5 text-sm font-medium hover:bg-white/5 flex items-center justify-center gap-2"
              >
                Buat / perbarui token demo
              </button>
            ) : null}

            <a
              href={deepLink}
              className="flex items-center justify-center gap-2 w-full rounded-xl border border-white/15 py-3 text-sm font-medium hover:bg-white/5"
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
      </main>
    </div>
  );
}
