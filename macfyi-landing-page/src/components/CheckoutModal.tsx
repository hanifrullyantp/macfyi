import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { X, CreditCard, ExternalLink, Loader2 } from "lucide-react";
import type { ContentData } from "../types/content";
import { addLead } from "../lib/leads";
import {
  isValidEmail,
  normalizeEmail,
  validatePersonName,
  validatePhoneRequired,
} from "../lib/formValidation";
import { loadMidtransSnapScript, payWithSnap } from "../lib/midtransSnap";
import { getReferralSlugFromCookie, queueSiteEvent } from "../lib/siteAnalytics";
import { getSupabaseBrowserClient } from "../lib/supabase";

function buildCheckoutLink(base: string, email: string, name: string, phoneDigits: string): string | null {
  const b = base.trim();
  if (!b || !/^https?:\/\//i.test(b)) return null;
  try {
    const u = new URL(b);
    u.searchParams.set("email", normalizeEmail(email));
    u.searchParams.set("name", name.trim());
    if (phoneDigits) u.searchParams.set("phone", phoneDigits);
    return u.toString();
  } catch {
    return b;
  }
}

export function CheckoutModal({
  open,
  onClose,
  settings,
  productLabel,
  priceDisplay,
  toast,
}: {
  open: boolean;
  onClose: () => void;
  settings: ContentData["settings"];
  productLabel: string;
  priceDisplay: string;
  toast: (msg: string, type?: "info" | "success" | "error") => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErr, setFieldErr] = useState<Partial<Record<"name" | "email" | "phone", string>>>({});

  useEffect(() => {
    if (!open) {
      setName("");
      setEmail("");
      setPhone("");
      setAgree(false);
      setSubmitting(false);
      setFieldErr({});
    } else {
      queueSiteEvent("form_open", { form: "checkout" });
    }
  }, [open]);

  const useMidtransSnap = useMemo(() => {
    const u = import.meta.env.VITE_SUPABASE_URL?.trim();
    const k = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
    const off = import.meta.env.VITE_USE_MIDTRANS_SNAP === "false";
    return Boolean(u && k && !off);
  }, []);

  if (!open) return null;

  const waDigits = settings.whatsapp?.replace(/\D/g, "") ?? "";
  const whatsappHref =
    settings.whatsapp?.trim() && settings.whatsapp.startsWith("http")
      ? settings.whatsapp.trim()
      : waDigits.length >= 8
        ? `https://wa.me/${waDigits}`
        : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setFieldErr({});
    const nameRes = validatePersonName(name);
    if (!nameRes.ok) {
      setFieldErr((f) => ({ ...f, name: nameRes.message }));
      toast(nameRes.message, "error");
      return;
    }
    if (!isValidEmail(email)) {
      const msg = "Format email tidak valid.";
      setFieldErr((f) => ({ ...f, email: msg }));
      toast(msg, "error");
      return;
    }
    const phoneRes = validatePhoneRequired(phone);
    if (!phoneRes.ok) {
      setFieldErr((f) => ({ ...f, phone: phoneRes.message }));
      toast(phoneRes.message, "error");
      return;
    }
    if (!agree) {
      toast("Centang persetujuan untuk melanjutkan.", "error");
      return;
    }

    setSubmitting(true);
    try {
      addLead({
        name: nameRes.value,
        email: normalizeEmail(email),
        phone: phoneRes.digits,
        message: "Checkout — niat beli",
      });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, "");
      const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

      if (useMidtransSnap && supabaseUrl && anon) {
        let authToken = anon;
        const sb = getSupabaseBrowserClient();
        if (sb) {
          const { data: sess } = await sb.auth.getSession();
          if (sess.session?.access_token) authToken = sess.session.access_token;
        }
        const referral_slug = getReferralSlugFromCookie() ?? undefined;
        const res = await fetch(`${supabaseUrl}/functions/v1/create-midtrans-snap`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            apikey: anon,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: normalizeEmail(email),
            name: nameRes.value,
            phone: phoneRes.digits,
            ...(referral_slug ? { referral_slug } : {}),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          snap_token?: string;
          client_key?: string;
          is_production?: boolean;
          error?: string;
        };

        if (res.ok && data.snap_token && data.client_key) {
          try {
            await loadMidtransSnapScript(Boolean(data.is_production), data.client_key);
            queueSiteEvent("snap_opened", {});
          } catch {
            toast("Gagal memuat skrip pembayaran. Refresh halaman dan coba lagi.", "error");
            return;
          }
          setSubmitting(false);
          payWithSnap(data.snap_token, {
            onSuccess: () => {
              queueSiteEvent("payment_success", { channel: "midtrans_snap" });
              toast("Pembayaran berhasil. Cek email Anda untuk kunci lisensi.", "success");
              onClose();
            },
            onPending: () => {
              toast("Menunggu konfirmasi pembayaran dari bank / e-wallet.", "info");
              onClose();
            },
            onError: () => {
              toast("Pembayaran gagal atau dibatalkan.", "error");
            },
            onClose: () => {
              /* user closed Snap — no extra toast to avoid noise */
            },
          });
          return;
        }

        toast(
          data.error === "midtrans_rejected"
            ? "Gateway menolak transaksi. Coba lagi atau hubungi support."
            : "Snap tidak tersedia. Mencoba tautan cadangan…",
          "error"
        );
      }

      const outbound = buildCheckoutLink(settings.checkoutUrl, email, nameRes.value, phoneRes.digits);
      if (outbound) {
        window.open(outbound, "_blank", "noopener,noreferrer");
        toast("Halaman pembayaran dibuka di tab baru. Selesaikan di sana.", "success");
        onClose();
        return;
      }

      toast(
        "Data tersimpan. Hubungi admin: set VITE_SUPABASE_* + Midtrans di Supabase, atau isi Checkout URL di pengaturan.",
        "info"
      );
      onClose();
    } catch {
      toast("Terjadi kesalahan jaringan. Coba lagi.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const hasExternalCheckout = Boolean(settings.checkoutUrl?.trim() && /^https?:\/\//i.test(settings.checkoutUrl.trim()));
  const s = settings;
  const primaryCtaLabel = useMidtransSnap
    ? s.checkoutCtaMidtrans || "Bayar dengan Midtrans"
    : hasExternalCheckout
      ? s.checkoutCtaExternal || "Lanjut ke pembayaran"
      : s.checkoutCtaConfirm || "Konfirmasi pesanan";

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4" id="checkout-modal">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !submitting && onClose()}
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        aria-hidden
      />
      <motion.form
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0 }}
        onSubmit={submit}
        className="relative w-full max-w-lg bg-[#0B1220] border border-white/10 rounded-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
        aria-busy={submitting}
        noValidate
      >
        <button
          type="button"
          onClick={() => !submitting && onClose()}
          disabled={submitting}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-white/50 disabled:opacity-40"
          aria-label="Tutup"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg"
            style={{ backgroundColor: settings.primaryColor }}
          >
            M
          </div>
          <div>
            <h2 className="text-xl font-bold">{s.checkoutModalTitle || "Checkout"}</h2>
            <p className="text-white/45 text-sm">
              {s.checkoutProductSubtitle?.trim() ? s.checkoutProductSubtitle.trim() : productLabel}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-6">
          <div className="flex justify-between items-baseline gap-4">
            <span className="text-white/60 text-sm">{s.checkoutTotalLabel || "Total"}</span>
            <span className="text-2xl font-black" style={{ color: settings.primaryColor }}>
              {priceDisplay}
            </span>
          </div>
          <p className="text-white/35 text-xs mt-2">{s.checkoutLicenseNote || "Lisensi lifetime · 1 perangkat Mac"}</p>
        </div>

        <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2" htmlFor="co-name">
          {s.checkoutNameLabel || "Nama lengkap"}
        </label>
        <input
          id="co-name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(fieldErr.name)}
          aria-describedby={fieldErr.name ? "co-name-err" : undefined}
          className={`w-full bg-white/5 border rounded-xl px-4 py-3 mb-1 outline-none focus:border-red-500 ${
            fieldErr.name ? "border-red-500/60" : "border-white/10"
          }`}
          placeholder={s.checkoutNamePlaceholder || "Nama di bukti pembayaran"}
          disabled={submitting}
        />
        {fieldErr.name && (
          <p id="co-name-err" className="text-red-400 text-xs mb-3" role="alert">
            {fieldErr.name}
          </p>
        )}
        {!fieldErr.name && <div className="mb-3" />}

        <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2" htmlFor="co-email">
          {s.checkoutEmailLabel || "Email"}
        </label>
        <input
          id="co-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={(e) => setEmail(e.target.value.trim())}
          aria-invalid={Boolean(fieldErr.email)}
          aria-describedby={fieldErr.email ? "co-email-err" : undefined}
          className={`w-full bg-white/5 border rounded-xl px-4 py-3 mb-1 outline-none focus:border-red-500 ${
            fieldErr.email ? "border-red-500/60" : "border-white/10"
          }`}
          placeholder={s.checkoutEmailPlaceholder || "Untuk lisensi & aktivasi"}
          disabled={submitting}
        />
        {fieldErr.email && (
          <p id="co-email-err" className="text-red-400 text-xs mb-3" role="alert">
            {fieldErr.email}
          </p>
        )}
        {!fieldErr.email && <div className="mb-3" />}

        <label className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2" htmlFor="co-phone">
          {s.checkoutPhoneLabel || "No. HP / WhatsApp"}
        </label>
        <input
          id="co-phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-invalid={Boolean(fieldErr.phone)}
          aria-describedby={fieldErr.phone ? "co-phone-err" : undefined}
          className={`w-full bg-white/5 border rounded-xl px-4 py-3 mb-1 outline-none focus:border-red-500 ${
            fieldErr.phone ? "border-red-500/60" : "border-white/10"
          }`}
          placeholder={s.checkoutPhonePlaceholder || "08xxxxxxxxxx atau +62…"}
          disabled={submitting}
        />
        {fieldErr.phone && (
          <p id="co-phone-err" className="text-red-400 text-xs mb-3" role="alert">
            {fieldErr.phone}
          </p>
        )}
        {!fieldErr.phone && <div className="mb-3" />}

        <label className="flex items-start gap-3 cursor-pointer mb-6">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-1 rounded border-white/20"
            disabled={submitting}
          />
          <span className="text-sm text-white/60">
            {s.checkoutAgreePrefix || "Saya setuju dengan"}{" "}
            <a href={settings.termsUrl || "#"} className="text-red-400 hover:underline" target="_blank" rel="noreferrer">
              {s.checkoutTermsLinkLabel || "Syarat & Ketentuan"}
            </a>{" "}
            dan{" "}
            <a
              href={settings.privacyPolicyUrl || "#"}
              className="text-red-400 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {s.checkoutPrivacyLinkLabel || "Kebijakan Privasi"}
            </a>
            .
          </span>
        </label>

        <button
          type="submit"
          disabled={submitting}
          style={{ backgroundColor: settings.primaryColor }}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white hover:opacity-95 transition disabled:opacity-60 disabled:pointer-events-none"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
          {submitting ? s.checkoutSubmitLoading || "Memproses…" : primaryCtaLabel}
          {!submitting && hasExternalCheckout && !useMidtransSnap && <ExternalLink size={16} />}
        </button>

        {!useMidtransSnap && !hasExternalCheckout && (
          <p className="text-white/40 text-xs mt-4 text-center">{s.checkoutFooterNoGateway}</p>
        )}
        {useMidtransSnap && (
          <p className="text-white/35 text-xs mt-4 text-center">{s.checkoutFooterSnap}</p>
        )}

        <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap justify-center gap-4 text-sm">
          {settings.contactEmail && (
            <a href={`mailto:${settings.contactEmail}`} className="text-red-400 hover:underline">
              {settings.contactEmail}
            </a>
          )}
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">
              WhatsApp
            </a>
          )}
        </div>
      </motion.form>
    </div>
  );
}
