import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, KeyRound, Monitor } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from "../lib/supabase";
import { SERVICE_UNAVAILABLE_MESSAGE } from "../lib/authErrors";

export function DesktopConnectPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const didRequestRef = useRef(false);

  const supabase = useMemo(() => (isSupabaseBrowserConfigured() ? getSupabaseBrowserClient() : null), []);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const loginPath = useMemo(
    () => `/login?redirect=${encodeURIComponent("/desktop-connect")}`,
    []
  );

  const createCode = useCallback(async () => {
    setErr(null);
    if (!supabase || !session?.access_token) {
      setErr("Anda perlu masuk dulu.");
      return;
    }
    const base = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, "");
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
    if (!base || !anon) {
      setErr(SERVICE_UNAVAILABLE_MESSAGE);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${base}/functions/v1/create-desktop-pairing`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: anon,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const j = (await res.json().catch(() => ({}))) as { code?: string; expires_at?: string; error?: string };
      if (!res.ok || !j.code) {
        setErr(j.error ?? "Gagal membuat kode.");
        return;
      }
      setCode(j.code);
      setExpiresAt(j.expires_at ?? null);
    } catch {
      setErr("Gagal menghubungi server.");
    } finally {
      setBusy(false);
    }
  }, [session, supabase]);

  useEffect(() => {
    if (!session?.access_token || didRequestRef.current) return;
    didRequestRef.current = true;
    void createCode();
  }, [session?.access_token, createCode]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="animate-spin text-red-400" size={32} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
        <Monitor className="text-red-500 mb-4" size={40} />
        <h1 className="text-xl font-bold text-center">Sambungkan aplikasi Mac</h1>
        <p className="text-white/55 text-sm text-center max-w-md mt-2">Masuk dulu, lalu kami tampilkan kode untuk ditempel di Macfyi.</p>
        <Link
          to={loginPath}
          className="mt-6 rounded-2xl bg-red-600 hover:bg-red-500 px-6 py-3 text-sm font-bold"
        >
          Masuk
        </Link>
        <Link to="/" className="mt-4 text-sm text-white/40 hover:text-white/70 underline">
          Beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="border-b border-white/10 px-4 py-4 flex items-center justify-between max-w-2xl mx-auto w-full">
        <Link to="/" className="text-sm text-white/50 hover:text-white">
          ← Beranda
        </Link>
        <button
          type="button"
          className="text-sm text-white/50 hover:text-white"
          onClick={() => void supabase?.auth.signOut().then(() => navigate(loginPath))}
        >
          Keluar
        </button>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 max-w-lg mx-auto w-full">
        <KeyRound className="text-amber-400 mb-3" size={36} />
        <h1 className="text-2xl font-bold text-center">Kode sambung desktop</h1>
        <p className="text-white/50 text-sm text-center mt-2">
          Buka aplikasi Macfyi di Mac → tempel kode sebelum habis waktu. Satu kode, satu kali pakai.
        </p>
        {busy && !code ? (
          <div className="mt-8 flex items-center gap-2 text-white/60">
            <Loader2 className="animate-spin" size={20} />
            <span>Membuat kode…</span>
          </div>
        ) : null}
        {err ? <p className="text-red-400 text-sm text-center mt-4">{err}</p> : null}
        {code ? (
          <div className="mt-8 w-full rounded-2xl border border-white/15 bg-white/[0.04] p-6 text-center">
            <p className="text-[10px] uppercase tracking-widest text-white/40">Kode</p>
            <p className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-white mt-2">{code}</p>
            {expiresAt ? (
              <p className="text-xs text-white/40 mt-3">Kadaluarsa: {new Date(expiresAt).toLocaleString("id-ID")}</p>
            ) : null}
            <button
              type="button"
              onClick={() => void createCode()}
              disabled={busy}
              className="mt-4 text-sm text-amber-400/90 hover:text-amber-300 disabled:opacity-50"
            >
              Buat kode baru
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
