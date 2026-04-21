import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import {
  isValidEmail,
  normalizeEmail,
  validatePassword,
  validatePersonName,
  validatePhoneOptional,
} from "../lib/formValidation";
import { getMacfyiVisitorId, queueSiteEvent } from "../lib/siteAnalytics";
import { getSupabaseBrowserClient, isSupabaseBrowserConfigured } from "../lib/supabase";
import { firePixelStep } from "../lib/conversionPixels";
import type { SiteSettings } from "../types/content";

type AuthTab = "register" | "login";

export function DemoRequestModal({
  open,
  onClose,
  toast,
  settings,
  demoSource,
}: {
  open: boolean;
  onClose: () => void;
  toast: (msg: string, type?: "info" | "success" | "error") => void;
  settings: SiteSettings;
  demoSource: string;
}) {
  const [authTab, setAuthTab] = useState<AuthTab>("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const describeUnknownError = (e: unknown): string => {
    if (!e) return "Terjadi kesalahan.";
    if (typeof e === "string") return e;
    if (e instanceof Error) return e.message || "Terjadi kesalahan.";
    if (typeof e === "object") {
      const o = e as Record<string, unknown>;
      const msg = typeof o.message === "string" ? o.message.trim() : "";
      if (msg) return msg;
      const status = typeof o.status === "number" ? o.status : undefined;
      if (status === 504 || status === 500) {
        return describeAuthEmailFailureHint(status, "");
      }
      const keys = Object.keys(o);
      if (keys.length === 0) return "Terjadi kesalahan. Coba lagi atau periksa koneksi.";
    }
    try {
      const s = JSON.stringify(e);
      return s === "{}" ? "Terjadi kesalahan. Coba lagi atau periksa koneksi." : s;
    } catch {
      return String(e);
    }
  };

  /** Maps GoTrue / network errors to a short ID message; 504 on signup is usually custom SMTP timeout. */
  const describeAuthEmailFailureHint = (status: number | undefined, message: string): string => {
    const raw = message.trim();
    const lower = raw.toLowerCase();
    const smtpLikely =
      status === 504 ||
      status === 500 ||
      lower.includes("504") ||
      lower.includes("500") ||
      lower.includes("timeout") ||
      lower.includes("gateway") ||
      lower.includes("error sending") ||
      lower.includes("confirmation email") ||
      lower.includes("smtp");
    const base = raw || "Gagal mengirim email verifikasi.";
    if (!smtpLikely) return base;
    return `${base} Penyebab umum: SMTP custom di Supabase (Authentication → SMTP) tidak terhubung dari cloud Supabase—coba username = alamat email pengirim lengkap (mis. no-reply@macfyi.com), cocokkan port 465 (SSL) vs 587 (STARTTLS) dengan panel hosting, pastikan mail server tidak hanya mengizinkan IP situs Anda, atau gunakan penyedia transaksional (Resend, SES, SendGrid).`;
  };

  useEffect(() => {
    if (!open) return;
    firePixelStep(settingsRef.current, "demo_modal_open", { source: demoSource });
    queueSiteEvent("demo_modal_open", { source: demoSource });
  }, [open, demoSource]);

  if (!open) return null;

  const callDemoRequest = async (accessToken: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, "");
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
    if (!supabaseUrl || !anon) {
      toast("Supabase belum dikonfigurasi (VITE_SUPABASE_*).", "error");
      return;
    }
    let bodyName: string | undefined;
    if (authTab === "register") {
      const nameRes = validatePersonName(name);
      bodyName = nameRes.ok ? nameRes.value : name.trim();
    }
    const ph0 = validatePhoneOptional(phone);
    const res = await fetch(`${supabaseUrl}/functions/v1/demo-request`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anon,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: bodyName,
        email: normalizeEmail(email),
        phone: ph0.ok && ph0.digits ? ph0.digits : undefined,
        message: message.trim() || undefined,
        visitor_id: getMacfyiVisitorId(),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      download_url?: string;
      error?: string;
      message?: string;
    };
    if (!res.ok || !data.ok || !data.download_url) {
      toast(data.message ?? data.error ?? "Gagal membuat tautan unduhan.", "error");
      return;
    }
    toast("Berhasil! Mengalihkan ke halaman unduhan…", "success");
    firePixelStep(settingsRef.current, "demo_download_ready", { source: demoSource });
    queueSiteEvent("demo_download_ready", { source: demoSource });
    window.setTimeout(() => {
      const target = data.download_url!.startsWith("http")
        ? data.download_url!
        : `${window.location.origin}${data.download_url}`;
      window.location.href = target;
    }, 400);
  };

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
    const ph = validatePhoneOptional(phone);
    if (!ph.ok) {
      toast(ph.message, "error");
      return;
    }

    if (authTab === "register") {
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
      queueSiteEvent("lead_submitted", { form: "demo_request_auth", tab: authTab });
      firePixelStep(settingsRef.current, "demo_submit", { tab: authTab, source: demoSource });
      if (authTab === "register") {
        const nameRes = validatePersonName(name);
        const origin =
          typeof window !== "undefined" ? `${window.location.origin}/` : undefined;
        const { data, error } = await supabase.auth.signUp({
          email: normalizeEmail(email),
          password,
          options: {
            // Setelah verifikasi email, langsung arahkan ke /download agar user dapat token + DMG tanpa login ulang.
            emailRedirectTo: origin ? `${origin}download` : undefined,
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
        const session = data.session;
        if (!session?.access_token) {
          toast(
            "Akun dibuat. Cek email untuk verifikasi, lalu klik tombol di email. Anda akan diarahkan otomatis ke halaman unduh Macfyi.",
            "info"
          );
          return;
        }
        await callDemoRequest(session.access_token);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizeEmail(email),
          password,
        });
        if (error || !data.session?.access_token) {
          toast(error?.message?.trim() || "Gagal masuk. Periksa email & password.", "error");
          return;
        }
        await callDemoRequest(data.session.access_token);
      }
    } catch (e) {
      toast(describeUnknownError(e), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center p-4 bg-black/70" role="dialog">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0B1220] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Coba Gratis (Demo)</h2>
            <p className="text-sm text-white/50 mt-1">
              Daftar atau masuk dengan email &amp; password. Setelah itu Anda diarahkan ke halaman unduhan + token demo.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white p-1 shrink-0" aria-label="Tutup">
            <X size={22} />
          </button>
        </div>

        <div className="flex rounded-lg border border-white/10 p-0.5 mb-4">
          <button
            type="button"
            className={`flex-1 rounded-md py-2 text-sm font-medium ${
              authTab === "register" ? "bg-white/10 text-white" : "text-white/45"
            }`}
            onClick={() => setAuthTab("register")}
          >
            Daftar
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md py-2 text-sm font-medium ${
              authTab === "login" ? "bg-white/10 text-white" : "text-white/45"
            }`}
            onClick={() => setAuthTab("login")}
          >
            Masuk
          </button>
        </div>

        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          {authTab === "register" && (
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
              autoComplete={authTab === "register" ? "new-password" : "current-password"}
            />
          </label>
          {authTab === "register" && (
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
          <label className="block text-sm">
            <span className="text-white/50">Telepon (opsional)</span>
            <input
              className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </label>
          <label className="block text-sm">
            <span className="text-white/50">Pesan (opsional)</span>
            <textarea
              className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-white min-h-[72px]"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold py-3 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="animate-spin" size={18} /> : null}
            {authTab === "register" ? "Daftar & lanjut unduhan" : "Masuk & lanjut unduhan"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
