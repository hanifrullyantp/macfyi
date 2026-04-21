import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { CreditCard, ExternalLink, Loader2 } from "lucide-react";
import type { ContentData } from "../types/content";
import type { CheckoutGateway, MacfyiPublicCheckout } from "../lib/macfyiPublicConfig";
import { addLead } from "../lib/leads";
import {
  isValidEmail,
  normalizeEmail,
  validatePersonName,
  validatePhoneRequired,
} from "../lib/formValidation";
import { loadMidtransSnapScript, payWithSnap } from "../lib/midtransSnap";
import { getMacfyiVisitorId, getReferralSlugFromCookie, queueSiteEvent } from "../lib/siteAnalytics";
import { firePixelStep } from "../lib/conversionPixels";
import { getSupabaseBrowserClient } from "../lib/supabase";
import { formatIdr } from "../lib/formatIdr";
import { previewCheckoutPricing } from "../lib/macfyiPublicConfig";

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

function PolicyLink({ href, children }: { href: string; children: React.ReactNode }) {
  const t = href.trim();
  if (/^https?:\/\//i.test(t)) {
    return (
      <a href={t} className="text-red-400 hover:underline" target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  const path = t.startsWith("/") ? t : `/${t}`;
  return (
    <Link to={path} className="text-red-400 hover:underline">
      {children}
    </Link>
  );
}

export function CheckoutForm({
  settings,
  productLabel,
  toast,
  initialCheckout,
}: {
  settings: ContentData["settings"];
  productLabel: string;
  toast: (msg: string, type?: "info" | "success" | "error") => void;
  initialCheckout: MacfyiPublicCheckout | null;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErr, setFieldErr] = useState<Partial<Record<"name" | "email" | "phone", string>>>({});

  const [couponInput, setCouponInput] = useState("");
  const [skipAutoCoupon, setSkipAutoCoupon] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [compareAtIdr, setCompareAtIdr] = useState<number | null>(initialCheckout?.compare_at_idr ?? null);
  const [baseIdr, setBaseIdr] = useState(initialCheckout?.base_lifetime_idr ?? 0);
  const [finalIdr, setFinalIdr] = useState(
    initialCheckout?.final_with_auto_idr ?? initialCheckout?.base_lifetime_idr ?? 0
  );
  const [discountIdr, setDiscountIdr] = useState(0);

  useEffect(() => {
    queueSiteEvent("form_open", { form: "checkout" });
    firePixelStep(settings, "checkout_form_visible", { form: "checkout" });
  }, [settings]);

  useEffect(() => {
    if (!initialCheckout) return;
    setCompareAtIdr(initialCheckout.compare_at_idr ?? null);
    setBaseIdr(initialCheckout.base_lifetime_idr);
    if (initialCheckout.auto_coupon) {
      setCouponInput((prev) => (prev.trim() ? prev : initialCheckout.auto_coupon!.code));
      if (initialCheckout.final_with_auto_idr != null) {
        setFinalIdr(initialCheckout.final_with_auto_idr);
        setDiscountIdr(Math.max(0, initialCheckout.base_lifetime_idr - initialCheckout.final_with_auto_idr));
      } else {
        setFinalIdr(initialCheckout.base_lifetime_idr);
        setDiscountIdr(0);
      }
    } else {
      setFinalIdr(initialCheckout.base_lifetime_idr);
      setDiscountIdr(0);
    }
  }, [initialCheckout]);

  const runPreview = useCallback(async () => {
    const code = couponInput.trim();
    const body: { coupon_code?: string; skip_auto_coupon?: boolean } = {};
    if (code) body.coupon_code = code;
    else if (skipAutoCoupon) body.skip_auto_coupon = true;

    setPreviewLoading(true);
    try {
      const r = await previewCheckoutPricing(body);
      if (!r) return;
      if (r.error === "invalid_coupon") return;
      setCompareAtIdr(r.compare_at_idr ?? null);
      setBaseIdr(r.base_lifetime_idr);
      setFinalIdr(r.final_idr);
      setDiscountIdr(r.discount_idr);
    } finally {
      setPreviewLoading(false);
    }
  }, [couponInput, skipAutoCoupon]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void runPreview();
    }, 400);
    return () => window.clearTimeout(t);
  }, [couponInput, skipAutoCoupon, runPreview]);

  const gateway: CheckoutGateway = useMemo(() => {
    const g = initialCheckout?.gateway;
    if (g === "midtrans" || g === "lynk" || g === "external") return g;
    const u = import.meta.env.VITE_SUPABASE_URL?.trim();
    const k = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
    const off = import.meta.env.VITE_USE_MIDTRANS_SNAP === "false";
    return u && k && !off ? "midtrans" : "external";
  }, [initialCheckout?.gateway]);

  const canServerCheckout = useMemo(() => {
    const u = import.meta.env.VITE_SUPABASE_URL?.trim();
    const k = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
    return Boolean(u && k);
  }, []);

  const waDigits = settings.whatsapp?.replace(/\D/g, "") ?? "";
  const whatsappHref =
    settings.whatsapp?.trim() && settings.whatsapp.startsWith("http")
      ? settings.whatsapp.trim()
      : waDigits.length >= 8
        ? `https://wa.me/${waDigits}`
        : "";

  const s = settings;
  const hasExternalCheckout = Boolean(settings.checkoutUrl?.trim() && /^https?:\/\//i.test(settings.checkoutUrl.trim()));
  const primaryCtaLabel =
    gateway === "midtrans"
      ? s.checkoutCtaMidtrans || "Bayar dengan Midtrans"
      : gateway === "lynk"
        ? s.checkoutCtaLynk || "Bayar dengan Lynk.id"
        : hasExternalCheckout
          ? s.checkoutCtaExternal || "Lanjut ke pembayaran"
          : s.checkoutCtaConfirm || "Konfirmasi pesanan";

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
      queueSiteEvent("checkout_submit", { gateway });
      firePixelStep(settings, "checkout_form_submit", { gateway });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, "");
      const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

      /** Lynk hosted link: tidak butuh Supabase jika URL statis valid. */
      if (gateway === "lynk") {
        const lynkStatic = s.checkoutLynkStaticUrl?.trim() ?? "";
        if (lynkStatic && /^https?:\/\//i.test(lynkStatic)) {
          const staticOut = buildCheckoutLink(lynkStatic, normalizeEmail(email), nameRes.value, phoneRes.digits);
          if (staticOut) {
            queueSiteEvent("lynk_static_checkout_redirect", {});
            firePixelStep(settings, "lynk_redirect", { mode: "static" });
            window.location.href = staticOut;
            return;
          }
        }
      }

      if (gateway !== "external" && canServerCheckout && supabaseUrl && anon && gateway === "midtrans") {
        let authToken = anon;
        const sb = getSupabaseBrowserClient();
        if (sb) {
          const { data: sess } = await sb.auth.getSession();
          if (sess.session?.access_token) authToken = sess.session.access_token;
        }
        const referral_slug = getReferralSlugFromCookie() ?? undefined;
        const code = couponInput.trim();
        const snapBody: Record<string, unknown> = {
          email: normalizeEmail(email),
          name: nameRes.value,
          phone: phoneRes.digits,
          visitor_id: getMacfyiVisitorId(),
          ...(referral_slug ? { referral_slug } : {}),
        };
        if (code) snapBody.coupon_code = code;
        if (skipAutoCoupon && !code) snapBody.skip_auto_coupon = true;

        const res = await fetch(`${supabaseUrl}/functions/v1/create-midtrans-snap`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            apikey: anon,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(snapBody),
        });
        const data = (await res.json().catch(() => ({}))) as {
          snap_token?: string;
          client_key?: string;
          is_production?: boolean;
          order_id?: string;
          error?: string;
        };

        if (data.error === "invalid_coupon") {
          toast("Kode promo tidak berlaku.", "error");
          setSubmitting(false);
          return;
        }
        if (data.error === "promo_slots_exhausted") {
          toast("Kuota promo habis. Hubungi support.", "error");
          setSubmitting(false);
          return;
        }

        if (res.ok && data.snap_token && data.client_key) {
          try {
            await loadMidtransSnapScript(Boolean(data.is_production), data.client_key);
            queueSiteEvent("snap_opened", {});
            firePixelStep(settings, "snap_opened", { order_id: data.order_id });
          } catch {
            toast("Gagal memuat skrip pembayaran. Refresh halaman dan coba lagi.", "error");
            return;
          }
          setSubmitting(false);
          const orderIdSnap = data.order_id;
          payWithSnap(data.snap_token, {
            onSuccess: () => {
              queueSiteEvent("payment_success", { channel: "midtrans_snap" });
              queueSiteEvent("purchase_completed", { order_id: orderIdSnap });
              firePixelStep(settings, "purchase_completed", {
                channel: "midtrans_snap",
                order_id: orderIdSnap,
              });
              toast("Pembayaran berhasil.", "success");
              if (orderIdSnap) {
                window.location.href = `/checkout/success?order_id=${encodeURIComponent(orderIdSnap)}`;
              }
            },
            onPending: () => {
              toast("Menunggu konfirmasi pembayaran dari bank / e-wallet.", "info");
            },
            onError: () => {
              toast("Pembayaran gagal atau dibatalkan.", "error");
            },
            onClose: () => {},
          });
          return;
        }

        toast(
          data.error === "midtrans_rejected"
            ? "Gateway menolak transaksi. Coba lagi atau hubungi support."
            : "Snap tidak tersedia. Mencoba tautan cadangan…",
          "error"
        );
      } else if (canServerCheckout && supabaseUrl && anon && gateway === "lynk") {
        let authToken = anon;
        const sb = getSupabaseBrowserClient();
        if (sb) {
          const { data: sess } = await sb.auth.getSession();
          if (sess.session?.access_token) authToken = sess.session.access_token;
        }
        const referral_slug = getReferralSlugFromCookie() ?? undefined;
        const code = couponInput.trim();
        const lynkBody: Record<string, unknown> = {
          email: normalizeEmail(email),
          name: nameRes.value,
          phone: phoneRes.digits,
          visitor_id: getMacfyiVisitorId(),
          ...(referral_slug ? { referral_slug } : {}),
        };
        if (code) lynkBody.coupon_code = code;
        if (skipAutoCoupon && !code) lynkBody.skip_auto_coupon = true;

        const res = await fetch(`${supabaseUrl}/functions/v1/create-lynk-checkout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            apikey: anon,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(lynkBody),
        });
        const data = (await res.json().catch(() => ({}))) as {
          checkout_url?: string;
          order_id?: string;
          error?: string;
        };

        if (data.error === "invalid_coupon") {
          toast("Kode promo tidak berlaku.", "error");
          setSubmitting(false);
          return;
        }
        if (data.error === "promo_slots_exhausted") {
          toast("Kuota promo habis. Hubungi support.", "error");
          setSubmitting(false);
          return;
        }

        if (res.ok && data.checkout_url && /^https?:\/\//i.test(data.checkout_url)) {
          queueSiteEvent("lynk_checkout_redirect", { order_id: data.order_id });
          firePixelStep(settings, "lynk_redirect", { order_id: data.order_id });
          window.location.href = data.checkout_url;
          return;
        }

        toast(
          data.error === "lynk_rejected" || data.error === "lynk_misconfigured" || data.error === "lynk_no_checkout_url"
            ? "Lynk.id belum siap atau menolak transaksi. Periksa secret & URL di Supabase."
            : "Tautan Lynk tidak tersedia.",
          "error"
        );
      } else if (gateway === "midtrans" || gateway === "lynk") {
        toast("Supabase belum dikonfigurasi (VITE_SUPABASE_*).", "error");
      }

      const outbound = buildCheckoutLink(settings.checkoutUrl, email, nameRes.value, phoneRes.digits);
      if (outbound) {
        window.open(outbound, "_blank", "noopener,noreferrer");
        toast("Halaman pembayaran dibuka di tab baru. Selesaikan di sana.", "success");
        return;
      }

      toast(
        "Data tersimpan. Hubungi admin: set gateway di platform_settings / public-config, secret pembayaran di Supabase, atau isi Checkout URL.",
        "info"
      );
    } catch {
      toast("Terjadi kesalahan jaringan. Coba lagi.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const logoUrl = settings.brandLogoUrl?.trim();

  return (
    <form
      onSubmit={submit}
      className="relative w-full max-w-lg bg-[#0B1220] border border-white/10 rounded-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
      aria-busy={submitting}
      noValidate
    >
      <div className="flex items-center gap-3 mb-6">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            className="w-12 h-12 rounded-xl object-contain bg-white/5 border border-white/10 shrink-0"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0"
            style={{ backgroundColor: settings.primaryColor }}
          >
            {(settings.siteName || "M").slice(0, 1)}
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold">{s.checkoutModalTitle || "Checkout"}</h2>
          <p className="text-white/45 text-sm">
            {s.checkoutProductSubtitle?.trim() ? s.checkoutProductSubtitle.trim() : productLabel}
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-6 space-y-2">
        {compareAtIdr != null && compareAtIdr > 0 && (
          <div className="flex justify-between items-baseline gap-4 text-sm">
            <span className="text-white/50">Harga normal</span>
            <span className="text-red-400/90 line-through tabular-nums">{formatIdr(compareAtIdr)}</span>
          </div>
        )}
        {discountIdr > 0 && (
          <div className="flex justify-between items-baseline gap-4 text-sm">
            <span className="text-white/50">Setelah promo</span>
            <span className="text-white/70 tabular-nums">{formatIdr(baseIdr)}</span>
          </div>
        )}
        {discountIdr > 0 && (
          <div className="flex justify-between items-baseline gap-4 text-sm">
            <span className="text-emerald-400/90">Diskon kupon</span>
            <span className="text-emerald-300 tabular-nums">− {formatIdr(discountIdr)}</span>
          </div>
        )}
        <div className="flex justify-between items-baseline gap-4 pt-1 border-t border-white/10">
          <span className="text-white/60 text-sm">{s.checkoutTotalLabel || "Total"}</span>
          <span className="text-2xl font-black tabular-nums" style={{ color: settings.primaryColor }}>
            {formatIdr(finalIdr)}
          </span>
        </div>
        <p className="text-white/35 text-xs">{s.checkoutLicenseNote || "Lisensi lifetime · 1 perangkat Mac"}</p>

        <div className="pt-3 border-t border-white/10">
          <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1" htmlFor="co-coupon">
            Kode promo (opsional)
          </label>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              id="co-coupon"
              type="text"
              autoComplete="off"
              value={couponInput}
              onChange={(e) => {
                setSkipAutoCoupon(false);
                setCouponInput(e.target.value);
              }}
              placeholder="Masukkan kode"
              disabled={submitting}
              className="flex-1 min-w-[140px] bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-500"
            />
            {previewLoading ? <Loader2 size={18} className="animate-spin text-white/40 shrink-0" /> : null}
            {initialCheckout?.auto_coupon ? (
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setSkipAutoCoupon(true);
                  setCouponInput("");
                }}
                className="text-xs text-white/45 hover:text-white px-2 py-1 rounded-lg border border-white/15"
              >
                Tanpa kupon
              </button>
            ) : null}
          </div>
        </div>
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
        className={`w-full bg-white/5 border rounded-xl px-4 py-3 mb-1 outline-none focus:border-red-500 ${
          fieldErr.name ? "border-red-500/60" : "border-white/10"
        }`}
        placeholder={s.checkoutNamePlaceholder || "Nama di bukti pembayaran"}
        disabled={submitting}
      />
      {fieldErr.name && (
        <p className="text-red-400 text-xs mb-3" role="alert">
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
        className={`w-full bg-white/5 border rounded-xl px-4 py-3 mb-1 outline-none focus:border-red-500 ${
          fieldErr.email ? "border-red-500/60" : "border-white/10"
        }`}
        placeholder={s.checkoutEmailPlaceholder || "Untuk lisensi & aktivasi"}
        disabled={submitting}
      />
      {fieldErr.email && (
        <p className="text-red-400 text-xs mb-3" role="alert">
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
        className={`w-full bg-white/5 border rounded-xl px-4 py-3 mb-1 outline-none focus:border-red-500 ${
          fieldErr.phone ? "border-red-500/60" : "border-white/10"
        }`}
        placeholder={s.checkoutPhonePlaceholder || "08xxxxxxxxxx atau +62…"}
        disabled={submitting}
      />
      {fieldErr.phone && (
        <p className="text-red-400 text-xs mb-3" role="alert">
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
          <PolicyLink href={settings.termsUrl || "/terms"}>{s.checkoutTermsLinkLabel || "Syarat & Ketentuan"}</PolicyLink>{" "}
          dan{" "}
          <PolicyLink href={settings.privacyPolicyUrl || "/privacy"}>
            {s.checkoutPrivacyLinkLabel || "Kebijakan Privasi"}
          </PolicyLink>
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
        {!submitting && hasExternalCheckout && gateway === "external" && <ExternalLink size={16} />}
      </button>

      {gateway === "external" && !hasExternalCheckout && (
        <p className="text-white/40 text-xs mt-4 text-center">{s.checkoutFooterNoGateway}</p>
      )}
      {gateway === "midtrans" && <p className="text-white/35 text-xs mt-4 text-center">{s.checkoutFooterSnap}</p>}
      {gateway === "lynk" && <p className="text-white/35 text-xs mt-4 text-center">{s.checkoutFooterLynk}</p>}

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
    </form>
  );
}
