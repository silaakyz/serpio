import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Serpio — SEO & Content Automation",
  description: "Automatically detect stale content and rewrite it with AI"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
