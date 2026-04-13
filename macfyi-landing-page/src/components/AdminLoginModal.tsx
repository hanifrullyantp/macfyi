import React, { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { tryLogin } from "../config/adminAuth";

export function AdminLoginModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  if (!open) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (tryLogin(email, password)) {
      onSuccess();
      setEmail("");
      setPassword("");
      onClose();
    } else {
      setErr("Email atau password tidak sesuai.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
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
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-white/50"
          aria-label="Tutup"
        >
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold mb-1">Masuk</h2>
        <p className="text-white/45 text-sm mb-6">
          Akun admin mengaktifkan mode sunting inline. Pengunjung lain dapat menutup jendela ini.
        </p>
        <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Email</label>
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-4 outline-none focus:border-red-500"
        />
        <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Password</label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-2 outline-none focus:border-red-500"
        />
        {err && <p className="text-red-400 text-sm mb-4">{err}</p>}
        <button
          type="submit"
          className="w-full bg-red-600 hover:bg-red-700 py-3 rounded-xl font-bold text-sm transition"
        >
          Masuk
        </button>
      </motion.form>
    </div>
  );
}
