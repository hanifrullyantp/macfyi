import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Monitor, 
  ShieldCheck, 
  Trash2, 
  Layers, 
  Zap, 
  Cpu, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  X, 
  AlertTriangle, 
  Settings, 
  Save, 
  Send, 
  Eye, 
  Cloud,
  Download,
  Mail,
  Info,
  Undo2,
  Redo2,
  LayoutDashboard,
} from 'lucide-react';
import { EditableText, EditableImage, EditableVideo } from './components/Editable';
import type { ContentData } from './types/content';
import { DEFAULT_SITE_SETTINGS, DEFAULT_LEGAL } from './types/content';
import { deepMerge } from './lib/mergeData';
import { clearLegacyAdminSession, isValidLegacyAdminSession } from './config/adminAuth';
import { getSupabaseBrowserClient, isSupabaseBrowserConfigured, isSupabaseUserAdmin } from './lib/supabase';
import { injectFacebookPixel, injectGoogleAnalytics, injectTikTokPixel } from './lib/injectTracking';
import { firePixelStep } from './lib/conversionPixels';
import { ToastProvider, useToast } from './components/ToastProvider';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminSettingsModal } from './components/AdminSettingsModal';
import { NotificationBanner } from './components/NotificationBanner';
import { SocialProofToast, toggleSocialProofMuteFromOutside, getSocialProofMuted } from './components/SocialProofToast';
import { LeadCaptureForm } from './components/LeadCaptureForm';
import { DemoRequestModal } from './components/DemoRequestModal';
import { bootstrapReferralAndTracking, queueSiteEvent } from './lib/siteAnalytics';
import { applyLifetimePriceIdrToContent, normalizePricingContent } from './lib/pricingContent';
import { formatIdr } from './lib/formatIdr';
import { ScarcityBand } from './components/ScarcityBand';
import { StorageImpactAnimation } from './components/StorageImpactAnimation';
import { syncLandingBrandingTags } from './lib/brandingHead';
import { fetchMacfyiPublicConfig, type MacfyiPublicPromo } from './lib/macfyiPublicConfig';

type PromoLiveState = {
  countdown: { endMs: number; clockOffsetMs: number } | null;
  slotsDisplay: number | null;
};

function SmartFooterLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const t = href.trim();
  if (/^https?:\/\//i.test(t)) {
    return (
      <a href={t} className={className}>
        {children}
      </a>
    );
  }
  const path = t.startsWith('/') ? t : `/${t}`;
  return (
    <Link to={path} className={className}>
      {children}
    </Link>
  );
}

function mergePricingFromServer(merged: ContentData, idr: number, compareAtIdr: number | null): ContentData {
  let next = applyLifetimePriceIdrToContent(merged, idr);
  if (compareAtIdr != null && compareAtIdr > 0) {
    next = {
      ...next,
      pricing: { ...next.pricing, compareAtPrice: formatIdr(compareAtIdr) },
    };
  }
  return next;
}

function buildPromoLiveFromConfig(cfg: {
  promo: MacfyiPublicPromo | null;
  serverTimeIso: string | null;
}): PromoLiveState | null {
  if (!cfg.promo) return null;
  const p = cfg.promo;
  let countdown: { endMs: number; clockOffsetMs: number } | null = null;
  if (p.active && p.ends_at) {
    const endMs = Date.parse(p.ends_at);
    if (Number.isFinite(endMs) && endMs > 0) {
      countdown = {
        endMs,
        clockOffsetMs: cfg.serverTimeIso ? Date.parse(cfg.serverTimeIso) - Date.now() : 0,
      };
    }
  }
  const slotOk = p.slots_display != null && Number.isFinite(Number(p.slots_display));
  if (!countdown && !slotOk) return null;
  return {
    countdown,
    slotsDisplay: slotOk ? Math.max(0, Math.round(Number(p.slots_display))) : null,
  };
}

