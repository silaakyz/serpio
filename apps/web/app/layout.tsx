import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Serpio — SEO & Content Automation",
  description: "Automatically detect stale content and rewrite it with AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={inter.variable}>
      <body>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#0D1526",
              border: "1px solid #1E3A5F",
              color: "#F1F5F9",
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}
