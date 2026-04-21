import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const navItems = [
  { href: "/admin",         icon: "📊", label: "Genel Bakış"  },
  { href: "/admin/users",   icon: "👥", label: "Kullanıcılar" },
  { href: "/admin/credits", icon: "💳", label: "Krediler"     },
  { href: "/admin/jobs",    icon: "⚙️", label: "Joblar"       },
  { href: "/admin/logs",    icon: "📋", label: "Loglar"       },
  { href: "/admin/system",  icon: "🔧", label: "Sistem"       },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;

  if (!session?.user || role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#0A0F1E" }}>
      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col border-r"
             style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: "#1E3A5F" }}>
          <p className="font-bold text-lg" style={{ color: "#FF4444", fontFamily: "var(--font-geist-mono)" }}>
            ⚡ Serpio Admin
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "#64748B" }}>
            Platform Yönetim Paneli
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 text-muted hover:text-text hover:bg-elevated/50"
              style={{ fontFamily: "var(--font-geist-sans)" }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Alt */}
        <div className="px-3 pb-4 pt-3 border-t space-y-1" style={{ borderColor: "#1E3A5F" }}>
          <Link href="/dashboard"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-muted hover:text-text hover:bg-elevated/50">
            ← Dashboard'a Dön
          </Link>
          <div className="px-3 py-1">
            <p className="text-[10px]" style={{ color: "#334155" }}>
              {session.user.email}
            </p>
          </div>
        </div>
      </aside>

      {/* ── İçerik ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Kırmızı admin banner */}
        <div className="h-8 flex items-center px-4 text-xs font-mono flex-shrink-0"
             style={{ backgroundColor: "rgba(239,68,68,0.1)", borderBottom: "1px solid rgba(239,68,68,0.2)", color: "#FF4444" }}>
          ⚠ Admin Modu — Bu panel sadece yetkili yöneticiler içindir
        </div>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
