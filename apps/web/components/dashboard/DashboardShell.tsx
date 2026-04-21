"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar, HamburgerButton } from "./Sidebar";

const pageTitles: Record<string, string> = {
  "/dashboard": "Komuta Merkezi",
  "/dashboard/articles": "Makaleler",
  "/dashboard/calendar": "Takvim",
  "/dashboard/terminal": "Terminal",
  "/dashboard/credits":  "Krediler",
  "/dashboard/settings": "Proje Ayarları",
  "/dashboard/notifications": "Bildirimler",
  "/dashboard/programmatic": "Programatik SEO",
  "/dashboard/translations": "Çeviriler",
  "/dashboard/performance": "Performans",
  "/dashboard/audit": "Site Sağlığı",
  "/dashboard/geo": "GEO/LLMO",
  "/dashboard/predictions": "Tahminler",
  "/dashboard/competitors": "Rakipler",
  "/dashboard/opportunities": "Fırsatlar",
  "/dashboard/backlinks": "Backlinkler",
  "/dashboard/conversions": "Dönüşüm",
  "/dashboard/topics": "Konu Haritası",
  "/dashboard/reports": "Raporlar",
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const pageTitle = pageTitles[pathname] ?? "Dashboard";

  return (
    <div className="flex h-screen overflow-hidden bg-void">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <HamburgerButton onClick={() => setSidebarOpen(true)} />
            <h1 className="text-sm font-ui font-semibold text-text">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Arama */}
            <button className="p-2 rounded-lg text-muted hover:text-text hover:bg-elevated transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Bildirimler */}
            <button className="relative p-2 rounded-lg text-muted hover:text-text hover:bg-elevated transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold leading-none">
                3
              </span>
            </button>

            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-elevated border border-border flex items-center justify-center text-xs font-display text-emerald">
              U
            </div>
          </div>
        </header>

        {/* İçerik */}
        <main className="flex-1 overflow-y-auto p-6 bg-void">
          {children}
        </main>
      </div>
    </div>
  );
}
