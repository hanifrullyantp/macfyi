import React, { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { addLead } from "../lib/leads";
import type { ContentData } from "../types/content";
import {
  isValidEmail,
  normalizeEmail,
  validatePersonName,
  validatePhoneOptional,
} from "../lib/formValidation";
import { queueSiteEvent } from "../lib/siteAnalytics";
import { fireConversionPixels } from "../lib/conversionPixels";

export function LeadCaptureForm({
  settings,
  toast,
}: {
  settings: ContentData["settings"];
  toast: (msg: string, type?: "info" | "success" | "error") => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const leadVisibleFired = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || leadVisibleFired.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting && en.intersectionRatio >= 0.15) {
            leadVisibleFired.current = true;
            fireConversionPixels(settings, "lead_form_visible", { form: "lead_capture" });
            queueSiteEvent("lead_form_visible", { form: "lead_capture" });
            io.disconnect();
            return;
          }
        }
      },
      { threshold: [0.15, 0.3] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [settings]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const nameRes = validatePersonName(name);
    if (!nameRes.ok) {
      toast(nameRes.message, "error");
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

    setSubmitting(true);
    const payload = {
      name: nameRes.value,
      email: normalizeEmail(email),
      phone: ph.digits,
      message: message.trim() || undefined,
      createdAt: Date.now(),
      source: "macfyi-landing",
    };
    try {
      addLead({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        message: payload.message,
      });
      queueSiteEvent("form_submitted", { form: "lead_capture" });
      fireConversionPixels(settings, "lead_form_submit", { form: "lead_capture" });

      const webhookUrl = import.meta.env.VITE_LEAD_WEBHOOK_URL?.trim();
      if (webhookUrl) {
        try {
          const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true,
          });
          if (res.ok) {
            toast("Lead tersimpan lokal dan dikirim ke webhook.", "success");
          } else {
            toast(`Tersimpan lokal; webhook mengembalikan ${res.status}.`, "error");
          }
        } catch {
          toast("Tersimpan lokal; webhook gagal (jaringan atau CORS).", "error");
        }
      } else {
        toast(
          "Lead tersimpan di CRM (browser). Set VITE_LEAD_WEBHOOK_URL untuk kirim ke server.",
          "success"
        );
      }
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section ref={sectionRef} id="lead" className="py-20 border-t border-white/5 bg-white/[0.02]">
      <div className="container mx-auto px-4 max-w-xl">
        <h2 className="text-2xl font-bold mb-2 text-center">Tanya atau minta demo</h2>
        <p className="text-white/45 text-sm text-center mb-8">
          Data masuk ke pipeline CRM lokal (localStorage). Untuk produksi, arahkan ke Supabase / webhook seperti di{" "}
          <code className="text-white/60">MARKETING_ECOSYSTEM.md</code>.
        </p>
        <form
          onSubmit={(e) => void submit(e)}
          className="space-y-4 bg-[#0B1220] border border-white/10 rounded-2xl p-6"
          aria-busy={submitting}
          noValidate
        >
          <div>
            <label htmlFor="lead-name" className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">
              Nama
            </label>
            <input
              id="lead-name"
              type="text"
              autoComplete="name"
              placeholder="Nama"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label htmlFor="lead-email" className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">
              Email
            </label>
            <input
              id="lead-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={(e) => setEmail(e.target.value.trim())}
              disabled={submitting}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label htmlFor="lead-phone" className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">
              WhatsApp (opsional)
            </label>
            <input
              id="lead-phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="WhatsApp (opsional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={submitting}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label htmlFor="lead-msg" className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">
              Pesan (opsional)
            </label>
            <textarea
              id="lead-msg"
              placeholder="Pesan (opsional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              disabled={submitting}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-red-500 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            style={{ backgroundColor: settings.primaryColor }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white hover:opacity-95 transition disabled:opacity-60 disabled:pointer-events-none"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {submitting ? "Mengirim…" : "Kirim"}
          </button>
        </form>
      </div>
    </section>
  );
}
