import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { isValidEmail, normalizeEmail } from "../lib/formValidation";
import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from "../lib/supabase";
import { useToast } from "../components/ToastProvider";
import { describeAuthEmailFailureHint, SERVICE_UNAVAILABLE_MESSAGE } from "../lib/authErrors";

export function AuthForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!isSupabaseBrowserConfigured()) {
      toast(SERVICE_UNAVAILABLE_MESSAGE, "error");
      return;
    }
    if (!isValidEmail(email)) {
      toast("Format email tidak valid.", "error");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast(SERVICE_UNAVAILABLE_MESSAGE, "error");
      return;
    }

    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
        redirectTo,
      });
      if (error) {
        const status =
          typeof (error as { status?: number }).status === "number"
            ? (error as { status?: number }).status
            : undefined;
        toast(describeAuthEmailFailureHint(status, error.message ?? ""), "error");
        return;
      }
      setSent(true);
      toast("Email reset password telah dikirim. Cek kotak masuk Anda.", "success");
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
          <Link to="/login" className="text-sm text-white/50 hover:text-white">
            Masuk
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0B1220] p-8 shadow-2xl">
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-center mb-1">Lupa password</h1>
          <p className="text-sm text-white/50 text-center mb-6">
            Masukkan email akun Anda. Kami akan mengirim tautan untuk mengatur ulang password.
          </p>

          {sent ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-white/70">
                Jika email terdaftar, tautan reset telah dikirim ke <strong>{normalizeEmail(email)}</strong>.
              </p>
              <p className="text-xs text-white/40">Cek folder spam jika tidak muncul dalam beberapa menit.</p>
              <Link
                to="/login"
                className="inline-block text-sm text-red-400 hover:text-red-300 underline"
              >
                Kembali ke halaman masuk
              </Link>
            </div>
          ) : (
            <form onSubmit={(e) => void submit(e)} className="space-y-3">
              <label className="block text-sm">
                <span className="text-white/50">Email</span>
                <input
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  type="email"
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : null}
                Kirim tautan reset
              </button>
            </form>
          )}

          <p className="text-xs text-white/35 mt-6 text-center">
            <Link to="/login" className="underline hover:text-white">
              Kembali ke masuk
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
