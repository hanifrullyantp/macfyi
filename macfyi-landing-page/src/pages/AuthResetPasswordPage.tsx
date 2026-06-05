import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { validatePassword } from "../lib/formValidation";
import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from "../lib/supabase";
import { useToast } from "../components/ToastProvider";
import { PasswordInput } from "../components/PasswordInput";

export function AuthResetPasswordPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isSupabaseBrowserConfigured()) {
      setChecking(false);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setChecking(false);
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
      setChecking(false);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      setChecking(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const pw = validatePassword(password);
    if (!pw.ok) {
      toast(pw.message, "error");
      return;
    }
    if (password !== password2) {
      toast("Konfirmasi password tidak sama.", "error");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast("Tidak bisa membuka koneksi Supabase.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast(error.message?.trim() || "Gagal mengatur ulang password.", "error");
        return;
      }
      toast("Password berhasil diperbarui.", "success");
      navigate("/login", { replace: true });
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
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0B1220] p-8 shadow-2xl">
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-center mb-1">Password baru</h1>
          <p className="text-sm text-white/50 text-center mb-6">Masukkan password baru untuk akun Anda.</p>

          {checking ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-white/50" size={28} />
            </div>
          ) : !ready ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-white/60">
                Tautan reset tidak valid atau sudah kedaluwarsa. Minta tautan baru dari halaman lupa password.
              </p>
              <Link to="/lupa-password" className="text-sm text-red-400 hover:text-red-300 underline">
                Minta tautan reset
              </Link>
            </div>
          ) : (
            <form onSubmit={(e) => void submit(e)} className="space-y-3">
              <label className="block text-sm">
                <span className="text-white/50">Password baru</span>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  autoComplete="new-password"
                />
              </label>
              <label className="block text-sm">
                <span className="text-white/50">Konfirmasi password</span>
                <PasswordInput
                  value={password2}
                  onChange={setPassword2}
                  autoComplete="new-password"
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : null}
                Simpan password
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
