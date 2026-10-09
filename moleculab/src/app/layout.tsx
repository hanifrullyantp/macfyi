import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { ThemeApplier } from "@/components/theme";
import { BRAND } from "@/config/brand";
import { Providers } from "@/components/Providers";

/** Skrip anti-FOUC: terapkan tema tersimpan sebelum hydration. */
const THEME_INIT = `try{var s=localStorage.getItem('vsepr-app-v1');var t=s?JSON.parse(s).state.theme:'dark';if(t==='dark')document.documentElement.classList.add('dark')}catch(e){document.documentElement.classList.add('dark')}`;

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: {
    default: BRAND.appFullName,
    template: `%s — ${BRAND.appName}`,
  },
  description:
    "Moleculab adalah laboratorium molekul virtual interaktif untuk memahami Teori VSEPR — lihat bagaimana molekul menemukan bentuknya, bukan sekadar menghafal hasil akhirnya.",
  keywords: ["Moleculab", "VSEPR", "bentuk molekul", "struktur Lewis", "PEI", "PEB", "kimia SMA", "tabel periodik", "elektron valensi"],
  openGraph: {
    title: BRAND.appFullName,
    description: "Laboratorium virtual interaktif untuk memahami Teori VSEPR melalui visualisasi pembentukan molekul langkah demi langkah.",
    siteName: BRAND.appName,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className={`${inter.variable} ${grotesk.variable}`}>
        <Providers>
          <ThemeApplier />
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
