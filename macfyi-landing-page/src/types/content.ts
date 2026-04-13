export interface SiteSettings {
  primaryColor: string;
  secondaryColor: string;
  price: string;
  checkoutUrl: string;
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
  faqSingleOpen: boolean;
  privacyPolicyUrl: string;
  termsUrl: string;
  notificationBannerEnabled: boolean;
  notificationBannerText: string;
  notificationSoundEnabled: boolean;
  /** Catatan migrasi / HTML dari WordPress (referensi editor). */
  landingNotesHtml: string;
  waCategories: string[];
  waTemplates: { id: string; category: string; body: string }[];
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
    title: string;
    price: string;
    label: string;
    bullets: string[];
    cta: string;
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
  settings: SiteSettings;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  primaryColor: "#EF4444",
  secondaryColor: "#1e293b",
  price: "Rp 173.000",
  /** Kosongkan jika belum ada gateway; checkout tetap lewat modal di halaman ini. */
  checkoutUrl: "",
  loginUrl: "https://app.macfyi.com/login",
  videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  siteName: "Macfyi",
  brandLogoUrl: "",
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
  faqSingleOpen: true,
  privacyPolicyUrl: "#",
  termsUrl: "#",
  notificationBannerEnabled: true,
  notificationBannerText: "Promo lifetime — checkout sekarang dan rapikan Mac Anda dengan tenang.",
  notificationSoundEnabled: true,
  landingNotesHtml: "",
  waCategories: ["Sales", "Support", "Follow-up"],
  waTemplates: [
    { id: "t1", category: "Sales", body: "Halo {nama}, terima kasih sudah tertarik Macfyi. Mau kami bantu aktivasi?" },
    { id: "t2", category: "Support", body: "Halo, kami dari Macfyi. Ada yang bisa kami bantu?" },
  ],
};
