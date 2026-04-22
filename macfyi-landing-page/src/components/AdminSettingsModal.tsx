import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Download, Upload, Trash2, Plus } from "lucide-react";
import type { ContentData, SiteSettings } from "../types/content";
import { DEFAULT_SITE_SETTINGS, DEFAULT_LEGAL } from "../types/content";
import { deepMerge } from "../lib/mergeData";
import { loadLeads, saveLeads, updateLeadStage, type CrmLead, type LeadStage } from "../lib/leads";
import { getSupabaseBrowserClient, isSupabaseUserAdmin } from "../lib/supabase";
import type { CheckoutGateway } from "../lib/macfyiPublicConfig";
import { formatIdr } from "../lib/formatIdr";
import { uploadBrandLogoFromAdmin } from "../lib/brandAssetUpload";
import { META_STANDARD_EVENTS } from "../lib/conversionPixels";

const TABS = [
  { id: "brand", label: "Global & merek" },
  { id: "contact", label: "Kontak & sosial" },
  { id: "seo", label: "SEO" },
  { id: "track", label: "Pixel & Analytics" },
  { id: "ui", label: "Banner & FAQ" },
  { id: "checkout", label: "Checkout" },
  { id: "coupons", label: "Kupon checkout" },
  { id: "promo", label: "Promo & scarcity" },
  { id: "legal", label: "Footer & legal" },
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

type CouponRow = {
  id: string;
  code: string;
  label: string;
  enabled: boolean;
  auto_apply: boolean;
  mode: "fixed_price" | "percent_off" | "amount_off_idr";
  percent: string;
  amount_off_idr: string;
  fixed_price_idr: string;
  starts_at: string;
  ends_at: string;
};

function emptyCouponRow(): CouponRow {
  return {
    id: `c-${Date.now()}`,
    code: "",
    label: "",
    enabled: true,
    auto_apply: false,
    mode: "percent_off",
    percent: "10",
    amount_off_idr: "",
    fixed_price_idr: "",
    starts_at: "",
    ends_at: "",
  };
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
  const [logoUploadBusy, setLogoUploadBusy] = useState(false);
  const [couponRows, setCouponRows] = useState<CouponRow[]>([emptyCouponRow()]);
  const [couponLoadBusy, setCouponLoadBusy] = useState(false);
  const [couponSaveBusy, setCouponSaveBusy] = useState(false);
  const [checkoutGatewayDraft, setCheckoutGatewayDraft] = useState<CheckoutGateway>("midtrans");
  const [checkoutGatewayLoadBusy, setCheckoutGatewayLoadBusy] = useState(false);
  const [checkoutGatewaySaveBusy, setCheckoutGatewaySaveBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const wpRef = useRef<HTMLInputElement>(null);
  const logoUploadRef = useRef<HTMLInputElement>(null);

  const s = data.settings;
  const legalMerged = { ...DEFAULT_LEGAL, ...(data.legal ?? {}) };
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
    if (!open || tab !== "coupons") return;
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast("Supabase belum dikonfigurasi (VITE_SUPABASE_*).", "info");
      return;
    }
    let cancelled = false;
    (async () => {
      setCouponLoadBusy(true);
      try {
        const { data: row, error } = await client
          .from("app_settings")
          .select("checkout_coupons")
          .eq("id", "default")
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        const doc = row?.checkout_coupons as { coupons?: unknown[] } | null;
        const list = Array.isArray(doc?.coupons) ? doc!.coupons! : [];
        if (list.length === 0) {
          setCouponRows([emptyCouponRow()]);
          return;
        }
        setCouponRows(
          list.map((p: unknown) => {
            const o = (p ?? {}) as Record<string, unknown>;
            return {
              id: String(o.id ?? `c-${Math.random()}`),
              code: String(o.code ?? ""),
              label: String(o.label ?? ""),
              enabled: Boolean(o.enabled),
              auto_apply: Boolean(o.auto_apply),
              mode: (String(o.mode ?? "percent_off") as CouponRow["mode"]) || "percent_off",
              percent: o.percent != null && o.percent !== "" ? String(o.percent) : "",
              amount_off_idr: o.amount_off_idr != null && o.amount_off_idr !== "" ? String(o.amount_off_idr) : "",
              fixed_price_idr: o.fixed_price_idr != null && o.fixed_price_idr !== "" ? String(o.fixed_price_idr) : "",
              starts_at: o.starts_at != null ? String(o.starts_at) : "",
              ends_at: o.ends_at != null ? String(o.ends_at) : "",
            };
          })
        );
      } catch (e) {
        if (!cancelled) toast(e instanceof Error ? e.message : String(e), "error");
      } finally {
        if (!cancelled) setCouponLoadBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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

  useEffect(() => {
    if (!open || tab !== "checkout") return;
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast("Supabase belum dikonfigurasi (VITE_SUPABASE_*).", "info");
      return;
    }
    let cancelled = false;
    (async () => {
      setCheckoutGatewayLoadBusy(true);
      try {
        const { data: row, error } = await client
          .from("platform_settings")
          .select("value")
          .eq("key", "checkout.gateway")
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        const v = row?.value;
        const raw =
          typeof v === "string"
            ? v
            : v === true || v === false
              ? String(v)
              : typeof v === "object" && v !== null && "gateway" in (v as object)
                ? String((v as { gateway?: string }).gateway ?? "")
                : String(v ?? "midtrans");
        const s = raw.toLowerCase().replace(/^"+|"+$/g, "");
        if (s === "lynk" || s === "external" || s === "midtrans") setCheckoutGatewayDraft(s);
        else setCheckoutGatewayDraft("midtrans");
      } catch (e) {
        if (!cancelled) toast(e instanceof Error ? e.message : String(e), "error");
      } finally {
        if (!cancelled) setCheckoutGatewayLoadBusy(false);
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

  const saveCheckoutGatewayToServer = async () => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast("Supabase belum dikonfigurasi.", "error");
      return;
    }
    const { data: sess } = await client.auth.getSession();
    if (!sess.session?.user || !isSupabaseUserAdmin(sess.session.user)) {
      toast("Masuk sebagai admin Supabase untuk mengubah gateway.", "error");
      return;
    }
    setCheckoutGatewaySaveBusy(true);
    try {
      const { error } = await client.from("platform_settings").upsert(
        {
          key: "checkout.gateway",
          value: checkoutGatewayDraft,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
      if (error) throw error;
      toast("Gateway checkout disimpan (platform_settings).", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setCheckoutGatewaySaveBusy(false);
    }
  };

  const saveCheckoutCouponsToServer = async () => {
    const client = getSupabaseBrowserClient();
    if (!client) {
      toast("Supabase belum dikonfigurasi.", "error");
      return;
    }
    const { data: sess } = await client.auth.getSession();
    if (!sess.session?.user || !isSupabaseUserAdmin(sess.session.user)) {
      toast("Masuk sebagai admin.", "error");
      return;
    }
    const coupons = couponRows
      .map((row) => {
        const id = row.id.trim();
        if (!id) return null;
        const mode = row.mode;
        const obj: Record<string, unknown> = {
          id,
          code: row.code.trim(),
          label: row.label.trim() || null,
          enabled: row.enabled,
          auto_apply: row.auto_apply,
          mode,
        };
        if (row.starts_at.trim()) obj.starts_at = row.starts_at.trim();
        if (row.ends_at.trim()) obj.ends_at = row.ends_at.trim();
        if (mode === "percent_off") {
          const p = Number(row.percent);
          if (!Number.isFinite(p) || p <= 0) return null;
          obj.percent = Math.round(p);
        } else if (mode === "amount_off_idr") {
          const a = Math.round(Number(row.amount_off_idr));
          if (!Number.isFinite(a) || a <= 0) return null;
          obj.amount_off_idr = a;
        } else if (mode === "fixed_price") {
          const f = Math.round(Number(row.fixed_price_idr));
          if (!Number.isFinite(f) || f <= 0) return null;
          obj.fixed_price_idr = f;
        }
        if (!row.auto_apply && !row.code.trim()) return null;
        return obj;
      })
      .filter(Boolean) as Record<string, unknown>[];

    const autos = coupons.filter((c) => c.auto_apply);
    if (autos.length > 1) {
      toast("Hanya satu kupon yang boleh auto-apply.", "error");
      return;
    }

    setCouponSaveBusy(true);
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
          checkout_coupons: { coupons },
          config_version: nextVer,
        })
        .eq("id", "default");
      if (error) throw error;
      toast("Kupon checkout disimpan ke server.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), "error");
    } finally {
      setCouponSaveBusy(false);
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
              <Field label="Logo / ikon merek (favicon, landing, app)">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  placeholder="https://… atau unggah ke Supabase Storage"
                  value={s.brandLogoUrl}
                  onChange={(e) => patchSettings({ brandLogoUrl: e.target.value })}
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={logoUploadBusy}
                    onClick={() => logoUploadRef.current?.click()}
                    className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 disabled:opacity-40 px-3 py-2 rounded-xl text-xs"
                  >
                    <Upload size={14} /> Unggah PNG / JPG / WebP / SVG
                  </button>
                  {s.brandLogoUrl ? (
                    <button
                      type="button"
                      onClick={() => patchSettings({ brandLogoUrl: "/brand-logo-default.png" })}
                      className="inline-flex items-center gap-2 text-white/40 hover:text-white text-xs px-2"
                    >
                      <Trash2 size={14} /> Reset default
                    </button>
                  ) : null}
                  <input
                    ref={logoUploadRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      void (async () => {
                        setLogoUploadBusy(true);
                        const r = await uploadBrandLogoFromAdmin(f);
                        setLogoUploadBusy(false);
                        if ("error" in r) {
                          toast(r.error, "error");
                          return;
                        }
                        patchSettings({ brandLogoUrl: r.publicUrl });
                        toast("Logo diunggah. Klik Publikasikan agar URL ikut tersimpan di database & app.", "success");
                      })();
                    }}
                  />
                </div>
                {s.brandLogoUrl ? (
                  <div className="mt-3 flex items-start gap-3">
                    <img
                      src={s.brandLogoUrl}
                      alt=""
                      className="h-16 w-16 rounded-xl object-contain bg-white/5 border border-white/10 shrink-0"
                    />
                    <p className="text-[11px] text-white/40 leading-relaxed pt-1">
                      Ikon aplikasi di Dock/Finder mengikuti file di <code className="text-white/55">src-tauri/icons</code> pada
                      saat build. Logo ini dipakai di UI aplikasi, tab browser, dan halaman landing setelah konten dipublikasikan.
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-white/40 leading-relaxed">
                    Unggah membutuhkan bucket <code className="text-white/55">macfyi_brand</code> (migrasi Supabase) dan masuk sebagai
                    admin. Tanpa itu, tempel URL gambar yang sudah di-host.
                  </p>
                )}
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
                  <code className="text-white/70">app_settings</code> — sama dengan nominal di checkout (Midtrans / Lynk.id), nilai di app (public-config),
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
              <Field label="TikTok Pixel ID">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  placeholder="CXXXX… (dari TikTok Events Manager)"
                  value={s.tiktokPixelId ?? ""}
                  onChange={(e) => patchSettings({ tiktokPixelId: e.target.value })}
                />
              </Field>
              <p className="text-white/50 text-sm font-medium pt-2 border-t border-white/10">
                Meta — nama event standar per langkah
              </p>
              <p className="text-white/35 text-xs mb-3">
                Pilih event yang sama persis dengan di Meta Events Manager (PageView, Lead, InitiateCheckout, dll).{" "}
                <strong className="text-white/55">“none”</strong> = tidak kirim event Meta untuk langkah itu (script PageView awal dari pixel tetap jalan).{" "}
                GA4 &amp; TikTok tetap menerima event analitik internal <code className="text-white/55">macfyi_*</code>.
              </p>
              <MetaEventField
                label="Buka halaman landing (page_open)"
                value={s.metaEventOnPageOpen}
                onChange={(v) => patchSettings({ metaEventOnPageOpen: v })}
              />
              <MetaEventField
                label="Klik Coba gratis / demo (header, hero, pricing kiri)"
                value={s.metaEventOnOpenDemoIntent}
                onChange={(v) => patchSettings({ metaEventOnOpenDemoIntent: v })}
              />
              <MetaEventField
                label="Scarcity — scroll ke blok harga"
                value={s.metaEventOnScarcityScrollToPricing}
                onChange={(v) => patchSettings({ metaEventOnScarcityScrollToPricing: v })}
              />
              <MetaEventField
                label="Pricing — CTA khusus (programatik)"
                value={s.metaEventOnPricingCta}
                onChange={(v) => patchSettings({ metaEventOnPricingCta: v })}
              />
              <MetaEventField
                label="Modal demo terbuka"
                value={s.metaEventOnDemoModalOpen}
                onChange={(v) => patchSettings({ metaEventOnDemoModalOpen: v })}
              />
              <MetaEventField
                label="Kirim form demo (submit)"
                value={s.metaEventOnDemoSubmit}
                onChange={(v) => patchSettings({ metaEventOnDemoSubmit: v })}
              />
              <MetaEventField
                label="Demo — link unduhan siap"
                value={s.metaEventOnDemoDownloadReady}
                onChange={(v) => patchSettings({ metaEventOnDemoDownloadReady: v })}
              />
              <MetaEventField
                label="Form kontak terlihat (#lead)"
                value={s.metaEventOnLeadFormVisible}
                onChange={(v) => patchSettings({ metaEventOnLeadFormVisible: v })}
              />
              <MetaEventField
                label="Form kontak dikirim"
                value={s.metaEventOnLeadFormSubmit}
                onChange={(v) => patchSettings({ metaEventOnLeadFormSubmit: v })}
              />
              <MetaEventField
                label="Navigasi ke /checkout"
                value={s.metaEventOnCheckoutNav}
                onChange={(v) => patchSettings({ metaEventOnCheckoutNav: v })}
              />
              <MetaEventField
                label="Halaman /checkout dimuat"
                value={s.metaEventOnCheckoutRouteView}
                onChange={(v) => patchSettings({ metaEventOnCheckoutRouteView: v })}
              />
              <MetaEventField
                label="Form checkout tampil"
                value={s.metaEventOnCheckoutFormVisible}
                onChange={(v) => patchSettings({ metaEventOnCheckoutFormVisible: v })}
              />
              <MetaEventField
                label="Submit form checkout"
                value={s.metaEventOnCheckoutFormSubmit}
                onChange={(v) => patchSettings({ metaEventOnCheckoutFormSubmit: v })}
              />
              <MetaEventField
                label="Midtrans Snap dibuka"
                value={s.metaEventOnSnapOpened}
                onChange={(v) => patchSettings({ metaEventOnSnapOpened: v })}
              />
              <MetaEventField
                label="Redirect ke Lynk / hosted checkout"
                value={s.metaEventOnLynkRedirect}
                onChange={(v) => patchSettings({ metaEventOnLynkRedirect: v })}
              />
              <MetaEventField
                label="Pembayaran selesai (Snap sukses)"
                value={s.metaEventOnPurchaseCompleted}
                onChange={(v) => patchSettings({ metaEventOnPurchaseCompleted: v })}
              />
              <p className="text-white/50 text-sm font-medium pt-4">Kirim event interaksi ke pixel mana</p>
              <label className="flex items-center gap-3 cursor-pointer text-sm text-white/80">
                <input
                  type="checkbox"
                  className="rounded border-white/20"
                  checked={s.pixelSendMeta !== false}
                  onChange={(e) => patchSettings({ pixelSendMeta: e.target.checked })}
                />
                Meta (Facebook) — event interaksi
              </label>
              <label className="flex items-center gap-3 cursor-pointer text-sm text-white/80 mt-2">
                <input
                  type="checkbox"
                  className="rounded border-white/20"
                  checked={s.pixelSendGa !== false}
                  onChange={(e) => patchSettings({ pixelSendGa: e.target.checked })}
                />
                Google Analytics 4 — event interaksi
              </label>
              <label className="flex items-center gap-3 cursor-pointer text-sm text-white/80 mt-2">
                <input
                  type="checkbox"
                  className="rounded border-white/20"
                  checked={s.pixelSendTiktok !== false}
                  onChange={(e) => patchSettings({ pixelSendTiktok: e.target.checked })}
                />
                TikTok — event interaksi
              </label>
              <p className="text-white/35 text-xs mt-4">
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
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                <p className="text-white/70 text-xs font-semibold">Gateway pembayaran (server)</p>
                <p className="text-white/40 text-xs leading-relaxed">
                  Mengatur <code className="text-white/55">platform_settings.checkout.gateway</code> — landing membaca lewat{" "}
                  <code className="text-white/55">public-config</code>. Midtrans butuh secret Midtrans; Lynk butuh{" "}
                  <code className="text-white/55">LYNK_*</code> di Supabase; URL eksternal hanya membuka Checkout URL (tanpa Snap / Lynk).
                </p>
                {checkoutGatewayLoadBusy ? (
                  <p className="text-white/40 text-xs">Memuat gateway dari server…</p>
                ) : (
                  <div className="flex flex-col gap-2 text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="checkout-gateway"
                        checked={checkoutGatewayDraft === "midtrans"}
                        onChange={() => setCheckoutGatewayDraft("midtrans")}
                      />
                      <span>Midtrans (Snap)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="checkout-gateway"
                        checked={checkoutGatewayDraft === "lynk"}
                        onChange={() => setCheckoutGatewayDraft("lynk")}
                      />
                      <span>Lynk.id</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="checkout-gateway"
                        checked={checkoutGatewayDraft === "external"}
                        onChange={() => setCheckoutGatewayDraft("external")}
                      />
                      <span>Hanya URL eksternal</span>
                    </label>
                  </div>
                )}
                <button
                  type="button"
                  disabled={checkoutGatewaySaveBusy || checkoutGatewayLoadBusy}
                  onClick={() => void saveCheckoutGatewayToServer()}
                  className="bg-red-600 hover:bg-red-500 disabled:opacity-50 px-4 py-2 rounded-xl text-xs font-bold"
                >
                  {checkoutGatewaySaveBusy ? "Menyimpan…" : "Simpan gateway ke server"}
                </button>
                {(checkoutGatewayDraft === "lynk" || Boolean(s.checkoutLynkStaticUrl?.trim())) && (
                  <div className="pt-3 mt-3 border-t border-white/10 space-y-3">
                    <p className="text-white/55 text-xs leading-relaxed">
                      <strong className="text-white/80">Lynk — dua cara:</strong> (1){" "}
                      <em>Tautan hosted</em> — isi URL di bawah; pengunjung diarahkan ke Lynk dengan query{" "}
                      <code className="text-white/50">email</code>, <code className="text-white/50">name</code>,{" "}
                      <code className="text-white/50">phone</code> (sesuai dukungan URL Lynk Anda). Disimpan saat Anda{" "}
                      <strong className="text-white/80">Publikasikan</strong> konten landing. (2) <em>API server</em> — kosongkan
                      URL ini; set secret <code className="text-white/50">LYNK_CREATE_URL</code> +{" "}
                      <code className="text-white/50">LYNK_BEARER_TOKEN</code> (atau kunci / merchant key dari panel Lynk sebagai
                      token) di Supabase; jangan menaruh secret di halaman admin ini.
                    </p>
                    <Field label="URL tautan checkout Lynk (hosted link, opsional)">
                      <input
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500 font-mono text-xs"
                        placeholder="https://…"
                        value={s.checkoutLynkStaticUrl}
                        onChange={(e) => patchSettings({ checkoutLynkStaticUrl: e.target.value })}
                      />
                    </Field>
                    <div className="rounded-lg bg-black/35 border border-white/10 p-3 space-y-2">
                      <p className="text-[11px] text-white/45 uppercase tracking-wide">Contoh isi secret (CLI)</p>
                      <pre className="text-[10px] text-emerald-200/90 whitespace-pre-wrap break-all font-mono leading-relaxed">
                        {`# File: scripts/env.supabase.secrets (salin dari .example), lalu:
supabase secrets set --env-file scripts/env.supabase.secrets

LYNK_CREATE_URL=https://…
LYNK_BEARER_TOKEN=…
# atau: LYNK_AUTH_MODE=x-api-key  +  LYNK_API_KEY=…
LYNK_WEBHOOK_SECRET=…`}
                      </pre>
                      <button
                        type="button"
                        className="text-[11px] text-red-300 hover:text-red-200 underline-offset-2 hover:underline"
                        onClick={() => {
                          void navigator.clipboard?.writeText(`LYNK_CREATE_URL=
LYNK_BEARER_TOKEN=
LYNK_WEBHOOK_SECRET=
`);
                          toast("Template secret Lynk disalin — isi nilai lalu set lewat CLI.", "success");
                        }}
                      >
                        Salin template nama secret (tanpa nilai)
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="Tombol (Midtrans)">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                    value={s.checkoutCtaMidtrans}
                    onChange={(e) => patchSettings({ checkoutCtaMidtrans: e.target.value })}
                  />
                </Field>
                <Field label="Tombol (Lynk.id)">
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                    value={s.checkoutCtaLynk}
                    onChange={(e) => patchSettings({ checkoutCtaLynk: e.target.value })}
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
              <Field label="Catatan kaki (Lynk.id)">
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500 min-h-[56px] text-xs"
                  value={s.checkoutFooterLynk}
                  onChange={(e) => patchSettings({ checkoutFooterLynk: e.target.value })}
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

          {tab === "coupons" && (
            <>
              <p className="text-white/45 text-xs leading-relaxed">
                Kupon memotong harga <strong className="text-white/80">setelah harga promo</strong> fase aktif. Harga final
                dihitung di Edge Function (Midtrans + preview). Mode: harga tetap, persen, atau potongan nominal.{" "}
                <strong className="text-white/80">Satu</strong> kupon boleh <code className="text-white/60">auto_apply</code>{" "}
                (terisi otomatis di halaman checkout).
              </p>
              {couponLoadBusy && <p className="text-white/40 text-xs">Memuat dari server…</p>}
              <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                {couponRows.map((row, idx) => (
                  <div key={row.id} className="rounded-xl border border-white/10 bg-black/25 p-4 space-y-3">
                    <div className="flex flex-wrap gap-3 items-center">
                      <label className="flex items-center gap-2 text-xs text-white/70">
                        <input
                          type="checkbox"
                          checked={row.enabled}
                          onChange={(e) => {
                            const next = [...couponRows];
                            next[idx] = { ...next[idx], enabled: e.target.checked };
                            setCouponRows(next);
                          }}
                        />
                        Aktif
                      </label>
                      <label className="flex items-center gap-2 text-xs text-white/70">
                        <input
                          type="checkbox"
                          checked={row.auto_apply}
                          onChange={(e) => {
                            const next = [...couponRows];
                            next[idx] = { ...next[idx], auto_apply: e.target.checked };
                            setCouponRows(next);
                          }}
                        />
                        Auto di checkout
                      </label>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <Field label="ID unik">
                        <input
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500"
                          value={row.id}
                          onChange={(e) => {
                            const next = [...couponRows];
                            next[idx] = { ...next[idx], id: e.target.value };
                            setCouponRows(next);
                          }}
                        />
                      </Field>
                      <Field label="Kode (wajib jika tidak auto)">
                        <input
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500"
                          value={row.code}
                          onChange={(e) => {
                            const next = [...couponRows];
                            next[idx] = { ...next[idx], code: e.target.value };
                            setCouponRows(next);
                          }}
                        />
                      </Field>
                    </div>
                    <Field label="Label (tampilan)">
                      <input
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500"
                        value={row.label}
                        onChange={(e) => {
                          const next = [...couponRows];
                          next[idx] = { ...next[idx], label: e.target.value };
                          setCouponRows(next);
                        }}
                      />
                    </Field>
                    <Field label="Mode">
                      <select
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500"
                        value={row.mode}
                        onChange={(e) => {
                          const next = [...couponRows];
                          next[idx] = { ...next[idx], mode: e.target.value as CouponRow["mode"] };
                          setCouponRows(next);
                        }}
                      >
                        <option value="percent_off">Diskon persen</option>
                        <option value="amount_off_idr">Potongan nominal (IDR)</option>
                        <option value="fixed_price">Harga jadi (IDR)</option>
                      </select>
                    </Field>
                    {row.mode === "percent_off" && (
                      <Field label="Persen (1–100)">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 tabular-nums"
                          value={row.percent}
                          onChange={(e) => {
                            const next = [...couponRows];
                            next[idx] = { ...next[idx], percent: e.target.value };
                            setCouponRows(next);
                          }}
                        />
                      </Field>
                    )}
                    {row.mode === "amount_off_idr" && (
                      <Field label="Potongan (IDR)">
                        <input
                          type="number"
                          min={1000}
                          step={1000}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 tabular-nums"
                          value={row.amount_off_idr}
                          onChange={(e) => {
                            const next = [...couponRows];
                            next[idx] = { ...next[idx], amount_off_idr: e.target.value };
                            setCouponRows(next);
                          }}
                        />
                      </Field>
                    )}
                    {row.mode === "fixed_price" && (
                      <Field label="Harga final (IDR)">
                        <input
                          type="number"
                          min={1000}
                          step={1000}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500 tabular-nums"
                          value={row.fixed_price_idr}
                          onChange={(e) => {
                            const next = [...couponRows];
                            next[idx] = { ...next[idx], fixed_price_idr: e.target.value };
                            setCouponRows(next);
                          }}
                        />
                      </Field>
                    )}
                    <div className="grid md:grid-cols-2 gap-3">
                      <Field label="Mulai (ISO, opsional)">
                        <input
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500"
                          placeholder="2026-01-01T00:00:00.000Z"
                          value={row.starts_at}
                          onChange={(e) => {
                            const next = [...couponRows];
                            next[idx] = { ...next[idx], starts_at: e.target.value };
                            setCouponRows(next);
                          }}
                        />
                      </Field>
                      <Field label="Berakhir (ISO, opsional)">
                        <input
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-red-500"
                          value={row.ends_at}
                          onChange={(e) => {
                            const next = [...couponRows];
                            next[idx] = { ...next[idx], ends_at: e.target.value };
                            setCouponRows(next);
                          }}
                        />
                      </Field>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCouponRows(couponRows.filter((_, i) => i !== idx))}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <Trash2 size={14} /> Hapus kupon
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setCouponRows([...couponRows, emptyCouponRow()])}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 px-3 py-2 rounded-xl text-xs"
                >
                  <Plus size={14} /> Tambah kupon
                </button>
              </div>
              <button
                type="button"
                disabled={couponSaveBusy || couponLoadBusy}
                onClick={() => void saveCheckoutCouponsToServer()}
                className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
              >
                {couponSaveBusy ? "Menyimpan…" : "Simpan kupon ke server"}
              </button>
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
              <p className="text-white/45 text-xs">
                Tautan <code className="text-white/60">/terms</code> dan <code className="text-white/60">/privacy</code>{" "}
                memuat HTML di bawah. URL override di bawah untuk link eksternal atau path lain.
              </p>
              <Field label="Judul halaman Syarat (/terms)">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  value={legalMerged.termsTitle}
                  onChange={(e) =>
                    replaceData({ ...data, legal: { ...legalMerged, termsTitle: e.target.value } })
                  }
                />
              </Field>
              <Field label="HTML Syarat & Ketentuan">
                <textarea
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 font-mono text-xs min-h-[140px] outline-none focus:border-red-500"
                  value={legalMerged.termsHtml}
                  onChange={(e) =>
                    replaceData({ ...data, legal: { ...legalMerged, termsHtml: e.target.value } })
                  }
                />
              </Field>
              <Field label="Judul halaman Privasi (/privacy)">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  value={legalMerged.privacyTitle}
                  onChange={(e) =>
                    replaceData({ ...data, legal: { ...legalMerged, privacyTitle: e.target.value } })
                  }
                />
              </Field>
              <Field label="HTML Kebijakan Privasi">
                <textarea
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 font-mono text-xs min-h-[140px] outline-none focus:border-red-500"
                  value={legalMerged.privacyHtml}
                  onChange={(e) =>
                    replaceData({ ...data, legal: { ...legalMerged, privacyHtml: e.target.value } })
                  }
                />
              </Field>
              <Field label="URL Syarat & Ketentuan (override / link)">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  placeholder="/terms atau https://…"
                  value={s.termsUrl}
                  onChange={(e) => patchSettings({ termsUrl: e.target.value })}
                />
              </Field>
              <Field label="URL Kebijakan Privasi (override / link)">
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500"
                  placeholder="/privacy atau https://…"
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

function MetaEventField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  const v = value?.trim() ? value : "none";
  return (
    <Field label={label}>
      <select
        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 outline-none focus:border-red-500 text-sm"
        value={v}
        onChange={(e) => onChange(e.target.value)}
      >
        {META_STANDARD_EVENTS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
