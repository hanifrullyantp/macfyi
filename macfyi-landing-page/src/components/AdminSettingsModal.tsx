import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Download, Upload, Trash2, Plus } from "lucide-react";
import type { ContentData, SiteSettings } from "../types/content";
import { DEFAULT_SITE_SETTINGS } from "../types/content";
import { deepMerge } from "../lib/mergeData";
import { loadLeads, saveLeads, updateLeadStage, type CrmLead, type LeadStage } from "../lib/leads";
import { getSupabaseBrowserClient, isSupabaseUserAdmin } from "../lib/supabase";
import { formatIdr } from "../lib/formatIdr";

const TABS = [
  { id: "brand", label: "Global & merek" },
  { id: "contact", label: "Kontak & sosial" },
  { id: "seo", label: "SEO" },
  { id: "track", label: "Pixel & Analytics" },
  { id: "ui", label: "Banner & FAQ" },
  { id: "checkout", label: "Checkout" },
  { id: "promo", label: "Promo & scarcity" },
  { id: "legal", label: "Footer & privasi" },
  { id: "content", label: "Konten JSON" },
  { id: "crm", label: "CRM & WA" },
] as const;

type PromoPhaseRow = {
  starts_at: string;
  ends_at: string;
  lifetime_price_idr: string;
  compare_at_idr: string;
  slots_initial: string;
};

