export interface SiteSettings {
  primaryColor: string;
  secondaryColor: string;
  /** Harga lifetime (IDR) — sumber kebenaran bersama app & gateway pembayaran (Midtrans / Lynk.id) via `app_settings` / public-config */
  lifetime_price_idr: number;
  /** Label tampilan (disinkron dari lifetime_price_idr; boleh diedit manual lalu disimpan ke draft) */
  price: string;
  checkoutUrl: string;
  /**
   * Lynk “hosted link”: jika gateway server = Lynk dan URL ini valid (`https://…`), pengunjung
   * diarahkan ke sini dengan query `email`, `name`, `phone` — tanpa Edge `create-lynk-checkout`.
   * Untuk harga & order server, kosongkan dan set secret `LYNK_*` di Supabase.
   */
  checkoutLynkStaticUrl: string;
  loginUrl: string;
  videoUrl: string;
  siteName: string;
  brandLogoUrl: string;
  contactEmail: string;
  whatsapp: string;
  instagramUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  seoTitle: string;
  seoDescription: string;
  ogImageUrl: string;
  facebookPixelId: string;
  googleAnalyticsId: string;
  /** TikTok Pixel ID (Events API / Web). */
  tiktokPixelId: string;
  /** Jika false, event interaksi tidak dikirim ke pixel ini (PageView/init script tetap jika ID ada). */
  pixelSendMeta: boolean;
  pixelSendGa: boolean;
  pixelSendTiktok: boolean;
  /**
   * Meta (Facebook) standard event per step.
   * Kosong / "none" berarti tidak mengirim standard event untuk step tsb (custom `macfyi_*` tetap bisa jalan).
   */
  metaEventOnPageOpen: string;
  /** Klik menuju demo (header / hero / pricing kolom kiri) sebelum modal tampil. */
  metaEventOnOpenDemoIntent: string;
  /** Scroll scarcity → blok harga. */
  metaEventOnScarcityScrollToPricing: string;
  metaEventOnPricingCta: string;
  metaEventOnDemoModalOpen: string;
  metaEventOnDemoSubmit: string;
  metaEventOnDemoDownloadReady: string;
  metaEventOnLeadFormVisible: string;
  metaEventOnLeadFormSubmit: string;
  metaEventOnCheckoutNav: string;
  /** Halaman /checkout dimuat. */
  metaEventOnCheckoutRouteView: string;
  metaEventOnCheckoutFormVisible: string;
  metaEventOnCheckoutFormSubmit: string;
  metaEventOnSnapOpened: string;
  metaEventOnLynkRedirect: string;
  metaEventOnPurchaseCompleted: string;
  faqSingleOpen: boolean;
  privacyPolicyUrl: string;
  termsUrl: string;
  notificationBannerEnabled: boolean;
  notificationBannerText: string;
  notificationSoundEnabled: boolean;
  /** Toast social proof kanan bawah (interval acak 25–45 dtk) */
  socialProofToastEnabled: boolean;
  /** Daftar kandidat untuk toast social proof (1 item per baris). */
  socialProofNames: string;
  socialProofActions: string;
  socialProofProducts: string;
  socialProofTimes: string;
  /** Label tombol mute/unmute pada toast social proof. */
  socialProofMuteLabel: string;
  socialProofUnmuteLabel: string;
  /** Catatan migrasi / HTML dari WordPress (referensi editor). */
  landingNotesHtml: string;
  waCategories: string[];
  waTemplates: { id: string; category: string; body: string }[];
  /** Teks modal checkout (override; kosongkan untuk fallback bawaan). */
  checkoutModalTitle: string;
  /** Subjudul di bawah judul; kosong = pakai label produk dari halaman. */
  checkoutProductSubtitle: string;
  checkoutTotalLabel: string;
  checkoutLicenseNote: string;
  checkoutNameLabel: string;
  checkoutNamePlaceholder: string;
  checkoutEmailLabel: string;
  checkoutEmailPlaceholder: string;
  checkoutPhoneLabel: string;
  checkoutPhonePlaceholder: string;
  checkoutAgreePrefix: string;
  checkoutTermsLinkLabel: string;
  checkoutPrivacyLinkLabel: string;
  checkoutSubmitLoading: string;
  checkoutCtaMidtrans: string;
  checkoutCtaLynk: string;
  checkoutCtaExternal: string;
  checkoutCtaConfirm: string;
  checkoutFooterSnap: string;
  checkoutFooterLynk: string;
  checkoutFooterNoGateway: string;
}

