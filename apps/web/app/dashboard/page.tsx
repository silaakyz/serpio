import { auth } from "@/lib/auth";
import { ScrapeStarter } from "@/components/dashboard/ScrapeStarter";
import Link from "next/link";
import { db } from "@serpio/database";
import { articles, projects, jobs, users } from "@serpio/database";
import { eq, ne, count, and, desc } from "drizzle-orm";

const JOB_TYPE_LABELS: Record<string, string> = {
  scrape:       "Web Taraması",
  ai_analyze:   "AI Analiz",
  ai_rewrite:   "AI Yeniden Yazım",
  style_guide:  "Stil Rehberi",
  internal_link:"İç Linkleme",
  geo_analyze:  "GEO Analiz",
  geo_optimize: "GEO Optimizasyon",
  publish:      "Yayınlama",
};

const JOB_STATUS_COLORS: Record<string, string> = {
  pending:   "text-muted",
  active:    "text-tech-blue",
  completed: "text-emerald",
  failed:    "text-red-400",
  retrying:  "text-yellow-400",
};

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name ?? "Kullanıcı";

  // Kullanıcı ve proje
  const user = session?.user?.id
    ? await db.query.users.findFirst({ where: eq(users.id, session.user.id) })
    : null;

  const project = session?.user?.id
    ? await db.query.projects.findFirst({
        where: eq(projects.userId, session.user.id),
        orderBy: (t, { asc }) => [asc(t.createdAt)],
      })
    : null;

  // İstatistikler
  let totalArticles = 0;
  let staleArticles = 0;
  let publishedArticles = 0;

  if (project) {
    const [totalResult] = await db
      .select({ count: count() })
      .from(articles)
      .where(eq(articles.projectId, project.id));

    const [staleResult] = await db
      .select({ count: count() })
      .from(articles)
      .where(and(eq(articles.projectId, project.id), ne(articles.staleStatus, "fresh")));

    const [publishedResult] = await db
      .select({ count: count() })
      .from(articles)
      .where(and(eq(articles.projectId, project.id), eq(articles.status, "published")));

    totalArticles = totalResult?.count ?? 0;
    staleArticles = staleResult?.count ?? 0;
    publishedArticles = publishedResult?.count ?? 0;
  }

  const credits = user?.credits ?? 100;

  const stats = [
    { label: "Toplam Makale",         value: String(totalArticles), sub: "makale tarandı",           icon: "📝", color: "text-emerald" },
    { label: "Güncellenmesi Gereken", value: String(staleArticles), sub: "eski içerik tespit edildi", icon: "⚠️", color: "text-gold"   },
    { label: "Yayınlanan",            value: String(publishedArticles), sub: "başarıyla yayınlandı",  icon: "✅", color: "text-emerald" },
    { label: "Kredi Bakiyesi",        value: String(credits),       sub: "kredi kaldı",               icon: "💎", color: "text-tech-blue" },
  ];

  // Son 10 aktivite
  const recentJobs = project
    ? await db.query.jobs.findMany({
        where: eq(jobs.projectId, project.id),
        orderBy: [desc(jobs.createdAt)],
        limit: 10,
      })
    : [];

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
        {recentJobs.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted text-sm font-ui">
              Henüz bir aktivite yok. İlk taramanızı başlatarak başlayın!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-current flex-shrink-0" style={{
                    backgroundColor:
                      job.status === "completed" ? "#00FF87" :
                      job.status === "active"    ? "#0EA5E9" :
                      job.status === "failed"    ? "#EF4444" :
                      job.status === "retrying"  ? "#F59E0B" :
                      "#4B5563",
                  }} />
                  <div>
                    <p className="text-sm font-ui text-text">
                      {JOB_TYPE_LABELS[job.type] ?? job.type}
                    </p>
                    <p className="text-xs text-muted font-ui">{fmtDate(job.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-ui font-medium ${JOB_STATUS_COLORS[job.status] ?? "text-muted"}`}>
                    {job.status === "pending" ? "Bekliyor" :
                     job.status === "active" ? "Çalışıyor" :
                     job.status === "completed" ? "Tamamlandı" :
                     job.status === "failed" ? "Başarısız" : "Tekrar Deneniyor"}
                  </span>
                  <Link
                    href={`/dashboard/terminal?jobId=${job.id}`}
                    className="text-xs text-muted hover:text-tech-blue transition-colors font-ui"
                  >
                    Loglar →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
