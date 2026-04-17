import { auth } from "@/lib/auth";
import { ScrapeStarter } from "@/components/dashboard/ScrapeStarter";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? "Kullanıcı";

  const stats = [
    { label: "Toplam Makale",          value: "0",   sub: "makale tarandı",          icon: "📝", color: "text-emerald" },
    { label: "Güncellenmesi Gereken",  value: "0",   sub: "eski içerik tespit edildi", icon: "⚠️", color: "text-gold" },
    { label: "Yayınlanan",             value: "0",   sub: "başarıyla yayınlandı",     icon: "✅", color: "text-emerald" },
    { label: "Kredi Bakiyesi",         value: "100", sub: "kredi kaldı",              icon: "💎", color: "text-tech-blue" },
  ];

  return (
    <div className="space-y-6">
      {/* Hoş Geldin */}
      <div>
        <h2 className="text-2xl font-ui font-bold text-text">Hoş geldin, {name}! 👋</h2>
        <p className="mt-1 text-sm text-muted font-ui">İşte projenizin güncel durumu.</p>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted text-xs font-ui uppercase tracking-wider">{s.label}</span>
              <span className="text-xl">{s.icon}</span>
            </div>
            <div>
              <p className={`text-3xl font-display font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted font-ui mt-1">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Hızlı Aksiyonlar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ScrapeStarter userId={session?.user?.id ?? ""} />

        {/* Yayınlama Kanalı */}
        <div className="bg-surface border border-dashed border-emerald/30 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔌</span>
            <div>
              <h3 className="text-text font-ui font-semibold">Yayınlama Ayarları</h3>
              <p className="text-xs text-muted font-ui mt-0.5">
                WordPress, Shopify veya diğer platformlarınızı bağlayın.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center px-4 py-2 rounded-lg border border-emerald/40 text-emerald text-sm font-ui hover:bg-emerald/10 transition-colors"
          >
            Ayarlara Git →
          </Link>
        </div>
      </div>

      {/* Son Aktiviteler */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-text font-ui font-semibold mb-4">Son Aktiviteler</h3>
        <div className="py-12 text-center">
          <p className="text-muted text-sm font-ui">
            Henüz bir aktivite yok. İlk taramanızı başlatarak başlayın!
          </p>
        </div>
      </div>
    </div>
  );
}
