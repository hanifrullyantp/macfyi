import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import {
  isValidEmail,
  normalizeEmail,
  validatePassword,
  validatePersonName,
} from "../lib/formValidation";
import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from "../lib/supabase";
import { useToast } from "../components/ToastProvider";
import { describeAuthEmailFailureHint } from "../lib/authErrors";
import { queueSiteEvent } from "../lib/siteAnalytics";

type Tab = "login" | "register";

function safeRedirectPath(raw: string | null): string {
  const t = (raw ?? "").trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/download";
  return t.split("#")[0] ?? "/download";
}

export function AuthLoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const redirectPath = useMemo(() => safeRedirectPath(searchParams.get("redirect")), [searchParams]);

  const [tab, setTab] = useState<Tab>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const emailRedirectTo =
    typeof window !== "undefined" ? `${window.location.origin}${redirectPath}` : undefined;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!isSupabaseBrowserConfigured()) {
      toast("Supabase belum dikonfigurasi (VITE_SUPABASE_*).", "error");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast("Tidak bisa membuka koneksi Supabase.", "error");
      return;
    }
    if (!isValidEmail(email)) {
      toast("Format email tidak valid.", "error");
      return;
    }

    if (tab === "register") {
      const nameRes = validatePersonName(name);
      if (!nameRes.ok) {
        toast(nameRes.message, "error");
        return;
      }
      const pw = validatePassword(password);
      if (!pw.ok) {
        toast(pw.message, "error");
        return;
      }
      if (password !== password2) {
        toast("Konfirmasi password tidak sama.", "error");
        return;
      }
    } else if (!password.trim()) {
      toast("Password wajib diisi.", "error");
      return;
    }

    setSubmitting(true);
    try {
      queueSiteEvent("auth_login_submit", { tab, redirect: redirectPath });
      if (tab === "register") {
        const nameRes = validatePersonName(name);
        const { data, error } = await supabase.auth.signUp({
          email: normalizeEmail(email),
          password,
          options: {
            emailRedirectTo,
            data: { full_name: nameRes.ok ? nameRes.value : name.trim() },
          },
        });
        if (error) {
          const status =
            typeof (error as { status?: number }).status === "number"
              ? (error as { status?: number }).status
              : undefined;
          toast(describeAuthEmailFailureHint(status, error.message ?? ""), "error");
          return;
        }
        if (!data.session?.access_token) {
          toast(
            "Akun dibuat. Cek email untuk verifikasi, lalu klik tautan di email. Anda akan masuk otomatis dan kembali ke halaman unduhan.",
            "info"
          );
          return;
        }
        toast("Berhasil mendaftar.", "success");
        navigate(redirectPath, { replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizeEmail(email),
          password,
        });
        if (error) {
          toast(error.message?.trim() || "Gagal masuk.", "error");
          return;
        }
        toast("Selamat datang kembali.", "success");
        navigate(redirectPath, { replace: true });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-white flex flex-col">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white font-bold tracking-tight hover:opacity-90">
            <img src="/brand-logo-default.png" alt="" className="h-8 w-8 rounded-lg object-contain" />
            <span className="italic text-lg">Macfyi</span>
          </Link>
          <Link to="/download" className="text-sm text-white/50 hover:text-white">
            Unduh
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0B1220] p-8 shadow-2xl">
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-center mb-1">Akses unduhan</h1>
          <p className="text-sm text-white/50 text-center mb-6">
            Masuk atau daftar untuk mengunduh demo Macfyi untuk macOS.
          </p>

          <div className="flex rounded-lg border border-white/10 p-0.5 mb-6">
            <button
              type="button"
              className={`flex-1 rounded-md py-2 text-sm font-medium ${
                tab === "login" ? "bg-white/10 text-white" : "text-white/45"
              }`}
              onClick={() => setTab("login")}
            >
              Masuk
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md py-2 text-sm font-medium ${
                tab === "register" ? "bg-white/10 text-white" : "text-white/45"
              }`}
              onClick={() => setTab("register")}
            >
              Daftar
            </button>
          </div>

          <form onSubmit={(e) => void submit(e)} className="space-y-3">
            {tab === "register" && (
              <label className="block text-sm">
                <span className="text-white/50">Nama</span>
                <input
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </label>
            )}
            <label className="block text-sm">
              <span className="text-white/50">Email</span>
              <input
                className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <label className="block text-sm">
              <span className="text-white/50">Password</span>
              <input
                type="password"
                className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={tab === "register" ? "new-password" : "current-password"}
              />
            </label>
            {tab === "register" && (
              <label className="block text-sm">
                <span className="text-white/50">Konfirmasi password</span>
                <input
                  type="password"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : null}
              {tab === "register" ? "Daftar" : "Masuk"}
            </button>
          </form>

          <p className="text-xs text-white/35 mt-6 text-center">
            <Link to="/" className="underline hover:text-white">
              Kembali ke beranda
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
