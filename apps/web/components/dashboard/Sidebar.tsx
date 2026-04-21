"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  soon?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "GENEL BAKIŞ",
    items: [
      { href: "/dashboard", label: "Komuta Merkezi", icon: "🏠" },
    ],
  },
  {
    title: "İÇERİK",
    items: [
      { href: "/dashboard/articles", label: "Makaleler", icon: "📝" },
      { href: "/dashboard/calendar", label: "Takvim", icon: "📅" },
      { href: "/dashboard/programmatic", label: "Programatik SEO", icon: "⚡", soon: true },
      { href: "/dashboard/translations", label: "Çeviriler", icon: "🌍", soon: true },
    ],
  },
  {
    title: "ANALİZ",
    items: [
      { href: "/dashboard/performance", label: "Performans", icon: "📊", soon: true },
      { href: "/dashboard/audit", label: "Site Sağlığı", icon: "🏥", soon: true },
      { href: "/dashboard/geo", label: "GEO/LLMO", icon: "🤖", soon: true },
      { href: "/dashboard/predictions", label: "Tahminler", icon: "🔮", soon: true },
    ],
  },
  {
    title: "REKABET",
    items: [
      { href: "/dashboard/competitors", label: "Rakipler", icon: "🎯", soon: true },
      { href: "/dashboard/opportunities", label: "Fırsatlar", icon: "💡", soon: true },
      { href: "/dashboard/backlinks", label: "Backlinkler", icon: "🔗", soon: true },
    ],
  },
  {
    title: "DÖNÜŞÜM",
    items: [
      { href: "/dashboard/conversions", label: "Dönüşüm", icon: "💰", soon: true },
      { href: "/dashboard/topics", label: "Konu Haritası", icon: "🗺️", soon: true },
    ],
  },
  {
    title: "OPERASYON",
    items: [
      { href: "/dashboard/terminal", label: "Terminal", icon: "🖥️" },
      { href: "/dashboard/reports", label: "Raporlar", icon: "📋", soon: true },
    ],
  },
  {
    title: "AYARLAR",
    items: [
      { href: "/dashboard/credits",       label: "Krediler",       icon: "💎" },
      { href: "/dashboard/settings",      label: "Proje Ayarları", icon: "⚙️" },
      { href: "/dashboard/notifications", label: "Bildirimler",    icon: "🔔", soon: true },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Plan bazlı maksimum kredi
const PLAN_MAX = 500; // starter plan

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const sessionCredits = (session?.user as { credits?: number })?.credits ?? 0;
  const isAdmin = (session?.user as { role?: string })?.role === "admin";
  const [credits, setCredits] = useState<number>(sessionCredits);

  // Her 30 saniyede bir güncel bakiyeyi çek
  useEffect(() => {
    let cancelled = false;
    async function fetchBalance() {
      try {
        const res = await fetch("/api/credits/balance");
        if (res.ok) {
          const { credits: c } = await res.json();
          if (!cancelled) setCredits(c);
        }
      } catch { /* sessiz geç */ }
    }
    fetchBalance();
    const interval = setInterval(fetchBalance, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const creditPercent = Math.min(100, Math.max(0, (credits / PLAN_MAX) * 100));
  const isLow      = credits < PLAN_MAX * 0.2;  // <20% → sarı
  const isCritical = credits <= 10;             // ≤10 → kırmızı

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Overlay (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-[260px] flex flex-col
          bg-surface border-r border-border
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border flex items-center gap-3">
          <span className="font-display font-bold text-xl text-emerald tracking-tight">
            ⚡ Serpio
          </span>
          <span className="text-xs text-muted font-ui mt-0.5">Dashboard</span>
        </div>

        {/* Proje Seçici */}
        <div className="px-4 py-3 border-b border-border">
          <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-elevated border border-border text-sm text-text hover:border-emerald/40 transition-colors">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald inline-block" />
              Projem
            </span>
            <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-2 mb-1.5 text-[10px] font-ui font-semibold text-muted uppercase tracking-widest">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    {item.soon ? (
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-muted cursor-default select-none">
                        <span className="flex items-center gap-2.5">
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-elevated text-muted border border-border font-ui">
                          Yakında
                        </span>
                      </div>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={`
                          flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150
                          ${isActive(item.href)
                            ? "bg-elevated text-text border-l-2 border-emerald pl-[10px]"
                            : "text-muted hover:text-text hover:bg-elevated/50"
                          }
                        `}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Admin Panel Linki — sadece admin rolü */}
        {isAdmin && (
          <div className="px-3 pb-2">
            <Link
              href="/admin"
              onClick={onClose}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 font-ui"
              style={{
                backgroundColor: "rgba(255,68,68,0.08)",
                border:          "1px solid rgba(255,68,68,0.25)",
                color:           "#FF4444",
              }}
            >
              <span>⚡</span>
              <span>Admin Panel</span>
            </Link>
          </div>
        )}

        {/* Alt Alan */}
        <div className="border-t border-border p-4 space-y-3">
          {/* Kredi Göstergesi */}
          <div className="space-y-1.5">
            {isCritical && (
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-ui"
                   style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#FF4444" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                Kredi azalıyor!
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted font-ui">Kredi Bakiyesi</span>
              <span className={`font-ui font-semibold ${isCritical ? "text-red-400" : isLow ? "text-yellow-400" : "text-emerald"}`}>
                {credits} / {PLAN_MAX}
              </span>
            </div>
            <div className="w-full h-1.5 bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${creditPercent}%`,
                  backgroundColor: isCritical ? "#FF4444" : isLow ? "#F59E0B" : "#00FF87",
                }}
              />
            </div>
            <Link
              href="/dashboard/credits"
              onClick={onClose}
              className="w-full text-xs py-1.5 px-3 rounded-lg border text-center block transition-colors font-ui"
              style={{
                borderColor: isCritical ? "rgba(239,68,68,0.4)" : "rgba(0,255,135,0.4)",
                color:       isCritical ? "#FF4444" : "#00FF87",
              }}
            >
              {isCritical ? "⚠ Kredi Satın Al" : "💎 Kredileri Yönet"}
            </Link>
          </div>

          {/* Kullanıcı */}
          <div className="flex items-center gap-3 pt-1">
            <div className="w-8 h-8 rounded-full bg-elevated border border-border flex items-center justify-center text-sm font-display text-emerald flex-shrink-0">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text font-ui truncate leading-tight">
                {session?.user?.name ?? "Kullanıcı"}
              </p>
              <p className="text-xs text-muted font-ui truncate leading-tight">
                {session?.user?.email ?? ""}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-muted hover:text-text transition-colors flex-shrink-0"
              title="Çıkış Yap"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export function HamburgerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 rounded-lg text-muted hover:text-text hover:bg-elevated transition-colors"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}
