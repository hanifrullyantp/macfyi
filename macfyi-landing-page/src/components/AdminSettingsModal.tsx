import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Download, Upload, Trash2, Plus } from "lucide-react";
import type { ContentData, SiteSettings } from "../types/content";
import { DEFAULT_SITE_SETTINGS } from "../types/content";
import { deepMerge } from "../lib/mergeData";
import { loadLeads, saveLeads, updateLeadStage, type CrmLead, type LeadStage } from "../lib/leads";

const TABS = [
  { id: "brand", label: "Global & merek" },
  { id: "contact", label: "Kontak & sosial" },
  { id: "seo", label: "SEO" },
  { id: "track", label: "Pixel & Analytics" },
  { id: "ui", label: "Banner & FAQ" },
  { id: "checkout", label: "Checkout" },
  { id: "legal", label: "Footer & privasi" },
  { id: "content", label: "Konten JSON" },
  { id: "crm", label: "CRM & WA" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminSettingsModal({
  open,
  onClose,
  data,
  baselineData,
  patchSettings,
  replaceData,
  toast,
  onTestToast,
}: {
  open: boolean;
  onClose: () => void;
  data: ContentData;
  baselineData: ContentData;
  patchSettings: (p: Partial<SiteSettings>) => void;
  replaceData: (d: ContentData) => void;
  toast: (msg: string, type?: "info" | "success" | "error") => void;
  onTestToast: () => void;
}) {
  const [tab, setTab] = useState<TabId>("brand");
  const [jsonText, setJsonText] = useState("");
  const [leads, setLeads] = useState<CrmLead[]>(() => loadLeads());
  const fileRef = useRef<HTMLInputElement>(null);
  const wpRef = useRef<HTMLInputElement>(null);

  const s = data.settings;

  const waByCat = useMemo(() => {
    const m = new Map<string, typeof s.waTemplates>();
    for (const t of s.waTemplates) {
      const k = t.category || "Lainnya";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    }
    return m;
  }, [s.waTemplates]);

  // Isi textarea saat tab Konten JSON dibuka; setelah itu pakai "Muat ulang dari halaman" agar selaras dengan suntingan terbaru.
  useEffect(() => {
    if (open && tab === "content") {
      setJsonText(JSON.stringify(data, null, 2));
    }
  }, [open, tab]);

  if (!open) return null;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "macfyi-landing.json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("JSON diekspor.", "success");
  };

  const importJsonText = () => {
    try {
      const parsed = JSON.parse(jsonText || "{}") as Partial<ContentData>;
      const merged = deepMerge(JSON.parse(JSON.stringify(baselineData)) as ContentData, parsed);
      replaceData(merged);
      toast("Konten diimpor dari JSON.", "success");
    } catch {
      toast("JSON tidak valid.", "error");
    }
  };

  const onJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const parsed = JSON.parse(text) as Partial<ContentData>;
      const merged = deepMerge(JSON.parse(JSON.stringify(baselineData)) as ContentData, parsed);
      replaceData(merged);
      setJsonText(text);
      toast("File JSON diimpor.", "success");
    } catch {
      toast("Gagal membaca JSON.", "error");
    }
    e.target.value = "";
  };

  const addWaTemplate = () => {
    const id = `w-${Date.now()}`;
    const cat = s.waCategories[0] || "Sales";
    patchSettings({
      waTemplates: [...s.waTemplates, { id, category: cat, body: "Halo {nama}, ..." }],
    });
  };

  const removeWa = (id: string) => {
    patchSettings({ waTemplates: s.waTemplates.filter((t) => t.id !== id) });
  };

  const updateWa = (id: string, field: "category" | "body", val: string) => {
    patchSettings({
      waTemplates: s.waTemplates.map((t) => (t.id === id ? { ...t, [field]: val } : t)),
    });
  };

  const categoriesStr = s.waCategories.join(", ");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#0B1220] border border-white/10 rounded-[1.5rem] shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="p-6 border-b border-white/10 flex items-start justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-xl font-bold">Pengaturan</h2>
            <p className="text-white/45 text-sm">Global, SEO, tracking, CRM, dan ekspor konten.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-white/60" aria-label="Tutup">
            <X size={22} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1 px-4 pt-3 border-b border-white/5 bg-black/20">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 rounded-t-lg text-xs font-medium transition ${
                tab === t.id ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm">
          {tab === "brand" && (
            <>
              <Field label="Nama situs">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  value={s.siteName}
                  onChange={(e) => patchSettings({ siteName: e.target.value })}
                />
              </Field>
              <Field label="Logo URL">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  placeholder="https://..."
                  value={s.brandLogoUrl}
                  onChange={(e) => patchSettings({ brandLogoUrl: e.target.value })}
                />
              </Field>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Warna primer">
                  <div className="flex gap-2">
                    <div className="w-10 h-10 rounded-lg border border-white/10" style={{ backgroundColor: s.primaryColor }} />
                    <input
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                      value={s.primaryColor}
                      onChange={(e) => patchSettings({ primaryColor: e.target.value })}
                    />
                  </div>
                </Field>
                <Field label="Warna sekunder">
                  <div className="flex gap-2">
                    <div className="w-10 h-10 rounded-lg border border-white/10" style={{ backgroundColor: s.secondaryColor }} />
                    <input
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                      value={s.secondaryColor}
                      onChange={(e) => patchSettings({ secondaryColor: e.target.value })}
                    />
                  </div>
                </Field>
              </div>
              <Field label="Harga (tampilan)">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  value={s.price}
                  onChange={(e) => patchSettings({ price: e.target.value })}
                />
              </Field>
            </>
          )}

          {tab === "contact" && (
            <>
              <Field label="Email kontak">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  value={s.contactEmail}
                  onChange={(e) => patchSettings({ contactEmail: e.target.value })}
                />
              </Field>
              <Field label="WhatsApp (nomor / link)">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  placeholder="+62..."
                  value={s.whatsapp}
                  onChange={(e) => patchSettings({ whatsapp: e.target.value })}
                />
              </Field>
              <Field label="Instagram URL">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  value={s.instagramUrl}
                  onChange={(e) => patchSettings({ instagramUrl: e.target.value })}
                />
              </Field>
              <Field label="X / Twitter URL">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  value={s.twitterUrl}
                  onChange={(e) => patchSettings({ twitterUrl: e.target.value })}
                />
              </Field>
              <Field label="LinkedIn URL">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  value={s.linkedinUrl}
                  onChange={(e) => patchSettings({ linkedinUrl: e.target.value })}
                />
              </Field>
              <Field label="Checkout URL">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  value={s.checkoutUrl}
                  onChange={(e) => patchSettings({ checkoutUrl: e.target.value })}
                />
              </Field>
              <Field label="Login URL">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  value={s.loginUrl}
                  onChange={(e) => patchSettings({ loginUrl: e.target.value })}
                />
              </Field>
            </>
          )}

          {tab === "seo" && (
            <>
              <Field label="Judul halaman (title)">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  value={s.seoTitle}
                  onChange={(e) => patchSettings({ seoTitle: e.target.value })}
                />
              </Field>
              <Field label="Meta description">
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500 min-h-[88px]"
                  value={s.seoDescription}
                  onChange={(e) => patchSettings({ seoDescription: e.target.value })}
                />
              </Field>
              <Field label="OG image URL">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  placeholder="https://..."
                  value={s.ogImageUrl}
                  onChange={(e) => patchSettings({ ogImageUrl: e.target.value })}
                />
              </Field>
            </>
          )}

          {tab === "track" && (
            <>
              <Field label="Facebook Pixel ID">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  placeholder="Numerik"
                  value={s.facebookPixelId}
                  onChange={(e) => patchSettings({ facebookPixelId: e.target.value })}
                />
              </Field>
              <Field label="Google Analytics (Measurement ID)">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  placeholder="G-XXXX"
                  value={s.googleAnalyticsId}
                  onChange={(e) => patchSettings({ googleAnalyticsId: e.target.value })}
                />
              </Field>
              <p className="text-white/35 text-xs">
                Script dimuat sekali saat ID diisi. Sesuaikan kebijakan cookie / consent di produksi.
              </p>
            </>
          )}

          {tab === "ui" && (
            <>
              <Field label="Banner notifikasi — teks">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  value={s.notificationBannerText}
                  onChange={(e) => patchSettings({ notificationBannerText: e.target.value })}
                />
              </Field>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={s.notificationBannerEnabled}
                  onChange={(e) => patchSettings({ notificationBannerEnabled: e.target.checked })}
                />
                <span>Aktifkan banner atas</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={s.notificationSoundEnabled}
                  onChange={(e) => patchSettings({ notificationSoundEnabled: e.target.checked })}
                />
                <span>Suara saat banner tampil / ditutup</span>
              </label>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onTestToast}
                  className="bg-white/10 hover:bg-white/15 px-4 py-2 rounded-xl text-xs"
                >
                  Tes toast (kanan bawah)
                </button>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-4 border-t border-white/10">
                <input
                  type="checkbox"
                  checked={s.faqSingleOpen}
                  onChange={(e) => patchSettings({ faqSingleOpen: e.target.checked })}
                />
                <span>FAQ: hanya satu panel terbuka (accordion tunggal)</span>
              </label>
            </>
          )}

          {tab === "checkout" && (
            <>
              <p className="text-white/45 text-xs">
                Teks modal checkout (label, placeholder, tombol). Subjudul produk kosongkan untuk memakai nama produk dari halaman.
              </p>
              <Field label="Judul modal">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  value={s.checkoutModalTitle}
                  onChange={(e) => patchSettings({ checkoutModalTitle: e.target.value })}
                />
              </Field>
              <Field label="Subjudul produk (opsional)">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  placeholder="Kosong = otomatis dari halaman"
                  value={s.checkoutProductSubtitle}
                  onChange={(e) => patchSettings({ checkoutProductSubtitle: e.target.value })}
                />
              </Field>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Label total">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                    value={s.checkoutTotalLabel}
                    onChange={(e) => patchSettings({ checkoutTotalLabel: e.target.value })}
                  />
                </Field>
                <Field label="Catatan lisensi (bawah total)">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                    value={s.checkoutLicenseNote}
                    onChange={(e) => patchSettings({ checkoutLicenseNote: e.target.value })}
                  />
                </Field>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Label nama">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                    value={s.checkoutNameLabel}
                    onChange={(e) => patchSettings({ checkoutNameLabel: e.target.value })}
                  />
                </Field>
                <Field label="Placeholder nama">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                    value={s.checkoutNamePlaceholder}
                    onChange={(e) => patchSettings({ checkoutNamePlaceholder: e.target.value })}
                  />
                </Field>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Label email">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                    value={s.checkoutEmailLabel}
                    onChange={(e) => patchSettings({ checkoutEmailLabel: e.target.value })}
                  />
                </Field>
                <Field label="Placeholder email">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                    value={s.checkoutEmailPlaceholder}
                    onChange={(e) => patchSettings({ checkoutEmailPlaceholder: e.target.value })}
                  />
                </Field>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Label telepon">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                    value={s.checkoutPhoneLabel}
                    onChange={(e) => patchSettings({ checkoutPhoneLabel: e.target.value })}
                  />
                </Field>
                <Field label="Placeholder telepon">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                    value={s.checkoutPhonePlaceholder}
                    onChange={(e) => patchSettings({ checkoutPhonePlaceholder: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Teks sebelum tautan syarat (mis. Saya setuju dengan)">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  value={s.checkoutAgreePrefix}
                  onChange={(e) => patchSettings({ checkoutAgreePrefix: e.target.value })}
                />
              </Field>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Label tautan syarat">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                    value={s.checkoutTermsLinkLabel}
                    onChange={(e) => patchSettings({ checkoutTermsLinkLabel: e.target.value })}
                  />
                </Field>
                <Field label="Label tautan privasi">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                    value={s.checkoutPrivacyLinkLabel}
                    onChange={(e) => patchSettings({ checkoutPrivacyLinkLabel: e.target.value })}
                  />
                </Field>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <Field label="Tombol (Midtrans)">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                    value={s.checkoutCtaMidtrans}
                    onChange={(e) => patchSettings({ checkoutCtaMidtrans: e.target.value })}
                  />
                </Field>
                <Field label="Tombol (URL eksternal)">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                    value={s.checkoutCtaExternal}
                    onChange={(e) => patchSettings({ checkoutCtaExternal: e.target.value })}
                  />
                </Field>
                <Field label="Tombol (konfirmasi)">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                    value={s.checkoutCtaConfirm}
                    onChange={(e) => patchSettings({ checkoutCtaConfirm: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Teks saat memproses">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  value={s.checkoutSubmitLoading}
                  onChange={(e) => patchSettings({ checkoutSubmitLoading: e.target.value })}
                />
              </Field>
              <Field label="Catatan kaki (Midtrans aktif)">
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500 min-h-[56px] text-xs"
                  value={s.checkoutFooterSnap}
                  onChange={(e) => patchSettings({ checkoutFooterSnap: e.target.value })}
                />
              </Field>
              <Field label="Catatan kaki (tanpa gateway)">
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500 min-h-[56px] text-xs"
                  value={s.checkoutFooterNoGateway}
                  onChange={(e) => patchSettings({ checkoutFooterNoGateway: e.target.value })}
                />
              </Field>
            </>
          )}

          {tab === "legal" && (
            <>
              <Field label="URL Syarat & Ketentuan">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  value={s.termsUrl}
                  onChange={(e) => patchSettings({ termsUrl: e.target.value })}
                />
              </Field>
              <Field label="URL Kebijakan Privasi">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  value={s.privacyPolicyUrl}
                  onChange={(e) => patchSettings({ privacyPolicyUrl: e.target.value })}
                />
              </Field>
            </>
          )}

          {tab === "content" && (
            <>
              <p className="text-white/45 text-xs">
                JSON mencerminkan konten saat ini (termasuk perubahan di halaman). Gunakan ekspor/impor untuk cadangan atau migrasi.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={exportJson} className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl text-xs font-bold">
                  <Download size={14} /> Ekspor JSON
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 px-4 py-2 rounded-xl text-xs"
                >
                  <Upload size={14} /> Unggah JSON
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setJsonText(JSON.stringify(data, null, 2));
                    toast("JSON diselaraskan dengan tampilan saat ini.", "success");
                  }}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 px-4 py-2 rounded-xl text-xs"
                >
                  Muat ulang dari halaman
                </button>
                <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onJsonFile} />
              </div>
              <Field label="Tempel JSON (lanjutan / merge)">
                <textarea
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 font-mono text-xs min-h-[160px] outline-none focus:border-red-500"
                  placeholder='{"hero":{...}}'
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                />
              </Field>
              <button type="button" onClick={importJsonText} className="bg-white/10 hover:bg-white/15 px-4 py-2 rounded-xl text-xs">
                Terapkan JSON dari kolom
              </button>
              <Field label="Catatan migrasi / HTML (referensi)">
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs min-h-[100px] outline-none focus:border-red-500"
                  placeholder="Potongan dari WordPress / dokumentasi internal..."
                  value={s.landingNotesHtml}
                  onChange={(e) => patchSettings({ landingNotesHtml: e.target.value })}
                />
              </Field>
              <div>
                <span className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Unggah HTML / teks (opsional)</span>
                <input
                  ref={wpRef}
                  type="file"
                  accept=".html,.htm,.txt,text/plain"
                  className="text-xs text-white/60"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const t = await f.text();
                    patchSettings({ landingNotesHtml: t.slice(0, 50000) });
                    toast("Konten file disalin ke catatan migrasi.", "success");
                    e.target.value = "";
                  }}
                />
              </div>
            </>
          )}

          {tab === "crm" && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white/80">Pipeline leads</h3>
                <button
                  type="button"
                  onClick={() => {
                    setLeads(loadLeads());
                    toast("Data dimuat ulang.", "info");
                  }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Refresh
                </button>
              </div>
              <div className="overflow-x-auto border border-white/10 rounded-xl">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-white/45">
                      <th className="p-2">Nama</th>
                      <th className="p-2">Email</th>
                      <th className="p-2">Tahap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-4 text-white/35">
                          Belum ada lead. Kirim formulir di halaman.
                        </td>
                      </tr>
                    )}
                    {leads.map((l) => (
                      <tr key={l.id} className="border-b border-white/5">
                        <td className="p-2">{l.name}</td>
                        <td className="p-2 break-all">{l.email}</td>
                        <td className="p-2">
                          <select
                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1"
                            value={l.stage}
                            onChange={(e) => {
                              updateLeadStage(l.id, e.target.value as LeadStage);
                              setLeads(loadLeads());
                            }}
                          >
                            {(["new", "contacted", "qualified", "lost"] as LeadStage[]).map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={() => {
                  saveLeads([]);
                  setLeads([]);
                  toast("Semua lead dihapus (lokal).", "info");
                }}
                className="text-xs text-red-400/80 hover:text-red-400"
              >
                Kosongkan pipeline (lokal)
              </button>

              <h3 className="font-bold text-white/80 pt-6 border-t border-white/10">Kategori WA</h3>
              <Field label="Daftar kategori (pisahkan koma)">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  value={categoriesStr}
                  onChange={(e) =>
                    patchSettings({
                      waCategories: e.target.value
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>

              <div className="flex items-center justify-between pt-2">
                <h3 className="font-bold text-white/80">Template WhatsApp</h3>
                <button type="button" onClick={addWaTemplate} className="inline-flex items-center gap-1 text-xs bg-white/10 px-3 py-1.5 rounded-lg">
                  <Plus size={14} /> Tambah
                </button>
              </div>
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {s.waTemplates.map((t) => (
                  <div key={t.id} className="bg-black/30 border border-white/10 rounded-xl p-3 space-y-2">
                    <div className="flex justify-between gap-2">
                      <select
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs"
                        value={t.category}
                        onChange={(e) => updateWa(t.id, "category", e.target.value)}
                      >
                        {(s.waCategories.length ? s.waCategories : DEFAULT_SITE_SETTINGS.waCategories).map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => removeWa(t.id)} className="p-1.5 text-red-400 hover:bg-white/5 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <textarea
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs min-h-[72px]"
                      value={t.body}
                      onChange={(e) => updateWa(t.id, "body", e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <p className="text-white/35 text-xs pt-2">
                Ringkasan per kategori:{" "}
                {[...waByCat.entries()]
                  .map(([k, v]) => `${k} (${v.length})`)
                  .join(" · ") || "—"}
              </p>
            </>
          )}
        </div>

        <div className="p-4 border-t border-white/10 flex justify-end gap-2 bg-black/30 shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-xl text-sm text-white/60 hover:text-white">
            Tutup
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="block text-xs font-bold text-white/40 uppercase tracking-wider mb-1.5">{label}</span>
      {children}
    </div>
  );
}