const INITIAL_DATA: ContentData = {
  hero: {
    title: "Macfyi",
    headline: "Storage Macbook Mentok, bingung apa lagi yang mau dihapus?",
    subheadline: "Storage lega, tanpa takut salah hapus. Macfyi membantu Anda tahu apa yang bikin penuh—lalu bersihkan dengan aman",
    features: [
      "Analisis storage",
      "Cleanup aman",
      "Uninstaller",
      "My Clutter",
      "Monitor & performa",
      "Asisten AI (privasi)",
    ],
    primaryCTA: "Coba Gratis",
    secondaryCTA: "Beli Lifetime"
  },
  problem: {
    heading: "Bayangkan…",
    p1: "Penyimpanan Mac Anda tinggal sedikit. Kerja mulai terganggu: update gagal, aplikasi berat, file baru susah disimpan.",
    p2: "Anda ingin bersih-bersih… tapi “Bingung”",
    highlight: "“Apa Lagi Yang Mau Di Hapus?”",
    p3: "Akhirnya Macbook Anda makin berat. Tapi beli aplikasi cleaner… kemahalan atau malah bikin ragu karena terlalu agresif."
  },
  solution: {
    preHeading: "Semua ini terjadi karena…",
    heading: "Masalahnya bukan cuma “storage penuh”. Masalahnya: Anda tidak punya peta.",
    p1: "Tanpa panduan, bersih-bersih Mac terasa seperti tebak-tebakan. Anda tidak tahu mana yang aman dibuang atau mana yang diam-diam membengkak.",
    p2: "Macfyi dibuat untuk membantu Anda melihat penyebab storage penuh dan memberi rekomendasi yang lebih aman.",
    closerLabel: "Solusi yang lebih jelas dengan"
  },
  featuresList: [
    { id: 1, title: "Peta storage", desc: "Anda langsung tahu apa yang paling makan ruang, tanpa bongkar folder satu-satu.", icon: "Monitor" },
    { id: 2, title: "Cleanup aman", desc: "Ada penanda “lebih aman dibersihkan” dan “perlu dicek dulu” sebelum Anda hapus.", icon: "ShieldCheck" },
    { id: 3, title: "Uninstaller", desc: "Hapus aplikasi sampai rapi, termasuk sisa file yang sering tertinggal.", icon: "Trash2" },
    { id: 4, title: "My Clutter", desc: "Bereskan sisa file yang sering tidak terasa, tapi lama-lama bikin penuh.", icon: "Layers" },
    { id: 5, title: "Asisten AI (privasi)", desc: "Tanya “ini file apa?” tanpa membagikan lokasi detail file Anda.", icon: "Zap" }
  ],
  details: [
    {
      id: 1,
      title: "Deep Scan — Ketemu Penyebab Storage Penuh dalam Menit",
      p1: "Macfyi memetakan folder dan file yang paling “berat”, jadi Anda tidak perlu bongkar satu-satu secara manual. Anda langsung tahu harus mulai dari mana untuk hasil paling terasa.",
      bullets: ["Fokus ke yang paling berdampak", "Tidak perlu tebak-tebakan", "Lebih cepat ambil keputusan"],
      image: "/landing/detail-01-deep-scan.png",
    },
    {
      id: 2,
      title: "Safe Cleaning — Bersih-bersih Tanpa Deg-degan",
      p1: "Macfyi memberi penanda “aman dibersihkan” dan “perlu dicek dulu”, sehingga Anda lebih yakin saat menghapus. Anda tetap review dulu sebelum aksi, jadi kontrol ada di tangan Anda.",
      bullets: ["Ada penanda kehati-hatian yang jelas", "Anda tetap review sebelum hapus", "Mengurangi risiko salah hapus file penting"],
      image: "/landing/detail-02-safe-cleaning.png",
    },
    {
      id: 3,
      title: "Complete Uninstall — Hapus Aplikasi Sampai Benar-benar Rapi",
      p1: "Menghapus aplikasi sering meninggalkan sisa file yang diam-diam memakan ruang. Macfyi membantu Anda membereskan sisa-sisa itu, supaya storage tidak cepat penuh lagi.",
      bullets: ["Aplikasi hilang, sisa file ikut beres", "Storage lebih rapi dari waktu ke waktu", "Mengurangi “sampah” tersembunyi setelah uninstall"],
      image: "/landing/detail-03-complete-uninstall.png",
    },
    {
      id: 4,
      title: "RAM Optimization — Mac Terasa Lebih Ringan Saat Dipakai",
      p1: "Saat Mac terasa berat, bukan cuma storage yang jadi penyebab. Macfyi membantu Anda melihat apa yang paling membebani memori, supaya Anda bisa menutup atau merapikan yang tidak perlu.",
      bullets: ["Tahu aplikasi mana yang paling membebani RAM", "Bantu kurangi beban saat kerja multitasking", "Mac lebih nyaman dipakai untuk aktivitas harian"],
      image: "/landing/detail-04-ram-optimization.png",
    },
  ],
  steps: {
    title: "Caranya Mudah",
    subtitle: "Ikuti 3 Step Ini:",
    items: [
      { step: "01", label: "Scan", desc: "Macfyi merangkum penyebab storage penuh.", color: "bg-orange-500" },
      { step: "02", label: "Review", desc: "Anda lihat rekomendasi dan memilih yang ingin dibersihkan.", color: "bg-yellow-500" },
      { step: "03", label: "Clean", desc: "Bersihkan yang Anda setujui, storage pun lega.", color: "bg-green-500" }
    ]
  },
  pricing: {
    title: "Demo gratis atau beli lifetime",
    freeTitle: "Demo Macfyi",
    freeSubtitle: "Unduh aplikasi, coba fitur utama, lalu putuskan kapan ingin membeli.",
    freeBullets: ["Unduh DMG resmi", "Mode demo dengan batas wajar", "Tanpa kartu kredit"],
    freeCta: "Coba gratis",
    paidTitle: "Lifetime (1 perangkat Mac)",
    compareAtPrice: "Rp 299.000",
    price: "Rp. 173 rb",
    label: "Lifetime 1 Mac",
    bullets: ["Sekali bayar", "Tanpa langganan", "Dipakai kapan saja saat storage penuh lagi"],
    cta: "Lifetime (1x Bayar)",
  },
  scarcity: {
    headline1: "Jangan Sampai Menyesal",
    headline2: "Tidak Kebagian ya..",
    badge: "Hanya Untuk 10 Orang Tercepat Saja",
    slotsDash: "—",
    slotsLabel: "Tersisa",
    slotsCount: "7",
    slotsDashAfter: "Slot! —",
    hargaNormalLabel: "Harga Normal",
    strikeLargest: "Rp 1.200.000",
    strikeMedium: "Rp 379.000",
    strikeSmall: "Rp 299.000",
    exclusiveLine: "Khusus untuk 10 orang tercepat pertama sampai waktu berakhir:",
    visitorCountdownMinutes: 165,
    countdownEndIso: "",
  },
  valueStack: {
    title: "Yang Anda dapatkan setelah pakai Macfyi",
    items: [
      "Lebih tenang karena tidak menebak-nebak",
      "Lebih rapi karena sisa aplikasi ikut beres",
      "Lebih cepat ambil keputusan karena terlihat jelas penyebabnya",
      "Lebih siap jangka panjang karena saat penuh lagi, Anda sudah punya alatnya"
    ],
    cta: "Saya Mau!"
  },
  urgency: {
    title: "Semakin ditunda, semakin banyak yang menumpuk tanpa terasa",
    p1: "Kalau dibiarkan:",
    bullets: [
      "storage makin sering “mentok” saat butuh mendadak",
      "file sisa makin sulit dipilah",
      "waktu Anda habis untuk cari-cari manual"
    ],
    cta: "Checkout Rp 173.000"
  },
  trust: {
    title: "Dibuat untuk pengguna Mac yang ingin jelas dan aman",
    bullets: [
      "Anda bisa review dulu sebelum bersih-bersih",
      "Macfyi membantu Anda memahami, bukan memaksa menghapus",
      "Privasi dijaga: AI tidak membagikan lokasi detail file Anda"
    ]
  },
  comparison: {
    title: "Kenapa Macfyi lebih nyaman dibanding cara lain?",
    headers: ["", "Bersih-bersih Manual", "Cleaner Berlangganan", "Macfyi"],
    rows: [
      { label: "Tahu penyebab storage penuh", values: [false, true, true] },
      { label: "Ada panduan “aman / cek dulu”", values: ["⚠️", "⚠️", true] },
      { label: "Uninstall sampai rapi", values: [false, true, true] },
      { label: "Biaya", values: ["“gratis” tapi makan waktu", "mahal tiap bulan", "sekali bayar"] },
      { label: "Privasi AI", values: ["-", "tidak selalu jelas", true] }
    ],
    conclusion: "Kesimpulan: Macfyi = jelas, lebih aman, sekali bayar"
  },
  faq: [
    { q: "Apakah Macfyi otomatis menghapus file saya?", a: "Tidak. Macfyi hanya memberi rekomendasi. Keputusan akhir untuk menghapus tetap ada di tangan Anda." },
    { q: "Bagaimana Macfyi menjaga privasi AI?", a: "Sesuai prinsip privacy-first, AI hanya menganalisis pola umum data lokal. Path file lengkap tidak dikirim ke server eksternal kami." },
    { q: "Kenapa perlu izin akses folder / Full Disk Access?", a: "Karena banyak file sampah tersimpan di area sistem yang terkunci default. Izin ini diperlukan agar Macfyi bisa memindai area tersebut secara menyeluruh." },
    { q: "Lisensi untuk berapa perangkat?", a: "Lisensi ini berlaku untuk 1 perangkat Mac selamanya (Lifetime)." },
    { q: "Apakah Macfyi bisa memulihkan file yang terhapus?", a: "Tidak. Fokus utama Macfyi adalah pembersihan storage dan optimasi sistem, bukan pemulihan file (data recovery)." }
  ],
  footer: {
    address: "Jakarta, Indonesia",
    contact: "support@macfyi.com",
    hours: "Senin - Jumat, 09:00 - 18:00 WIB",
    links: [
      { label: "Syarat & Ketentuan", url: "/terms" },
      { label: "Kebijakan Privasi", url: "/privacy" },
    ],
    copyright: "© 2026 Macfyi. Dibuat untuk Produktivitas & Keamanan Data Anda.",
  },
  legal: { ...DEFAULT_LEGAL },
  settings: {
    ...DEFAULT_SITE_SETTINGS,
  },
};

function withDefaultSettings(d: ContentData): ContentData {
  return {
    ...d,
    settings: { ...DEFAULT_SITE_SETTINGS, ...d.settings },
    legal: { ...DEFAULT_LEGAL, ...(d.legal ?? {}) },
  };
}

function mergeSavedContent(raw: string | null): ContentData {
  if (!raw) return normalizePricingContent(withDefaultSettings(JSON.parse(JSON.stringify(INITIAL_DATA)) as ContentData));
  try {
    const parsed = JSON.parse(raw) as Partial<ContentData>;
    const base = JSON.parse(JSON.stringify(INITIAL_DATA)) as ContentData;
    return normalizePricingContent(withDefaultSettings(deepMerge(base, parsed)));
  } catch {
    return normalizePricingContent(withDefaultSettings(JSON.parse(JSON.stringify(INITIAL_DATA)) as ContentData));
  }
}

// --- Components ---

const IconComponent = ({ name, className }: { name: string; className?: string }) => {
  switch (name) {
    case 'Monitor': return <Monitor className={className} />;
    case 'ShieldCheck': return <ShieldCheck className={className} />;
    case 'Trash2': return <Trash2 className={className} />;
    case 'Layers': return <Layers className={className} />;
    case 'Zap': return <Zap className={className} />;
    case 'Cpu': return <Cpu className={className} />;
    default: return <Info className={className} />;
  }
};

