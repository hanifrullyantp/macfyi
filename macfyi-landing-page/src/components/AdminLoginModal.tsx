import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { tryLegacyLogin } from "../config/adminAuth";
import { getSupabaseBrowserClient, isSupabaseBrowserConfigured, isSupabaseUserAdmin } from "../lib/supabase";

export function AdminLoginModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (info: { role: 'admin' | 'member' }) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (isSupabaseBrowserConfigured()) {
        const client = getSupabaseBrowserClient();
        if (!client) {
          setErr("Klien Supabase tidak tersedia.");
          return;
        }
        const { error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setErr(error.message || "Gagal masuk.");
          return;
        }
        const { data: userData } = await client.auth.getUser();
        const user = userData.user;
        const role = isSupabaseUserAdmin(user) ? 'admin' : 'member';
        onSuccess({ role });
        setEmail("");
        setPassword("");
        onClose();
        return;
      }

      if (tryLegacyLogin(email, password)) {
        onSuccess({ role: 'admin' });
        setEmail("");
        setPassword("");
        onClose();
        return;
      }
      setErr("Email atau password tidak sesuai.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !loading && onClose()}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.form
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0 }}
        onSubmit={submit}
        className="relative w-full max-w-md bg-[#0B1220] border border-white/10 rounded-2xl p-8 shadow-2xl"
      >
        <button
          type="button"
          onClick={() => !loading && onClose()}
          disabled={loading}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-white/50 disabled:opacity-40"
          aria-label="Tutup"
        >
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold mb-1">Masuk</h2>
        <p className="text-white/45 text-sm mb-6">
          {isSupabaseBrowserConfigured()
            ? "Akun admin dapat menyunting konten landing di halaman ini. Akun anggota tetap di halaman ini dan dapat membuka aplikasi lewat tombol Member."
            : "Mode lokal: kredensial diatur lewat variabel lingkungan. Hanya admin yang dapat menyunting; konten disimpan sebagai draft di perangkat ini."}
        </p>
        <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Email</label>
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-4 outline-none focus:border-red-500 disabled:opacity-50"
        />
        <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Password</label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-2 outline-none focus:border-red-500 disabled:opacity-50"
        />
        {err && <p className="text-red-400 text-sm mb-4">{err}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : null}
          Masuk
        </button>
      </motion.form>
    </div>
  );
}