function emptyPromoPhaseRow(): PromoPhaseRow {
  return { starts_at: "", ends_at: "", lifetime_price_idr: "173000", compare_at_idr: "", slots_initial: "" };
}

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
  onApplyServerLifetimePrice,
  onAfterPromoSave,
}: {
  open: boolean;
  onClose: () => void;
  data: ContentData;
  baselineData: ContentData;
  patchSettings: (p: Partial<SiteSettings>) => void;
  replaceData: (d: ContentData) => void;
  toast: (msg: string, type?: "info" | "success" | "error") => void;
  onTestToast: () => void;
  /** Setelah upsert `app_settings.lifetime_price_idr` berhasil */
  onApplyServerLifetimePrice?: (idr: number) => void;
  /** Setelah simpan jadwal promo + fetch public-config */
  onAfterPromoSave?: (p: { lifetime_price_idr: number; compare_at_idr: number | null }) => void;
}) {
  const [tab, setTab] = useState<TabId>("brand");
  const [jsonText, setJsonText] = useState("");
  const [leads, setLeads] = useState<CrmLead[]>(() => loadLeads());
  const [priceSaveBusy, setPriceSaveBusy] = useState(false);
  const [promoPhases, setPromoPhases] = useState<PromoPhaseRow[]>([emptyPromoPhaseRow()]);
  const [promoSlotsRemaining, setPromoSlotsRemaining] = useState("");
  const [promoBlockZero, setPromoBlockZero] = useState(false);
  const [promoLoadBusy, setPromoLoadBusy] = useState(false);
  const [promoSaveBusy, setPromoSaveBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const wpRef = useRef<HTMLInputElement>(null);

  const s = data.settings;
  const lifetimeIdr = typeof s.lifetime_price_idr === "number" && Number.isFinite(s.lifetime_price_idr) ? s.lifetime_price_idr : 173000;

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

  useEffect(() => {
    if (!open || tab !== "promo") return;
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast("Supabase belum dikonfigurasi (VITE_SUPABASE_*).", "info");
      return;
    }
    let cancelled = false;
    (async () => {
      setPromoLoadBusy(true);
      try {
        const { data: row, error } = await client
          .from("app_settings")
          .select("promo_plan, promo_slots_remaining")
          .eq("id", "default")
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        const plan = row?.promo_plan as { phases?: unknown[]; block_checkout_when_slots_zero?: boolean } | null;
        if (plan && Array.isArray(plan.phases) && plan.phases.length > 0) {
          setPromoPhases(
            plan.phases.map((p: unknown) => {
              const o = (p ?? {}) as Record<string, unknown>;
              return {
                starts_at: String(o.starts_at ?? ""),
                ends_at: String(o.ends_at ?? ""),
                lifetime_price_idr: String(o.lifetime_price_idr ?? ""),
                compare_at_idr:
                  o.compare_at_idr != null && o.compare_at_idr !== "" ? String(o.compare_at_idr) : "",
                slots_initial: o.slots_initial != null && o.slots_initial !== "" ? String(o.slots_initial) : "",
              };
            })
          );
          setPromoBlockZero(Boolean(plan.block_checkout_when_slots_zero));
        } else {
          setPromoPhases([emptyPromoPhaseRow()]);
          setPromoBlockZero(false);
        }
        const rem = row?.promo_slots_remaining;
        setPromoSlotsRemaining(
          rem != null && rem !== undefined && Number.isFinite(Number(rem)) ? String(Math.max(0, Math.round(Number(rem)))) : ""
        );
      } catch (e) {
        if (!cancelled) toast(e instanceof Error ? e.message : String(e), "error");
      } finally {
        if (!cancelled) setPromoLoadBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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

  const savePromoPlanToServer = async () => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast("Supabase belum dikonfigurasi.", "error");
      return;
    }
    const { data: sess } = await client.auth.getSession();
    if (!sess.session?.user || !isSupabaseUserAdmin(sess.session.user)) {
      toast("Masuk sebagai admin Supabase untuk menyimpan jadwal promo.", "error");
      return;
    }
    const phases = promoPhases
      .map((row) => {
        const idr = Math.round(Number(row.lifetime_price_idr));
        const st = row.starts_at.trim();
        const en = row.ends_at.trim();
        if (!st || !en || !Number.isFinite(idr) || idr <= 0) return null;
        const phase: Record<string, unknown> = {
          starts_at: st,
          ends_at: en,
          lifetime_price_idr: idr,
        };
        if (row.compare_at_idr.trim()) {
          const c = Math.round(Number(row.compare_at_idr));
          if (Number.isFinite(c) && c > 0) phase.compare_at_idr = c;
        }
        if (row.slots_initial.trim()) {
          const si = Math.round(Number(row.slots_initial));
          if (Number.isFinite(si) && si >= 0) phase.slots_initial = si;
        }
        return phase;
      })
      .filter(Boolean) as Record<string, unknown>[];

    const planObj =
      phases.length === 0
        ? null
        : { phases, block_checkout_when_slots_zero: promoBlockZero };

    const slotsParsed =
      promoSlotsRemaining.trim() === "" ? null : Math.max(0, Math.round(Number(promoSlotsRemaining)));

    if (promoSlotsRemaining.trim() !== "" && !Number.isFinite(Number(promoSlotsRemaining))) {
      toast("Sisa slot harus angka atau kosong.", "error");
      return;
    }

    setPromoSaveBusy(true);
    try {
      const { data: cur, error: readErr } = await client
        .from("app_settings")
        .select("config_version")
        .eq("id", "default")
        .maybeSingle();
      if (readErr) throw readErr;
      const nextVer = (Number(cur?.config_version) || 1) + 1;
      const { error } = await client
        .from("app_settings")
        .update({
          promo_plan: planObj,
          promo_slots_remaining: slotsParsed,
          promo_updated_at: new Date().toISOString(),
          config_version: nextVer,
        })
        .eq("id", "default");
      if (error) throw error;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, "");
      const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
      if (supabaseUrl && anon) {
        const res = await fetch(`${supabaseUrl}/functions/v1/public-config`, {
          headers: { apikey: anon, Authorization: `Bearer ${anon}` },
        });
        if (res.ok) {
          const j = (await res.json()) as {
            pricing?: { lifetime_price_idr?: number };
            promo?: { compare_at_idr?: number | null };
          };
          const idr = j.pricing?.lifetime_price_idr;
          const cmp = j.promo?.compare_at_idr ?? null;
          if (typeof idr === "number" && idr > 0) {
            onAfterPromoSave?.({ lifetime_price_idr: idr, compare_at_idr: cmp ?? null });
          }
        }
      }
      toast("Jadwal promo disimpan. public-config & checkout memakai harga fase aktif.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setPromoSaveBusy(false);
    }
  };

  const resetPromoSlotsFromActivePhase = async () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/$/, "");
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
    if (!supabaseUrl || !anon) {
      toast("Variabel VITE_SUPABASE_* kurang.", "error");
      return;
    }
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/public-config`, {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      });
      if (!res.ok) throw new Error("Gagal memuat public-config");
      const j = (await res.json()) as { promo?: { slots_initial_active?: number | null } };
      const n = j.promo?.slots_initial_active;
      if (n != null && Number.isFinite(Number(n))) {
        setPromoSlotsRemaining(String(Math.max(0, Math.round(Number(n)))));
        toast("Sisa slot diisi dari slots_initial fase aktif.", "success");
      } else {
        toast("Tidak ada fase aktif dengan slots_initial.", "info");
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
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
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                <p className="text-white/50 text-xs leading-relaxed">
                  <strong className="text-white/80">Harga lifetime (IDR)</strong> disimpan di tabel{" "}
                  <code className="text-white/70">app_settings</code> — sama dengan nominal Midtrans, nilai di app (public-config),
                  dan teks harga di halaman ini setelah disimpan.
                </p>
                <Field label="Nominal lifetime (IDR, angka bulat)">
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500 tabular-nums"
                    value={lifetimeIdr}
                    onChange={(e) => {
                      const n = Math.round(Number(e.target.value));
                      if (!Number.isFinite(n)) return;
                      patchSettings({ lifetime_price_idr: n, price: formatIdr(n) });
                    }}
                  />
                </Field>
                <p className="text-xs text-white/40">Pratinjau tampilan: {formatIdr(lifetimeIdr)}</p>
                <button
                  type="button"
                  disabled={priceSaveBusy}
                  onClick={async () => {
                    const client = getSupabaseBrowserClient();
                    if (!client) {
                      toast("Supabase belum dikonfigurasi (VITE_SUPABASE_*).", "error");
                      return;
                    }
                    const { data: sess } = await client.auth.getSession();
                    if (!sess.session?.user || !isSupabaseUserAdmin(sess.session.user)) {
                      toast("Masuk dengan akun Supabase yang memiliki role admin untuk menyimpan harga ke server.", "error");
                      return;
                    }
                    setPriceSaveBusy(true);
                    try {
                      const idr = Math.round(lifetimeIdr);
                      const { data: cur, error: readErr } = await client
                        .from("app_settings")
                        .select("config_version")
                        .eq("id", "default")
                        .maybeSingle();
                      if (readErr) throw readErr;
                      const nextVer = (Number(cur?.config_version) || 1) + 1;
                      const { error } = await client
                        .from("app_settings")
                        .update({ lifetime_price_idr: idr, config_version: nextVer })
                        .eq("id", "default");
                      if (error) throw error;
                      patchSettings({ lifetime_price_idr: idr, price: formatIdr(idr) });
                      onApplyServerLifetimePrice?.(idr);
                      toast("Harga disimpan ke database. Landing & app akan memakai angka ini (setelah cache public-config).", "success");
                    } catch (e) {
                      toast(e instanceof Error ? e.message : String(e), "error");
                    } finally {
                      setPriceSaveBusy(false);
                    }
                  }}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
                >
                  {priceSaveBusy ? "Menyimpan…" : "Simpan harga ke server (app + checkout)"}
                </button>
              </div>
              <Field label="Harga (tampilan, opsional override teks)">
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
              <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-white/10">
                <input
                  type="checkbox"
                  checked={s.socialProofToastEnabled}
                  onChange={(e) => patchSettings({ socialProofToastEnabled: e.target.checked })}
                />
                <span>Toast social proof (kanan bawah, interval 25–45 dtk, suara setelah interaksi)</span>
              </label>
              <div className="grid md:grid-cols-2 gap-4 pt-3">
                <Field label="Social proof — daftar nama (1 per baris)">
                  <textarea
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500 min-h-[120px] font-mono text-xs"
                    value={s.socialProofNames}
                    onChange={(e) => patchSettings({ socialProofNames: e.target.value })}
                    placeholder={"Hanif\nSari\nBudi"}
                  />
                </Field>
                <Field label="Social proof — daftar produk (1 per baris)">
                  <textarea
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500 min-h-[120px] font-mono text-xs"
                    value={s.socialProofProducts}
                    onChange={(e) => patchSettings({ socialProofProducts: e.target.value })}
                    placeholder={"lisensi 1 perangkat Mac\nlisensi Macfyi lifetime"}
                  />
                </Field>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Social proof — daftar aksi (1 per baris)">
                  <textarea
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500 min-h-[120px] font-mono text-xs"
                    value={s.socialProofActions}
                    onChange={(e) => patchSettings({ socialProofActions: e.target.value })}
                    placeholder={"melakukan pemesanan\nbaru menyelesaikan checkout"}
                  />
                </Field>
                <Field label="Social proof — daftar waktu relatif (1 per baris)">
                  <textarea
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500 min-h-[120px] font-mono text-xs"
                    value={s.socialProofTimes}
                    onChange={(e) => patchSettings({ socialProofTimes: e.target.value })}
                    placeholder={"barusan\n2 menit lalu\nbeberapa menit lalu"}
                  />
                </Field>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Label tombol mute">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                    value={s.socialProofMuteLabel}
                    onChange={(e) => patchSettings({ socialProofMuteLabel: e.target.value })}
                  />
                </Field>
                <Field label="Label tombol unmute">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                    value={s.socialProofUnmuteLabel}
                    onChange={(e) => patchSettings({ socialProofUnmuteLabel: e.target.value })}
                  />
                </Field>
              </div>
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

          {tab === "promo" && (
            <>
              <p className="text-white/45 text-xs leading-relaxed">
                Jadwal fase menentukan <strong className="text-white/80">harga lifetime</strong> yang dipakai{" "}
                <code className="text-white/70">public-config</code>, <strong>Midtrans Snap</strong>, dan blok scarcity di landing.
                Isi <strong>sisa slot</strong> dengan angka untuk mengaktifkan penurunan otomatis saat pembayaran sukses (webhook). Kosongkan
                sisa slot untuk hanya menampilkan <code className="text-white/70">slots_initial</code> per fase (tanpa decrement).
              </p>
              {promoLoadBusy && <p className="text-white/40 text-xs">Memuat dari server…</p>}
              <div className="space-y-4">
                {promoPhases.map((row, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3"
                  >
                    <Field label={`Fase ${idx + 1} — mulai (ISO)`}>
                      <input
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500 text-xs"
                        placeholder="2026-04-20T00:00:00+07:00"
                        value={row.starts_at}
                        onChange={(e) => {
                          const next = [...promoPhases];
                          next[idx] = { ...next[idx], starts_at: e.target.value };
                          setPromoPhases(next);
                        }}
                      />
                    </Field>
                    <Field label="selesai (ISO)">
                      <input
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500 text-xs"
                        placeholder="2026-04-30T23:59:59+07:00"
                        value={row.ends_at}
                        onChange={(e) => {
                          const next = [...promoPhases];
                          next[idx] = { ...next[idx], ends_at: e.target.value };
                          setPromoPhases(next);
                        }}
                      />
                    </Field>
                    <Field label="Harga IDR (fase)">
                      <input
                        type="number"
                        min={1000}
                        step={1000}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500 tabular-nums"
                        value={row.lifetime_price_idr}
                        onChange={(e) => {
                          const next = [...promoPhases];
                          next[idx] = { ...next[idx], lifetime_price_idr: e.target.value };
                          setPromoPhases(next);
                        }}
                      />
                    </Field>
                    <Field label="Compare-at IDR (opsional)">
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500 tabular-nums"
                        placeholder="299000"
                        value={row.compare_at_idr}
                        onChange={(e) => {
                          const next = [...promoPhases];
                          next[idx] = { ...next[idx], compare_at_idr: e.target.value };
                          setPromoPhases(next);
                        }}
                      />
                    </Field>
                    <Field label="slots_initial (opsional)">
                      <input
                        type="number"
                        min={0}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500 tabular-nums"
                        placeholder="10"
                        value={row.slots_initial}
                        onChange={(e) => {
                          const next = [...promoPhases];
                          next[idx] = { ...next[idx], slots_initial: e.target.value };
                          setPromoPhases(next);
                        }}
                      />
                    </Field>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => setPromoPhases(promoPhases.filter((_, i) => i !== idx))}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                      >
                        <Trash2 size={14} /> Hapus fase
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setPromoPhases([...promoPhases, emptyPromoPhaseRow()])}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 px-3 py-2 rounded-xl text-xs"
                >
                  <Plus size={14} /> Tambah fase
                </button>
              </div>
              <label className="flex items-center gap-2 text-white/70 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={promoBlockZero}
                  onChange={(e) => setPromoBlockZero(e.target.checked)}
                />
                Blok checkout Midtrans jika sisa slot (counter) = 0
              </label>
              <Field label="Sisa slot (counter live; kosong = tidak decrement)">
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="number"
                    min={0}
                    className="flex-1 min-w-[120px] bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500 tabular-nums"
                    placeholder="mis. 10"
                    value={promoSlotsRemaining}
                    onChange={(e) => setPromoSlotsRemaining(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => void resetPromoSlotsFromActivePhase()}
                    className="text-xs bg-white/10 hover:bg-white/15 px-3 py-2 rounded-xl shrink-0"
                  >
                    Reset dari fase aktif
                  </button>
                </div>
              </Field>
              <button
                type="button"
                disabled={promoSaveBusy || promoLoadBusy}
                onClick={() => void savePromoPlanToServer()}
                className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
              >
                {promoSaveBusy ? "Menyimpan…" : "Simpan jadwal promo ke server"}
              </button>
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