export function LandingApp() {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState<ContentData>(() =>
    typeof localStorage !== 'undefined' ? mergeSavedContent(localStorage.getItem('macfyi_data')) : INITIAL_DATA
  );
  const [legacyAdmin, setLegacyAdmin] = useState(() => isValidLegacyAdminSession());
  const [supabaseAdmin, setSupabaseAdmin] = useState(false);
  const [supabaseLoggedIn, setSupabaseLoggedIn] = useState(false);
  const sessionOk = isSupabaseBrowserConfigured() ? supabaseAdmin : legacyAdmin;
  const [undoStack, setUndoStack] = useState<ContentData[]>([]);
  const [redoStack, setRedoStack] = useState<ContentData[]>([]);
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  const [adminPreview, setAdminPreview] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoModalSource, setDemoModalSource] = useState<string>("unknown");
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [openFaqs, setOpenFaqs] = useState<Set<number>>(() => new Set([0]));
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem('macfyi_banner_dismissed') === '1'
  );
  const [socialMuteUi, setSocialMuteUi] = useState(() =>
    typeof window !== 'undefined' ? getSocialProofMuted() : false
  );
  const [promoLive, setPromoLive] = useState<PromoLiveState | null>(null);
  const pageOpenTracked = useRef(false);

  const canEdit = sessionOk && !adminPreview;

  const leadWebhookUrl = import.meta.env.VITE_LEAD_WEBHOOK_URL as string | undefined;
  const leadWebhookActive = Boolean(leadWebhookUrl?.trim());

  useEffect(() => {
    if (!isSupabaseBrowserConfigured()) {
      setLegacyAdmin(isValidLegacyAdminSession());
      const t = window.setInterval(() => setLegacyAdmin(isValidLegacyAdminSession()), 20000);
      return () => window.clearInterval(t);
    }
    const client = getSupabaseBrowserClient();
    if (!client) return;
    const sync = async () => {
      const { data: sess } = await client.auth.getSession();
      setSupabaseAdmin(isSupabaseUserAdmin(sess.session?.user ?? null));
    };
    void sync();
    const { data: sub } = client.auth.onAuthStateChange(() => {
      void sync();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateFromServer = async (merged: ContentData) => {
      const cfg = await fetchMacfyiPublicConfig();
      if (cancelled) return;
      const idr = cfg?.idr ?? null;
      const compare = cfg?.promo?.compare_at_idr;
      const cmpOk = compare != null && typeof compare === "number" && compare > 0 ? compare : null;
      const next = idr != null ? mergePricingFromServer(merged, idr, cmpOk) : merged;
      setData(next);
      setPromoLive(cfg ? buildPromoLiveFromConfig({ promo: cfg.promo, serverTimeIso: cfg.serverTimeIso }) : null);
    };

    (async () => {
      const client = getSupabaseBrowserClient();
      if (client) {
        const { data: row } = await client
          .from('landing_site_content')
          .select('content')
          .eq('id', 'default')
          .maybeSingle();
        if (cancelled) return;
        if (row?.content && typeof row.content === 'object' && !Array.isArray(row.content)) {
          const merged = normalizePricingContent(
            withDefaultSettings(
              deepMerge(
                JSON.parse(JSON.stringify(INITIAL_DATA)) as ContentData,
                row.content as Partial<ContentData>
              )
            )
          );
          await hydrateFromServer(merged);
          if (!cancelled) {
            setUndoStack([]);
            setRedoStack([]);
          }
          return;
        }
      }
      if (!cancelled && typeof localStorage !== 'undefined') {
        const localMerged = mergeSavedContent(localStorage.getItem('macfyi_data'));
        await hydrateFromServer(localMerged);
        if (!cancelled) {
          setUndoStack([]);
          setRedoStack([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.title = data.settings.seoTitle;
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', data.settings.seoDescription);
  }, [data.settings.seoTitle, data.settings.seoDescription]);

  useEffect(() => {
    syncLandingBrandingTags(data.settings.brandLogoUrl ?? '', data.settings.ogImageUrl ?? '');
  }, [data.settings.brandLogoUrl, data.settings.ogImageUrl]);

  useEffect(() => {
    if (data.settings.facebookPixelId?.trim()) injectFacebookPixel(data.settings.facebookPixelId);
  }, [data.settings.facebookPixelId]);

  useEffect(() => {
    if (data.settings.googleAnalyticsId?.trim()) injectGoogleAnalytics(data.settings.googleAnalyticsId);
  }, [data.settings.googleAnalyticsId]);

  useEffect(() => {
    if (data.settings.tiktokPixelId?.trim()) injectTikTokPixel(data.settings.tiktokPixelId);
  }, [data.settings.tiktokPixelId]);

  useEffect(() => {
    bootstrapReferralAndTracking();
  }, []);

  useEffect(() => {
    if (pageOpenTracked.current) return;
    pageOpenTracked.current = true;
    firePixelStep(dataRef.current.settings, "page_open", { path: window.location.pathname });
  }, []);

  useEffect(() => {
    const sync = () => setSocialMuteUi(getSocialProofMuted());
    window.addEventListener('macfyi-social-proof-mute', sync);
    return () => window.removeEventListener('macfyi-social-proof-mute', sync);
  }, []);

  const updateData = useCallback((path: string, value: unknown) => {
    setData((prev) => {
      const newData = structuredClone(prev) as ContentData;
      const keys = path.split('.');
      let current: Record<string, unknown> = newData as unknown as Record<string, unknown>;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]] as Record<string, unknown>;
      }
      current[keys[keys.length - 1]] = value;
      if (JSON.stringify(prev) !== JSON.stringify(newData)) {
        setUndoStack((u) => [...u.slice(-39), structuredClone(prev)]);
        setRedoStack([]);
      }
      return newData;
    });
    setHasChanges(true);
  }, []);

  const patchSettings = useCallback((partial: Partial<ContentData['settings']>) => {
    setData((prev) => {
      const next = { ...prev, settings: { ...prev.settings, ...partial } };
      if (JSON.stringify(prev) !== JSON.stringify(next)) {
        setUndoStack((u) => [...u.slice(-39), structuredClone(prev)]);
        setRedoStack([]);
      }
      return next;
    });
    setHasChanges(true);
  }, []);

  const replaceData = useCallback((next: ContentData) => {
    setData((prev) => {
      if (JSON.stringify(prev) !== JSON.stringify(next)) {
        setUndoStack((u) => [...u.slice(-39), structuredClone(prev)]);
        setRedoStack([]);
      }
      return next;
    });
    setHasChanges(true);
  }, []);

  const refreshPublicPromoState = useCallback(async () => {
    const cfg = await fetchMacfyiPublicConfig();
    setPromoLive(cfg ? buildPromoLiveFromConfig({ promo: cfg.promo, serverTimeIso: cfg.serverTimeIso }) : null);
  }, []);

  /** Setelah simpan `lifetime_price_idr` ke `app_settings` (admin landing). */
  const applyServerLifetimePrice = useCallback((idr: number) => {
    setData((prev) => applyLifetimePriceIdrToContent(prev, idr));
    setHasChanges(true);
    void refreshPublicPromoState();
  }, [refreshPublicPromoState]);

  const applyPromoSaveFromServer = useCallback(
    (p: { lifetime_price_idr: number; compare_at_idr: number | null }) => {
      setData((prev) => mergePricingFromServer(prev, p.lifetime_price_idr, p.compare_at_idr));
      setHasChanges(true);
      void refreshPublicPromoState();
    },
    [refreshPublicPromoState]
  );

  const undo = useCallback(() => {
    setUndoStack((u) => {
      if (u.length === 0) return u;
      const snap = u[u.length - 1];
      const rest = u.slice(0, -1);
      setRedoStack((r) => [...r.slice(-39), structuredClone(dataRef.current)]);
      setData(structuredClone(snap));
      setHasChanges(true);
      return rest;
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      const snap = r[r.length - 1];
      const rest = r.slice(0, -1);
      setUndoStack((u) => [...u.slice(-39), structuredClone(dataRef.current)]);
      setData(structuredClone(snap));
      setHasChanges(true);
      return rest;
    });
  }, []);

  const toggleFaq = useCallback(
    (i: number) => {
      setOpenFaqs((prev) => {
        const next = new Set(prev);
        if (data.settings.faqSingleOpen) {
          if (next.has(i)) return new Set<number>();
          return new Set([i]);
        }
        if (next.has(i)) next.delete(i);
        else next.add(i);
        return next;
      });
    },
    [data.settings.faqSingleOpen]
  );

  const saveToDraft = () => {
    localStorage.setItem('macfyi_data', JSON.stringify(data));
    setHasChanges(false);
    setLastSaved(new Date().toLocaleTimeString());
    toast('Draft disimpan di perangkat ini.', 'success');
  };

  const publish = async () => {
    const client = getSupabaseBrowserClient();
    if (client) {
      const { data: sess } = await client.auth.getSession();
      if (!sess.session?.user || !isSupabaseUserAdmin(sess.session.user)) {
        toast('Untuk menyimpan ke database, masuk dengan akun Supabase yang memiliki role admin.', 'error');
        return;
      }
      const { error } = await client.from('landing_site_content').upsert(
        { id: 'default', content: data, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );
      if (error) {
        toast(error.message, 'error');
        return;
      }
      localStorage.setItem('macfyi_data', JSON.stringify(data));
      setHasChanges(false);
      setLastSaved(new Date().toLocaleTimeString());
      setUndoStack([]);
      setRedoStack([]);
      toast('Konten dipublikasikan ke database.', 'success');
      return;
    }
    saveToDraft();
    toast(
      'Draft lokal tersimpan. Tambahkan VITE_SUPABASE_URL dan kunci anon, lalu masuk dengan akun admin Supabase untuk publikasi ke server.',
      'info'
    );
  };

  const openCheckout = useCallback((source?: string) => {
    const src = source ?? "unknown";
    firePixelStep(dataRef.current.settings, "checkout_nav", { source: src });
    queueSiteEvent("cta_click", { target: "checkout", source: src });
    queueSiteEvent("checkout_started", { source: src });
    navigate("/checkout");
  }, [navigate]);

  const openLoginModal = useCallback(() => setIsLoginOpen(true), []);

  const openMemberArea = useCallback(() => {
    const url = data.settings.loginUrl?.trim();
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    else toast('URL area anggota belum diatur di pengaturan.', 'info');
  }, [data.settings.loginUrl, toast]);

  /** Pintasan ke SPA admin (build terpisah di `/admin`); buka tab baru agar landing tetap terbuka. */
  const openAdminConsole = useCallback(() => {
    const origin = window.location.origin.replace(/\/$/, "");
    window.open(`${origin}/admin/`, "_blank", "noopener,noreferrer");
  }, []);

  const handleSignOut = useCallback(async () => {
    clearLegacyAdminSession();
    const c = getSupabaseBrowserClient();
    if (c) await c.auth.signOut();
    setLegacyAdmin(false);
    setSupabaseAdmin(false);
    setSupabaseLoggedIn(false);
    setAdminPreview(false);
    toast('Anda telah keluar.', 'info');
  }, [toast]);

  const onGearClick = () => {
    if (sessionOk) {
      setIsSettingsOpen(true);
      return;
    }
    if (isSupabaseBrowserConfigured() && supabaseLoggedIn) {
      openMemberArea();
      return;
    }
    setIsLoginOpen(true);
  };

  const openDemoModal = useCallback((source: string) => {
    firePixelStep(dataRef.current.settings, "open_demo_intent", { source });
    queueSiteEvent("cta_click", { target: "demo", source });
    setDemoModalSource(source);
    setDemoModalOpen(true);
  }, []);

  const dismissBanner = () => {
    sessionStorage.setItem('macfyi_banner_dismissed', '1');
    setBannerDismissed(true);
  };

  const bannerVisible = useMemo(
    () => data.settings.notificationBannerEnabled && !bannerDismissed,
    [data.settings.notificationBannerEnabled, bannerDismissed]
  );

  return (
    <div className="min-h-screen bg-[#070B14] text-white selection:bg-red-500/30 font-sans">
      <NotificationBanner
        visible={bannerVisible}
        text={data.settings.notificationBannerText}
        soundOnShow={data.settings.notificationSoundEnabled}
        soundOnDismiss={data.settings.notificationSoundEnabled}
        onDismiss={dismissBanner}
        accentColor={data.settings.primaryColor}
      />

      <SocialProofToast
        enabled={data.settings.socialProofToastEnabled}
        soundEnabled={data.settings.notificationSoundEnabled}
        accentColor={data.settings.primaryColor}
        names={data.settings.socialProofNames}
        actions={data.settings.socialProofActions}
        products={data.settings.socialProofProducts}
        times={data.settings.socialProofTimes}
        muteLabel={data.settings.socialProofMuteLabel}
        unmuteLabel={data.settings.socialProofUnmuteLabel}
      />

      {/* Admin Toolbar */}
      <AnimatePresence>
        {sessionOk && !adminPreview && (
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="fixed top-0 inset-x-0 z-[60] bg-black/90 border-b border-white/10 p-2 px-4 flex items-center justify-between backdrop-blur-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-amber-500/90" />
                <span className="text-white/60">
                  {isSupabaseBrowserConfigured()
                    ? 'Penyuntingan konten · publikasi ke database'
                    : 'Penyuntingan konten · draft lokal'}
                </span>
              </div>
              {leadWebhookActive && (
                <>
                  <div className="h-4 w-px bg-white/10" />
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-white/60">Webhook lead: aktif</span>
                  </div>
                </>
              )}
              <div className="h-4 w-px bg-white/10" />
              <div className="text-xs text-white/40">
                {hasChanges ? (
                  <span className="text-yellow-500">Unsaved changes</span>
                ) : (
                  <span>Last saved: {lastSaved || 'No changes yet'}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                type="button"
                onClick={openAdminConsole}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded text-sm transition"
                title="Buka Konsol Admin (tab baru)"
              >
                <LayoutDashboard size={14} />
                Konsol admin
              </button>
              <button
                type="button"
                onClick={undo}
                disabled={undoStack.length === 0}
                className="flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded text-sm transition disabled:opacity-30 disabled:pointer-events-none"
                title="Urungkan"
              >
                <Undo2 size={14} />
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={redoStack.length === 0}
                className="flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded text-sm transition disabled:opacity-30 disabled:pointer-events-none"
                title="Ulangi"
              >
                <Redo2 size={14} />
              </button>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded text-sm transition"
              >
                <Settings size={14} /> Settings
              </button>
              <button 
                onClick={saveToDraft}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded text-sm transition"
              >
                <Save size={14} /> Simpan draft
              </button>
              <button 
                type="button"
                onClick={() => void publish()}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-sm font-bold transition shadow-lg shadow-red-600/20"
              >
                <Send size={14} /> Publikasikan
              </button>
              <button 
                onClick={() => setAdminPreview(true)}
                className="ml-2 text-white/40 hover:text-white"
                title="Lihat tampilan publik"
              >
                <Eye size={18} />
              </button>
              <button 
                type="button"
                onClick={() => void handleSignOut()}
                className="ml-2 text-xs text-white/50 hover:text-white px-2 py-1 rounded border border-white/15"
              >
                Keluar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className={`sticky top-0 z-50 bg-[#070B14]/80 backdrop-blur-md border-b border-white/10 transition-all ${sessionOk && !adminPreview ? 'mt-[49px]' : ''}`}>
        <div className="container mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {data.settings.brandLogoUrl ? (
              <img src={data.settings.brandLogoUrl} alt="" className="w-8 h-8 rounded-lg object-contain bg-white/5" />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg italic text-white"
                style={{ backgroundColor: data.settings.primaryColor }}
              >
                {(data.settings.siteName || 'M').slice(0, 1)}
              </div>
            )}
            <EditableText 
              value={data.hero.title} 
              onSave={(v) => updateData('hero.title', v)} 
              isAdmin={canEdit} 
              className="font-bold text-xl tracking-tight" 
            />
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
            <a href="#features" className="hover:text-red-500 transition">Features</a>
            <a href="#pricing" className="hover:text-red-500 transition">Pricing</a>
            <a href="#lead" className="hover:text-red-500 transition">Kontak</a>
            <a href="#faq" className="hover:text-red-500 transition">FAQ</a>
          </nav>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {(() => {
              const supabaseOn = isSupabaseBrowserConfigured();
              const loggedIn = legacyAdmin || (supabaseOn && supabaseLoggedIn);
              const headerAuthBtn =
                'text-xs font-medium text-white/70 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 transition';
              if (loggedIn && sessionOk) {
                return (
                  <>
                    <button
                      type="button"
                      onClick={openAdminConsole}
                      className={headerAuthBtn}
                      title="Buka Konsol Admin (tab baru)"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <LayoutDashboard size={14} className="opacity-80" />
                        Konsol admin
                      </span>
                    </button>
                    <button type="button" onClick={() => setIsSettingsOpen(true)} className={headerAuthBtn}>
                      Admin
                    </button>
                    <button type="button" onClick={openMemberArea} className={headerAuthBtn}>
                      Member
                    </button>
                    <button type="button" onClick={() => void handleSignOut()} className={headerAuthBtn}>
                      Keluar
                    </button>
                  </>
                );
              }
              if (loggedIn) {
                return (
                  <>
                    <button type="button" onClick={openMemberArea} className={headerAuthBtn}>
                      Member
                    </button>
                    <button type="button" onClick={() => void handleSignOut()} className={headerAuthBtn}>
                      Keluar
                    </button>
                  </>
                );
              }
              return (
                <button type="button" onClick={openLoginModal} className={headerAuthBtn}>
                  Masuk
                </button>
              );
            })()}
            <button
              type="button"
              onClick={() => openDemoModal("header_demo")}
              className="text-white px-5 py-2 rounded-full text-sm font-bold transition shadow-lg"
              style={{ backgroundColor: data.settings.primaryColor, boxShadow: `0 10px 40px ${data.settings.primaryColor}33` }}
            >
              <EditableText value={data.hero.primaryCTA} onSave={(v) => updateData('hero.primaryCTA', v)} isAdmin={canEdit} />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section — vertikal ~75% vs layout sebelumnya */}
      <section className="relative pt-[3.75rem] pb-24 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-full bg-gradient-radial from-red-600/10 to-transparent pointer-events-none" />
        
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <EditableText 
              as="h1"
              value={data.hero.headline} 
              onSave={(v) => updateData('hero.headline', v)} 
              isAdmin={canEdit} 
              multiline
              className="text-4xl md:text-6xl font-black mb-4 max-w-4xl mx-auto leading-tight" 
            />
            <EditableText 
              as="p"
              value={data.hero.subheadline} 
              onSave={(v) => updateData('hero.subheadline', v)} 
              isAdmin={canEdit} 
              multiline
              className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-7" 
            />

            <StorageImpactAnimation />

            <div className="flex flex-wrap justify-center gap-2 text-[11px] md:text-xs font-bold text-white/40">
              {data.hero.features.map((feat, i) => (
                <React.Fragment key={i}>
                  <EditableText value={feat} onSave={(v) => {
                    const newFeats = [...data.hero.features];
                    newFeats[i] = v;
                    updateData('hero.features', newFeats);
                  }} isAdmin={canEdit} />
                  {i < data.hero.features.length - 1 && <span>|</span>}
                </React.Fragment>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-3 mt-10">
              <button
                type="button"
                onClick={() => openDemoModal("hero_primary")}
                className="text-white px-8 py-3 rounded-full text-sm font-bold transition shadow-lg"
                style={{ backgroundColor: data.settings.primaryColor, boxShadow: `0 10px 40px ${data.settings.primaryColor}33` }}
              >
                <EditableText value={data.hero.primaryCTA} onSave={(v) => updateData('hero.primaryCTA', v)} isAdmin={canEdit} />
              </button>
              <button
                type="button"
                onClick={() => openCheckout("hero_secondary")}
                className="px-8 py-3 rounded-full text-sm font-bold border border-white/20 text-white/90 hover:bg-white/5 transition"
              >
                <EditableText value={data.hero.secondaryCTA} onSave={(v) => updateData('hero.secondaryCTA', v)} isAdmin={canEdit} />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-[4.5rem] bg-white/[0.02]">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <EditableText 
            as="h2"
            value={data.problem.heading} 
            onSave={(v) => updateData('problem.heading', v)} 
            isAdmin={canEdit} 
            className="text-red-500 font-bold mb-6 text-xl tracking-widest uppercase" 
          />
          <EditableText 
            as="p"
            value={data.problem.p1} 
            onSave={(v) => updateData('problem.p1', v)} 
            isAdmin={canEdit} 
            multiline
            className="text-2xl md:text-3xl font-medium mb-9 text-white/80" 
          />
          
          <div className="relative py-9 px-6 mb-9 border-y border-white/10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#070B14] px-4 text-white/20">
              <Zap size={32} />
            </div>
            <EditableText 
              as="h3"
              value={data.problem.highlight} 
              onSave={(v) => updateData('problem.highlight', v)} 
              isAdmin={canEdit} 
              className="text-4xl md:text-5xl font-black italic text-white" 
            />
          </div>

          <EditableText 
            as="p"
            value={data.problem.p3} 
            onSave={(v) => updateData('problem.p3', v)} 
            isAdmin={canEdit} 
            multiline
            className="text-xl text-white/50" 
          />
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-[4.5rem]">
        <div className="container mx-auto px-4 text-center">
          <EditableText 
            as="p"
            value={data.solution.preHeading} 
            onSave={(v) => updateData('solution.preHeading', v)} 
            isAdmin={canEdit} 
            className="text-white/40 mb-4" 
          />
          <EditableText 
            as="h2"
            value={data.solution.heading} 
            onSave={(v) => updateData('solution.heading', v)} 
            isAdmin={canEdit} 
            multiline
            className="text-3xl md:text-5xl font-bold mb-12 max-w-4xl mx-auto" 
          />
          
          <div className="grid md:grid-cols-2 gap-8 text-left max-w-5xl mx-auto mb-20">
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
              <EditableText 
                as="p"
                value={data.solution.p1} 
                onSave={(v) => updateData('solution.p1', v)} 
                isAdmin={canEdit} 
                multiline
                className="text-lg text-white/60 leading-relaxed" 
              />
            </div>
            <div className="p-8 rounded-3xl bg-red-600/10 border border-red-600/20">
              <EditableText 
                as="p"
                value={data.solution.p2} 
                onSave={(v) => updateData('solution.p2', v)} 
                isAdmin={canEdit} 
                multiline
                className="text-lg text-white leading-relaxed font-medium" 
              />
            </div>
          </div>

          <div className="flex flex-col items-center">
            <EditableText
              value={data.solution.closerLabel}
              onSave={(v) => updateData("solution.closerLabel", v)}
              isAdmin={canEdit}
              className="text-sm font-bold tracking-widest uppercase text-white/20 mb-12 block"
            />
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="text-7xl md:text-9xl font-black text-red-600 italic tracking-tighter"
            >
              Macfyi
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features List */}
      <section id="features" className="py-24 bg-white/[0.02]">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-16 text-center">5 Fitur Utama</h2>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {data.featuresList.map((feat, i) => (
              <motion.div 
                key={feat.id}
                whileHover={{ y: -5 }}
                className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-red-500/50 transition-colors"
              >
                <div className="w-12 h-12 bg-red-600/20 rounded-2xl flex items-center justify-center text-red-500 mb-6">
                  <IconComponent name={feat.icon} />
                </div>
                <EditableText 
                  as="h3"
                  value={feat.title} 
                  onSave={(v) => {
                    const newList = [...data.featuresList];
                    newList[i].title = v;
                    updateData('featuresList', newList);
                  }} 
                  isAdmin={canEdit} 
                  className="font-bold mb-3 block" 
                />
                <EditableText 
                  as="p"
                  value={feat.desc} 
                  onSave={(v) => {
                    const newList = [...data.featuresList];
                    newList[i].desc = v;
                    updateData('featuresList', newList);
                  }} 
                  isAdmin={canEdit} 
                  className="text-sm text-white/60" 
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Details Sections */}
      <section id="details" className="py-24 space-y-32">
        {data.details.map((detail, i) => (
          <div key={detail.id} className="container mx-auto px-4">
            <div
              className={`flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-16 items-center`}
            >
              <div className="flex-1 w-full">
                <EditableText 
                  as="h3"
                  value={detail.title} 
                  onSave={(v) => {
                    const newDetails = [...data.details];
                    newDetails[i].title = v;
                    updateData('details', newDetails);
                  }} 
                  isAdmin={canEdit} 
                  className="text-2xl md:text-3xl font-bold mb-6 block" 
                />
                <EditableText 
                  as="p"
                  value={detail.p1} 
                  onSave={(v) => {
                    const newDetails = [...data.details];
                    newDetails[i].p1 = v;
                    updateData('details', newDetails);
                  }} 
                  isAdmin={canEdit} 
                  className="text-lg text-white/60 mb-8 block" 
                />
                <ul className="space-y-4">
                  {detail.bullets.map((bullet, j) => (
                    <li key={j} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-red-600/20 flex items-center justify-center text-red-500 shrink-0">
                        <Check size={12} />
                      </div>
                      <EditableText 
                        value={bullet} 
                        onSave={(v) => {
                          const newDetails = [...data.details];
                          newDetails[i].bullets[j] = v;
                          updateData('details', newDetails);
                        }} 
                        isAdmin={canEdit} 
                        className="text-white/80" 
                      />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-red-600/20 to-transparent rounded-3xl blur opacity-25" />
                  <div className="relative rounded-2xl bg-white/5 border border-white/10 overflow-hidden shadow-2xl">
                    <EditableImage 
                      src={detail.image} 
                      alt={detail.title} 
                      onSave={(v) => {
                        const newDetails = [...data.details];
                        newDetails[i].image = v;
                        updateData('details', newDetails);
                      }} 
                      isAdmin={canEdit} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white/[0.02]">
        <div className="container mx-auto px-4 text-center">
          <EditableText 
            as="h2"
            value={data.steps.title} 
            onSave={(v) => updateData('steps.title', v)} 
            isAdmin={canEdit} 
            className="text-2xl font-bold mb-2 block" 
          />
          <EditableText 
            as="p"
            value={data.steps.subtitle} 
            onSave={(v) => updateData('steps.subtitle', v)} 
            isAdmin={canEdit} 
            className="text-4xl md:text-5xl font-black mb-16 block text-red-600 italic" 
          />

          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {data.steps.items.map((item, i) => (
              <div key={i} className="relative">
                <div className={`w-20 h-20 ${item.color} rounded-3xl flex items-center justify-center text-white font-black text-3xl mx-auto mb-8 shadow-xl`}>
                  {item.step}
                </div>
                <EditableText 
                  as="h3"
                  value={item.label} 
                  onSave={(v) => {
                    const newItems = [...data.steps.items];
                    newItems[i].label = v;
                    updateData('steps.items', newItems);
                  }} 
                  isAdmin={canEdit} 
                  className="text-xl font-bold mb-4 block" 
                />
                <EditableText 
                  as="p"
                  value={item.desc} 
                  onSave={(v) => {
                    const newItems = [...data.steps.items];
                    newItems[i].desc = v;
                    updateData('steps.items', newItems);
                  }} 
                  isAdmin={canEdit} 
                  className="text-white/60" 
                />
                {i < data.steps.items.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[70%] w-full h-[2px] border-t-2 border-dashed border-white/10 -z-10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <ScarcityBand
        scarcity={data.scarcity}
        canEdit={canEdit}
        updateData={updateData}
        promoCountdown={promoLive?.countdown ?? null}
        promoSlotsDisplay={promoLive?.slotsDisplay ?? null}
        onScrollToPricing={() => {
          firePixelStep(dataRef.current.settings, "scarcity_scroll_to_pricing", {});
          queueSiteEvent("cta_click", { target: "scarcity_scroll_pricing" });
        }}
      />

      {/* Pricing: kiri demo gratis, kanan lifetime (harga dari admin / app_settings → public-config) */}
      <section id="pricing" className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-white/[0.06] to-black/30 overflow-hidden shadow-2xl">
            <div className="px-6 py-8 md:px-10 md:py-10 border-b border-white/10">
              <EditableText
                as="h2"
                value={data.pricing.title}
                onSave={(v) => updateData("pricing.title", v)}
                isAdmin={canEdit}
                className="text-2xl md:text-3xl font-bold text-center block text-white"
              />
              <p className="text-center text-white/45 text-sm mt-2 max-w-2xl mx-auto">
                Harga berbayar mengikuti angka di database (sama dengan halaman checkout — Midtrans Snap atau Lynk.id sesuai gateway di server — dan tampilan di app). Atur di Pengaturan → Global &amp; merek.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/10">
              {/* Kolom kiri — demo gratis */}
              <div className="p-8 md:p-10 flex flex-col bg-slate-900/40">
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400/90 mb-2">Gratis</span>
                <EditableText
                  as="h3"
                  value={data.pricing.freeTitle}
                  onSave={(v) => updateData("pricing.freeTitle", v)}
                  isAdmin={canEdit}
                  className="text-xl font-bold text-white mb-2 block"
                />
                <EditableText
                  as="p"
                  value={data.pricing.freeSubtitle}
                  onSave={(v) => updateData("pricing.freeSubtitle", v)}
                  isAdmin={canEdit}
                  className="text-sm text-white/55 mb-6 block"
                />
                <ul className="space-y-3 mb-8 flex-1">
                  {data.pricing.freeBullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-white/80">
                      <Check className="text-sky-400 shrink-0 mt-0.5" size={18} />
                      <EditableText
                        value={bullet}
                        onSave={(v) => {
                          const next = [...data.pricing.freeBullets];
                          next[i] = v;
                          updateData("pricing.freeBullets", next);
                        }}
                        isAdmin={canEdit}
                      />
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => openDemoModal("pricing_free")}
                  className="w-full bg-sky-600/90 hover:bg-sky-500 text-white py-3.5 rounded-2xl text-base font-bold transition flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  <EditableText
                    value={data.pricing.freeCta}
                    onSave={(v) => updateData("pricing.freeCta", v)}
                    isAdmin={canEdit}
                  />
                </button>
              </div>
              {/* Kolom kanan — berbayar */}
              <div className="p-8 md:p-10 flex flex-col bg-gradient-to-br from-emerald-950/50 to-emerald-900/20">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/95 mb-2">Berbayar</span>
                <EditableText
                  as="h3"
                  value={data.pricing.paidTitle}
                  onSave={(v) => updateData("pricing.paidTitle", v)}
                  isAdmin={canEdit}
                  className="text-xl font-bold text-white mb-2 block"
                />
                <EditableText
                  as="div"
                  value={data.pricing.compareAtPrice}
                  onSave={(v) => updateData("pricing.compareAtPrice", v)}
                  isAdmin={canEdit}
                  className="text-sm md:text-base font-semibold text-red-400 line-through decoration-red-500 decoration-2 mb-2 block"
                />
                <EditableText
                  as="div"
                  value={data.pricing.price}
                  onSave={(v) => updateData("pricing.price", v)}
                  isAdmin={canEdit}
                  className="text-4xl md:text-5xl font-black text-white mb-1 block"
                />
                <EditableText
                  as="p"
                  value={data.pricing.label}
                  onSave={(v) => updateData("pricing.label", v)}
                  isAdmin={canEdit}
                  className="text-emerald-300/90 font-semibold tracking-wide uppercase text-xs mb-6 block"
                />
                <ul className="space-y-3 mb-8 flex-1">
                  {data.pricing.bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-white/85">
                      <Check className="text-emerald-400 shrink-0 mt-0.5" size={18} />
                      <EditableText
                        value={bullet}
                        onSave={(v) => {
                          const newBullets = [...data.pricing.bullets];
                          newBullets[i] = v;
                          updateData("pricing.bullets", newBullets);
                        }}
                        isAdmin={canEdit}
                      />
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => openCheckout("pricing_paid")}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-2xl text-base font-bold transition shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 group"
                >
                  <EditableText value={data.pricing.cta} onSave={(v) => updateData("pricing.cta", v)} isAdmin={canEdit} />
                  <Zap className="group-hover:scale-110 transition" size={18} fill="currentColor" />
                </button>
              </div>
            </div>
            <div className="px-6 py-5 md:px-10 flex flex-col sm:flex-row items-center justify-center gap-4 bg-black/35 border-t border-white/10">
              <Cloud className="text-emerald-500/80 hidden sm:block" size={40} />
              <div className="flex items-center gap-3 text-center sm:text-left">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                  <ShieldCheck className="text-emerald-500" size={20} />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">Pembayaran aman</div>
                  <div className="text-xs text-white/40">Checkout (Midtrans atau Lynk.id) mengikuti harga di server.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Stack */}
      <section className="py-24 bg-white/[0.02]">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <EditableText 
            as="h2"
            value={data.valueStack.title} 
            onSave={(v) => updateData('valueStack.title', v)} 
            isAdmin={canEdit} 
            className="text-3xl font-bold mb-12 block" 
          />
          <div className="grid md:grid-cols-2 gap-4 mb-12">
            {data.valueStack.items.map((item, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4 text-left">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 shrink-0">
                  <Check size={20} />
                </div>
                <EditableText 
                  value={item} 
                  onSave={(v) => {
                    const newItems = [...data.valueStack.items];
                    newItems[i] = v;
                    updateData('valueStack.items', newItems);
                  }} 
                  isAdmin={canEdit} 
                  className="font-medium" 
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => openCheckout("value_stack")}
            className="text-red-500 font-bold flex items-center gap-2 mx-auto hover:underline"
          >
            <EditableText value={data.valueStack.cta} onSave={(v) => updateData('valueStack.cta', v)} isAdmin={canEdit} />
            <Zap size={16} fill="currentColor" />
          </button>
        </div>
      </section>

      {/* Urgency Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <EditableText 
            as="h2"
            value={data.urgency.title} 
            onSave={(v) => updateData('urgency.title', v)} 
            isAdmin={canEdit} 
            className="text-3xl font-bold mb-8 block text-red-500" 
          />
          <EditableText 
            as="p"
            value={data.urgency.p1} 
            onSave={(v) => updateData('urgency.p1', v)} 
            isAdmin={canEdit} 
            className="text-lg text-white/60 mb-8 block" 
          />
          <div className="space-y-4 mb-12">
            {data.urgency.bullets.map((bullet, i) => (
              <div key={i} className="flex items-center gap-4 justify-center">
                <AlertTriangle className="text-red-600" size={20} />
                <EditableText 
                  value={bullet} 
                  onSave={(v) => {
                    const newBullets = [...data.urgency.bullets];
                    newBullets[i] = v;
                    updateData('urgency.bullets', newBullets);
                  }} 
                  isAdmin={canEdit} 
                  className="text-lg font-medium text-white/80" 
                />
              </div>
            ))}
          </div>
          <button 
            type="button"
            onClick={() => openCheckout("urgency")}
            className="bg-white text-black hover:bg-white/90 px-8 py-4 rounded-2xl text-xl font-black transition"
          >
            <EditableText value={data.urgency.cta} onSave={(v) => updateData('urgency.cta', v)} isAdmin={canEdit} />
          </button>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 bg-white/[0.02]">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <EditableText 
                as="h2"
                value={data.trust.title} 
                onSave={(v) => updateData('trust.title', v)} 
                isAdmin={canEdit} 
                className="text-3xl font-bold mb-8 block" 
              />
              <div className="space-y-6">
                {data.trust.bullets.map((bullet, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white shrink-0 mt-1">
                      <Check size={14} />
                    </div>
                    <EditableText 
                      value={bullet} 
                      onSave={(v) => {
                        const newBullets = [...data.trust.bullets];
                        newBullets[i] = v;
                        updateData('trust.bullets', newBullets);
                      }} 
                      isAdmin={canEdit} 
                      className="text-white/70" 
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8 rounded-3xl bg-black/40 border border-white/10 flex flex-col items-center justify-center text-center">
              <ShieldCheck size={80} className="text-red-600 mb-6" />
              <div className="text-2xl font-black mb-2 tracking-widest uppercase">100% Secure</div>
              <div className="text-white/40 text-sm">Macfyi is built with security and privacy as our top priority.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <EditableText 
            as="h2"
            value={data.comparison.title} 
            onSave={(v) => updateData('comparison.title', v)} 
            isAdmin={canEdit} 
            className="text-3xl font-bold mb-16 text-center block" 
          />
          <div className="overflow-x-auto">
            <table className="w-full max-w-5xl mx-auto">
              <thead>
                <tr>
                  {data.comparison.headers.map((header, i) => (
                    <th key={i} className={`p-6 text-left border-b border-white/10 ${i === 3 ? 'text-red-500' : 'text-white/40'}`}>
                      <EditableText 
                        value={header} 
                        onSave={(v) => {
                          const newHeaders = [...data.comparison.headers];
                          newHeaders[i] = v;
                          updateData('comparison.headers', newHeaders);
                        }} 
                        isAdmin={canEdit} 
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.comparison.rows.map((row, i) => (
                  <tr key={i}>
                    <td className="p-6 border-b border-white/5 font-medium">
                      <EditableText 
                        value={row.label} 
                        onSave={(v) => {
                          const newRows = [...data.comparison.rows];
                          newRows[i].label = v;
                          updateData('comparison.rows', newRows);
                        }} 
                        isAdmin={canEdit} 
                      />
                    </td>
                    {row.values.map((val, j) => (
                      <td key={j} className={`p-6 border-b border-white/5 ${j === 2 ? 'bg-red-600/5' : ''}`}>
                        {typeof val === 'boolean' ? (
                          val ? <Check className="text-green-500" /> : <X className="text-red-500" />
                        ) : (
                          <EditableText 
                            value={val} 
                            onSave={(v) => {
                              const newRows = [...data.comparison.rows];
                              newRows[i].values[j] = v;
                              updateData('comparison.rows', newRows);
                            }} 
                            isAdmin={canEdit} 
                            className="text-sm"
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-12 text-center p-6 bg-red-600/10 rounded-2xl max-w-xl mx-auto border border-red-600/20">
            <EditableText 
              value={data.comparison.conclusion} 
              onSave={(v) => updateData('comparison.conclusion', v)} 
              isAdmin={canEdit} 
              className="text-xl font-bold italic" 
            />
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-24 bg-white/[0.02]">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-16">Lihat Macfyi Bekerja</h2>
          <div className="max-w-4xl mx-auto rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <EditableVideo 
              url={data.settings.videoUrl} 
              onSave={(v) => updateData('settings.videoUrl', v)} 
              isAdmin={canEdit} 
            />
          </div>
          <div className="mt-16">
            <button 
              type="button"
              onClick={() => openCheckout("demo_video_section")}
              className="bg-red-600 hover:bg-red-700 text-white px-10 py-5 rounded-full text-2xl font-black transition shadow-xl shadow-red-600/20"
            >
              Saya Mau!
            </button>
          </div>
        </div>
      </section>

      {/* Final Push */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-red-600/10 opacity-50" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-black mb-8">Storage lega. Kerja lancar.<br/>Tanpa bingung lagi.</h2>
          <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">Saat storage mentok, Anda tidak perlu panik atau nebak-nebak.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <button 
              type="button"
              onClick={() => openCheckout("final_push_checkout")}
              className="bg-red-600 hover:bg-red-700 text-white px-10 py-5 rounded-2xl text-2xl font-black transition shadow-xl shadow-red-600/20"
            >
              <EditableText value={data.pricing.cta} onSave={(v) => updateData('pricing.cta', v)} isAdmin={canEdit} />
            </button>
            <button 
              type="button"
              onClick={openLoginModal}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-10 py-5 rounded-2xl text-2xl font-black transition"
            >
              Login
            </button>
          </div>
        </div>
      </section>

      <LeadCaptureForm settings={data.settings} toast={toast} />

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-white/[0.02]">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl font-bold mb-16 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {data.faq.map((item, i) => (
              <FaqItem 
                key={i} 
                item={item} 
                isAdmin={canEdit} 
                isOpen={openFaqs.has(i)}
                onToggle={() => toggleFaq(i)}
                onSave={(field, val) => {
                  const newFaq = [...data.faq];
                  newFaq[i][field] = val;
                  updateData('faq', newFaq);
                }} 
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-[3.75rem] border-t border-white/10 bg-[#070B14]">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center font-bold italic">M</div>
                <span className="font-bold text-xl tracking-tight">Macfyi</span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed mb-6">Dibuat khusus untuk pemilik Mac yang ingin lega, tapi ragu. Kami memberi Anda peta penyimpanan yang jelas.</p>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-white/60 text-xs tracking-widest uppercase">Contact</h4>
              <div className="space-y-4 text-sm text-white/40">
                <div className="flex items-center gap-3">
                  <Monitor size={14} className="text-red-600" />
                  <EditableText value={data.footer.address} onSave={(v) => updateData('footer.address', v)} isAdmin={canEdit} />
                </div>
                <div className="flex items-center gap-3">
                  <Mail size={14} className="text-red-600" />
                  <EditableText value={data.footer.contact} onSave={(v) => updateData('footer.contact', v)} isAdmin={canEdit} />
                </div>
                <div className="flex items-center gap-3">
                  <Zap size={14} className="text-red-600" />
                  <EditableText value={data.footer.hours} onSave={(v) => updateData('footer.hours', v)} isAdmin={canEdit} />
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-white/60 text-xs tracking-widest uppercase">Legal</h4>
              <ul className="space-y-4 text-sm text-white/40">
                {data.footer.links.map((link, i) => (
                  <li key={i}>
                    <SmartFooterLink href={link.url} className="hover:text-red-500 transition">
                      <EditableText
                        value={link.label}
                        onSave={(v) => {
                          const newLinks = [...data.footer.links];
                          newLinks[i].label = v;
                          updateData("footer.links", newLinks);
                        }}
                        isAdmin={canEdit}
                      />
                    </SmartFooterLink>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-white/60 text-xs tracking-widest uppercase">Product</h4>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="text-2xl font-black mb-1 text-red-500">{data.settings.price}</div>
                <div className="text-xs text-white/40 mb-4">Lifetime 1 Mac Device</div>
                <button 
                  type="button"
                  onClick={() => openCheckout("footer_buy_now")}
                  className="w-full bg-red-600 hover:bg-red-700 py-2 rounded-xl text-xs font-bold transition"
                >
                  Buy Now
                </button>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/20">
            <EditableText value={data.footer.copyright} onSave={(v) => updateData('footer.copyright', v)} isAdmin={canEdit} />
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              {data.settings.socialProofToastEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    toggleSocialProofMuteFromOutside();
                    setSocialMuteUi(getSocialProofMuted());
                  }}
                  className="text-white/35 hover:text-white/70 transition"
                >
                  Notif demo: {socialMuteUi ? 'suara mati' : 'suara hidup'}
                </button>
              )}
              <SmartFooterLink href={data.settings.privacyPolicyUrl} className="hover:text-red-400 transition">
                Privacy Policy
              </SmartFooterLink>
              <SmartFooterLink href={data.settings.termsUrl} className="hover:text-red-400 transition">
                Terms of Service
              </SmartFooterLink>
            </div>
          </div>
        </div>
      </footer>

      {/* Gear: login atau pengaturan */}
      <button 
        type="button"
        onClick={onGearClick}
        title={
          sessionOk
            ? 'Pengaturan'
            : isSupabaseBrowserConfigured() && supabaseLoggedIn
              ? 'Buka aplikasi (Member)'
              : 'Masuk'
        }
        className="fixed bottom-6 left-6 z-[70] w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition group shadow-lg"
      >
        <Settings className="group-hover:rotate-90 transition-transform duration-500" size={20} />
      </button>

      <AnimatePresence>
        {sessionOk && adminPreview && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={() => setAdminPreview(false)}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[75] px-5 py-2.5 rounded-full bg-red-600 text-white text-sm font-bold shadow-xl"
          >
            Kembali ke penyuntingan
          </motion.button>
        )}
      </AnimatePresence>

      <DemoRequestModal
        open={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        toast={toast}
        settings={data.settings}
        demoSource={demoModalSource}
      />

      <AdminLoginModal
        open={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={({ role }) => {
          if (!isSupabaseBrowserConfigured()) {
            setLegacyAdmin(isValidLegacyAdminSession());
          }
          setAdminPreview(false);
          if (role === 'admin') {
            toast('Anda dapat menyunting konten halaman.', 'success');
          } else {
            toast('Selamat datang. Buka Member untuk masuk ke aplikasi.', 'success');
          }
        }}
      />
      {isSettingsOpen && (
        <AdminSettingsModal
          open={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          data={data}
          baselineData={INITIAL_DATA}
          patchSettings={patchSettings}
          replaceData={replaceData}
          toast={toast}
          onTestToast={() => toast('Notifikasi toast (kanan bawah).', 'success')}
          onApplyServerLifetimePrice={applyServerLifetimePrice}
          onAfterPromoSave={applyPromoSaveFromServer}
        />
      )}
    </div>
  );
}

function FaqItem({
  item,
  isAdmin,
  isOpen,
  onToggle,
  onSave,
}: {
  item: { q: string; a: string };
  isAdmin: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onSave: (field: 'q' | 'a', val: string) => void;
}) {
  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#0B1220]">
      <button 
        type="button"
        onClick={onToggle}
        className="w-full p-6 flex items-center justify-between text-left hover:bg-white/5 transition"
      >
        <EditableText 
          value={item.q} 
          onSave={(v) => onSave('q', v)} 
          isAdmin={isAdmin} 
          className="font-bold text-lg pr-8"
        />
        {isOpen ? <ChevronUp className="text-red-500 shrink-0" /> : <ChevronDown className="text-white/20 shrink-0" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-0 border-t border-white/5 text-white/60 leading-relaxed">
              <EditableText 
                value={item.a} 
                onSave={(v) => onSave('a', v)} 
                isAdmin={isAdmin} 
                multiline
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