export interface ContentData {
  hero: {
    title: string;
    headline: string;
    subheadline: string;
    features: string[];
    primaryCTA: string;
    secondaryCTA: string;
  };
  problem: {
    heading: string;
    p1: string;
    p2: string;
    highlight: string;
    p3: string;
  };
  solution: {
    preHeading: string;
    heading: string;
    p1: string;
    p2: string;
    closerLabel: string;
  };
  featuresList: {
    id: number;
    title: string;
    desc: string;
    icon: string;
  }[];
  details: {
    id: number;
    title: string;
    p1: string;
    bullets: string[];
    image: string;
  }[];
  steps: {
    title: string;
    subtitle: string;
    items: { step: string; label: string; desc: string; color: string }[];
  };
  pricing: {
    /** Judul blok pricing (dua kolom) */
    title: string;
    freeTitle: string;
    freeSubtitle: string;
    freeBullets: string[];
    freeCta: string;
    paidTitle: string;
    /** Harga dicoret kecil (promo), mis. Rp 299.000 */
    compareAtPrice: string;
    price: string;
    label: string;
    bullets: string[];
    cta: string;
  };
  /** Blok scarcity / FOMO di atas #pricing */
  scarcity: {
    headline1: string;
    headline2: string;
    badge: string;
    slotsDash: string;
    slotsLabel: string;
    slotsCount: string;
    slotsDashAfter: string;
    hargaNormalLabel: string;
    strikeLargest: string;
    strikeMedium: string;
    strikeSmall: string;
    exclusiveLine: string;
    /** Menit countdown per pengunjung (disimpan deadline di localStorage) */
    visitorCountdownMinutes: number;
    /** Jika diisi dan valid ISO, dipakai menggantikan countdown per pengunjung */
    countdownEndIso: string;
  };
  valueStack: {
    title: string;
    items: string[];
    cta: string;
  };
  urgency: {
    title: string;
    p1: string;
    bullets: string[];
    cta: string;
  };
  trust: {
    title: string;
    bullets: string[];
  };
  comparison: {
    title: string;
    headers: string[];
    rows: { label: string; values: (string | boolean)[] }[];
    conclusion: string;
  };
  faq: {
    q: string;
    a: string;
  }[];
  footer: {
    address: string;
    contact: string;
    hours: string;
    links: { label: string; url: string }[];
    copyright: string;
  };
  /** Halaman /terms dan /privacy (HTML dari admin terpercaya). */
  legal: {
    termsTitle: string;
    termsHtml: string;
    privacyTitle: string;
    privacyHtml: string;
  };
  settings: SiteSettings;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  primaryColor: "#EF4444",
  secondaryColor: "#1e293b",
  lifetime_price_idr: 173000,
  price: "Rp 173.000",
  /** Kosongkan jika belum ada gateway; checkout tetap lewat modal di halaman ini. */
  checkoutUrl: "",
  checkoutLynkStaticUrl: "",
  loginUrl: "https://app.macfyi.com/login",
  videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  siteName: "Macfyi",
  /** Default file di `public/`; ganti lewat admin (unggah atau URL). */
  brandLogoUrl: "/brand-logo-default.png",
  contactEmail: "support@macfyi.com",
  whatsapp: "",
  instagramUrl: "",
  twitterUrl: "",
  linkedinUrl: "",
  seoTitle: "Macfyi — Storage Mac jelas & aman",
  seoDescription:
    "Peta penyimpanan Mac, bersih-bersih dengan label risiko, uninstall rapi, dan AI yang menjaga privasi.",
  ogImageUrl: "",
  facebookPixelId: "",
  googleAnalyticsId: "",
  tiktokPixelId: "",
  pixelSendMeta: true,
  pixelSendGa: true,
  pixelSendTiktok: true,
  /** Pixel script Meta sudah mengirim PageView sekali; hindari dobel. */
  metaEventOnPageOpen: "none",
  metaEventOnOpenDemoIntent: "Lead",
  metaEventOnScarcityScrollToPricing: "ViewContent",
  metaEventOnPricingCta: "InitiateCheckout",
  metaEventOnDemoModalOpen: "none",
  metaEventOnDemoSubmit: "CompleteRegistration",
  metaEventOnDemoDownloadReady: "CompleteRegistration",
  metaEventOnLeadFormVisible: "ViewContent",
  metaEventOnLeadFormSubmit: "Lead",
  metaEventOnCheckoutNav: "InitiateCheckout",
  metaEventOnCheckoutRouteView: "ViewContent",
  metaEventOnCheckoutFormVisible: "AddPaymentInfo",
  metaEventOnCheckoutFormSubmit: "AddPaymentInfo",
  metaEventOnSnapOpened: "AddPaymentInfo",
  metaEventOnLynkRedirect: "InitiateCheckout",
  metaEventOnPurchaseCompleted: "Purchase",
  faqSingleOpen: true,
  privacyPolicyUrl: "/privacy",
  termsUrl: "/terms",
  notificationBannerEnabled: true,
  notificationBannerText: "Promo lifetime — checkout sekarang dan rapikan Mac Anda dengan tenang.",
  notificationSoundEnabled: true,
  socialProofToastEnabled: true,
  socialProofNames: "Hanif\nRina\nBudi\nSari\nAndi\nDewi\nEko\nFitri\nGilang\nHana\nIndra\nJihan",
  socialProofActions: "melakukan pemesanan\nbaru menyelesaikan checkout\nmengaktifkan lisensi\nmembeli paket\nmendaftar checkout",
  socialProofProducts:
    "lisensi Macfyi lifetime\nlisensi 1 perangkat Mac\npaket cleanup premium\naddon uninstaller\nbundle storage optimizer",
  socialProofTimes: "barusan\n1 menit lalu\n2 menit lalu\n3 menit lalu\n5 menit lalu\nbeberapa menit lalu",
  socialProofMuteLabel: "MUTE",
  socialProofUnmuteLabel: "UNMUTE",
  landingNotesHtml: "",
  waCategories: ["Sales", "Support", "Follow-up"],
  waTemplates: [
    { id: "t1", category: "Sales", body: "Halo {nama}, terima kasih sudah tertarik Macfyi. Mau kami bantu aktivasi?" },
    { id: "t2", category: "Support", body: "Halo, kami dari Macfyi. Ada yang bisa kami bantu?" },
  ],
  checkoutModalTitle: "Checkout",
  checkoutProductSubtitle: "",
  checkoutTotalLabel: "Total",
  checkoutLicenseNote: "Lisensi lifetime · 1 perangkat Mac",
  checkoutNameLabel: "Nama lengkap",
  checkoutNamePlaceholder: "Nama di bukti pembayaran",
  checkoutEmailLabel: "Email",
  checkoutEmailPlaceholder: "Untuk lisensi & aktivasi",
  checkoutPhoneLabel: "No. HP / WhatsApp",
  checkoutPhonePlaceholder: "08xxxxxxxxxx atau +62…",
  checkoutAgreePrefix: "Saya setuju dengan",
  checkoutTermsLinkLabel: "Syarat & Ketentuan",
  checkoutPrivacyLinkLabel: "Kebijakan Privasi",
  checkoutSubmitLoading: "Memproses…",
  checkoutCtaMidtrans: "Bayar dengan Midtrans",
  checkoutCtaLynk: "Bayar dengan Lynk.id",
  checkoutCtaExternal: "Lanjut ke pembayaran",
  checkoutCtaConfirm: "Konfirmasi pesanan",
  checkoutFooterSnap: "Pembayaran diproses melalui Midtrans (metode mengikuti pengaturan merchant).",
  checkoutFooterLynk: "Pembayaran diproses melalui Lynk.id (metode mengikuti pengaturan merchant).",
  checkoutFooterNoGateway:
    "Tambahkan variabel VITE_SUPABASE_URL dan kunci anon, atau atur Checkout URL di pengaturan.",
};

export const DEFAULT_LEGAL: ContentData["legal"] = {
  termsTitle: "Syarat & Ketentuan",
  termsHtml:
    "<p>Berikut syarat penggunaan layanan dan lisensi Macfyi. Sesuaikan teks ini di pengaturan admin.</p><ul><li>Penggunaan sesuai hukum yang berlaku.</li><li>Lisensi per perangkat sesuai pembelian.</li></ul>",
  privacyTitle: "Kebijakan Privasi",
  privacyHtml:
    "<p>Macfyi menghormati privasi Anda. Sesuaikan kebijakan ini di admin.</p><ul><li>Data diproses untuk aktivasi dan dukungan.</li><li>AI lokal tidak mengirim path file ke server kami.</li></ul>",
};
