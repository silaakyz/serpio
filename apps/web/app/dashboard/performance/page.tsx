import { auth } from "@/lib/auth";
import { db, projects, articles, googleConnections, gscMetrics, gaMetrics, eq, desc } from "@serpio/database";
import { PerformanceConnectCard } from "@/components/dashboard/PerformanceConnectCard";
import { PerformanceTable } from "@/components/dashboard/PerformanceTable";

export default async function PerformancePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const project = await db.query.projects.findFirst({
    where: eq(projects.userId, session.user.id),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });

  if (!project) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-ui font-bold text-text">Performans Analizi</h2>
          <p className="text-sm text-muted font-ui mt-1">Google Search Console ve Analytics verileri</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <p className="text-2xl mb-2">📊</p>
          <p className="text-text font-ui font-semibold">Henüz proje yok</p>
          <p className="text-sm text-muted font-ui mt-1">Performans verisi için önce bir proje oluşturun.</p>
        </div>
      </div>
    );
  }

  const conn = await db.query.googleConnections.findFirst({
    where: eq(googleConnections.projectId, project.id),
  });

  // Google bağlı değil → bağlantı ekranı
  if (!conn) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-ui font-bold text-text">Performans Analizi</h2>
          <p className="text-sm text-muted font-ui mt-1">Google Search Console ve Analytics 4 verilerinizi görüntüleyin</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-8 flex flex-col items-center text-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-elevated flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="#4285F4"/>
              <path d="M12 2v10l8.66 5A10 10 0 0012 2z" fill="#34A853"/>
              <path d="M3.34 17A10 10 0 0012 22v-10L3.34 17z" fill="#FBBC05"/>
              <path d="M3.34 7A10 10 0 0112 2v10L3.34 7z" fill="#EA4335"/>
            </svg>
          </div>
          <div>
            <h3 className="text-text font-ui font-semibold text-lg">Google Hesabınızı Bağlayın</h3>
            <p className="text-sm text-muted font-ui mt-2 max-w-md">
              Search Console tıklama, gösterim ve sıralama verilerinizi; Analytics 4 oturum ve dönüşüm
              verilerinizi otomatik olarak senkronize edin.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg text-left">
            {[
              { icon: "🔍", title: "GSC Verileri", desc: "Tıklama, gösterim, konum, CTR" },
              { icon: "📈", title: "GA4 Metrikleri", desc: "Oturum, çıkma oranı, dönüşüm" },
              { icon: "🔄", title: "Otomatik Sync", desc: "28 günlük geçmiş veri" },
            ].map((f) => (
              <div key={f.title} className="bg-elevated rounded-lg p-3">
                <p className="text-lg mb-1">{f.icon}</p>
                <p className="text-xs font-ui font-semibold text-text">{f.title}</p>
                <p className="text-xs text-muted font-ui mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>

          <a
            href={`/api/google/auth?projectId=${project.id}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-tech-blue text-white rounded-xl font-ui font-medium hover:bg-tech-blue/90 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="white" fillOpacity="0.3"/>
              <path d="M12 5v7l6 3.5A7 7 0 0112 5z" fill="white"/>
            </svg>
            Google ile Bağlan
          </a>
        </div>
      </div>
    );
  }

  // Google bağlı — site/property listelerini çek (server-side, token refresh ile)
  let gscSites: { siteUrl?: string | null; permissionLevel?: string | null }[] = [];
  let ga4Properties: { propertyId?: string; displayName?: string | null }[] = [];

  try {
    const { getAuthenticatedClient } = await import("@/lib/google");
    const { google } = await import("googleapis");
    const authClient = await getAuthenticatedClient(project.id);

    const [sitesResp, propsResp] = await Promise.allSettled([
      google.webmasters({ version: "v3", auth: authClient }).sites.list(),
      google.analyticsadmin({ version: "v1beta", auth: authClient }).properties.list({ filter: "parent:accounts/-" }),
    ]);

    if (sitesResp.status === "fulfilled") {
      gscSites = (sitesResp.value.data.siteEntry ?? []).map((s) => ({
        siteUrl:         s.siteUrl,
        permissionLevel: s.permissionLevel,
      }));
    }
    if (propsResp.status === "fulfilled") {
      ga4Properties = (propsResp.value.data.properties ?? []).map((p) => ({
        propertyId:  p.name?.replace("properties/", ""),
        displayName: p.displayName,
      }));
    }
  } catch {
    // Token expired or network error — still show page, sync will re-trigger refresh
  }

  // GSC + GA metrikleri makale bazında topla
  const projectArticles = await db.query.articles.findMany({
    where: eq(articles.projectId, project.id),
    orderBy: [desc(articles.createdAt)],
    columns: { id: true, title: true, originalUrl: true },
  });

  const gscRows = await db.query.gscMetrics.findMany({
    where: eq(gscMetrics.projectId, project.id),
    columns: { articleId: true, clicks: true, impressions: true, position: true, ctr: true },
  });

  const gaRows = await db.query.gaMetrics.findMany({
    where: eq(gaMetrics.projectId, project.id),
    columns: { articleId: true, sessions: true, bounceRate: true, conversions: true },
  });

  // Aggregate per article
  const gscByArticle = new Map<string, { clicks: number; impressions: number; positions: number[]; ctrs: number[] }>();
  for (const r of gscRows) {
    const cur = gscByArticle.get(r.articleId) ?? { clicks: 0, impressions: 0, positions: [], ctrs: [] };
    cur.clicks      += r.clicks;
    cur.impressions += r.impressions;
    cur.positions.push(r.position);
    cur.ctrs.push(r.ctr);
    gscByArticle.set(r.articleId, cur);
  }

  const gaByArticle = new Map<string, { sessions: number; bounceRates: number[]; conversions: number }>();
  for (const r of gaRows) {
    const cur = gaByArticle.get(r.articleId) ?? { sessions: 0, bounceRates: [], conversions: 0 };
    cur.sessions    += r.sessions;
    cur.conversions += r.conversions;
    cur.bounceRates.push(r.bounceRate);
    gaByArticle.set(r.articleId, cur);
  }

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const tableData = projectArticles
    .map((a) => {
      const gsc = gscByArticle.get(a.id);
      const ga  = gaByArticle.get(a.id);
      return {
        id:              a.id,
        title:           a.title,
        originalUrl:     a.originalUrl,
        totalClicks:     gsc?.clicks ?? 0,
        totalImpressions: gsc?.impressions ?? 0,
        avgPosition:     avg(gsc?.positions ?? []),
        avgCtr:          avg(gsc?.ctrs ?? []),
        totalSessions:   ga?.sessions ?? 0,
        avgBounceRate:   avg(ga?.bounceRates ?? []),
        totalConversions: ga?.conversions ?? 0,
      };
    })
    .filter((a) => a.totalClicks > 0 || a.totalSessions > 0 || a.totalImpressions > 0);

  // Summary stats
  const totalClicks      = tableData.reduce((s, a) => s + a.totalClicks, 0);
  const totalImpressions = tableData.reduce((s, a) => s + a.totalImpressions, 0);
  const totalSessions    = tableData.reduce((s, a) => s + a.totalSessions, 0);
  const totalConversions = tableData.reduce((s, a) => s + a.totalConversions, 0);
  const overallAvgPosition = tableData.filter((a) => a.avgPosition > 0).length
    ? avg(tableData.filter((a) => a.avgPosition > 0).map((a) => a.avgPosition))
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-ui font-bold text-text">Performans Analizi</h2>
        <p className="text-sm text-muted font-ui mt-1">Google Search Console ve Analytics 4 verileri</p>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Toplam Tıklama",   value: totalClicks.toLocaleString("tr"),       color: "text-tech-blue" },
          { label: "Gösterim",         value: totalImpressions.toLocaleString("tr"),   color: "text-text" },
          { label: "Ort. Konum",       value: overallAvgPosition > 0 ? overallAvgPosition.toFixed(1) : "—", color: overallAvgPosition <= 10 ? "text-emerald" : "text-yellow-400" },
          { label: "Toplam Oturum",    value: totalSessions.toLocaleString("tr"),      color: "text-gold" },
          { label: "Dönüşüm",         value: totalConversions.toLocaleString("tr"),    color: "text-emerald" },
        ].map((s) => (
          <div key={s.label} className="bg-surface border border-border rounded-xl p-4">
            <p className="text-xs text-muted font-ui uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-display font-bold mt-2 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Bağlantı & sync kartı */}
      <PerformanceConnectCard
        projectId={project.id}
        gscSiteUrl={conn.gscSiteUrl}
        ga4PropertyId={conn.ga4PropertyId}
        gscSites={gscSites}
        ga4Properties={ga4Properties}
      />

      {/* Makale tablosu */}
      <div>
        <h3 className="text-sm font-ui font-semibold text-text mb-3">
          Makale Bazlı Performans
          {tableData.length > 0 && (
            <span className="ml-2 text-muted font-normal">({tableData.length} makale)</span>
          )}
        </h3>
        <PerformanceTable articles={tableData} />
      </div>
    </div>
  );
}
