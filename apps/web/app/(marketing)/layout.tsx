import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono", // CSS var adı aynı kalsın, tüm bileşenler bunu kullanıyor
  display: "swap"
});

export const metadata: Metadata = {
  title: "Serpio — AI-Powered SEO Otomasyon Platformu",
  description:
    "Eski içerikleri tespit edin, AI ile güncelleyin, Google ve ChatGPT'de görünür olun. WordPress, GitHub, Webhook ile tek tıkla yayınlayın.",
  keywords: [
    "SEO otomasyonu",
    "AI içerik güncelleme",
    "GEO optimizasyon",
    "LLMO",
    "WordPress SEO",
    "programatik SEO",
    "içerik güncelleme aracı"
  ],
  openGraph: {
    title: "Serpio — AI-Powered SEO Otomasyon Platformu",
    description:
      "Eski içerikleri tespit edin, AI ile güncelleyin, Google ve ChatGPT'de görünür olun.",
    url: "https://serpio.io",
    siteName: "Serpio",
    images: [
      {
        url: "https://serpio.io/og-image.png",
        width: 1200,
        height: 630,
        alt: "Serpio — AI SEO Otomasyon"
      }
    ],
    locale: "tr_TR",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Serpio — AI-Powered SEO Otomasyon Platformu",
    description:
      "Eski içerikleri tespit edin, AI ile güncelleyin, Google ve ChatGPT'de görünür olun.",
    images: ["https://serpio.io/og-image.png"],
    creator: "@serpio_io"
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen`}
      style={{ backgroundColor: "#0A0F1E", color: "#E2E8F0" }}
    >
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
