import { auth } from "@/lib/auth";
import {
  db, projects, siteAuditIssues, siteAuditSnapshots,
  eq, desc, isNull, and,
} from "@serpio/database";
import { AuditTable } from "@/components/dashboard/AuditTable";

const ISSUE_LABELS: Record<string, string> = {
  broken_link_internal:     "Kırık İç Link",
  broken_link_external:     "Kırık Dış Link",
  missing_title:            "Başlık Eksik",
  title_too_long:           "Başlık Çok Uzun",
  title_too_short:          "Başlık Çok Kısa",
  missing_meta_desc:        "Meta Açıklama Eksik",
  meta_desc_too_long:       "Meta Açıklama Çok Uzun",
  meta_desc_too_short:      "Meta Açıklama Çok Kısa",
  missing_canonical:        "Canonical Tag Eksik",
  missing_viewport:         "Viewport Eksik",
  missing_alt_text:         "Alt Text Eksik",
  slow_page:                "Yavaş Sayfa",
  poor_lcp:                 "Kötü LCP",
  poor_cls:                 "Kötü CLS",
  duplicate_title:          "Duplicate Başlık",
  duplicate_meta_desc:      "Duplicate Meta",
  missing_h1:               "H1 Eksik",
  multiple_h1:              "Birden Fazla H1",
  broken_heading_hierarchy: "Başlık Hiyerarşisi Bozuk",
  http_error:               "HTTP Hatası",
  redirect_chain:           "Yönlendirme Zinciri",
  missing_https:            "HTTPS Eksik",
  robots_blocked:           "Robots Engeli",
};

export default async function AuditPage() {
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
          <h2 className="text-xl font-ui font-bold text-text">Site Sağlığı</h2>
          <p className="text-sm text-muted font-ui mt-1">Teknik SEO denetim sonuçları</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <p className="text-2xl mb-2">🏥</p>
          <p className="text-text font-ui font-semibold">Henüz proje yok</p>
          <p className="text-sm text-muted font-ui mt-1">Denetim için önce bir tarama başlatın.</p>
        </div>
      </div>
    );
  }

  const snapshot = await db.query.siteAuditSnapshots.findFirst({
    where: eq(siteAuditSnapshots.projectId, project.id),
    orderBy: [desc(siteAuditSnapshots.createdAt)],
  });

  const issues = await db.query.siteAuditIssues.findMany({
    where: and(
      eq(siteAuditIssues.projectId, project.id),
      isNull(siteAuditIssues.resolvedAt)
    ),
    orderBy: [desc(siteAuditIssues.detectedAt)],
    limit: 500,
    with: {
      article: { columns: { id: true, title: true, originalUrl: true } },
    },
  });

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount  = issues.filter((i) => i.severity === "warning").length;
  const infoCount     = issues.filter((i) => i.severity === "info").length;
  const healthScore   = snapshot?.healthScore ?? (issues.length === 0 && snapshot ? 100 : null);

  const typeCounts = new Map<string, number>();
  for (const issue of issues) {
    typeCounts.set(issue.issueType, (typeCounts.get(issue.issueType) ?? 0) + 1);
  }
  const topIssues = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const scoreColor =
    healthScore === null    ? "text-muted" :
    healthScore >= 80       ? "text-emerald" :
    healthScore >= 50       ? "text-yellow-400" : "text-red-400";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-ui font-bold text-text">Site Sağlığı</h2>
        <p className="text-sm text-muted font-ui mt-1">
          Teknik SEO denetim sonuçları
          {snapshot && (
            <span className="ml-2 text-border">
              · Son tarama: {new Date(snapshot.createdAt).toLocaleDateString("tr-TR")}
              {snapshot.avgLoadTime && ` · Ort. yükleme: ${Math.round(snapshot.avgLoadTime)}ms`}
            </span>
          )}
        </p>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Sağlık Skoru (daire) */}
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col items-center justify-center col-span-2 md:col-span-1">
          <p className="text-xs text-muted font-ui uppercase tracking-wider mb-3">Site Sağlığı</p>
          <div className="relative w-20 h-20">
            <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
              <circle cx="18" cy="18" r="15.9155" fill="none"
                stroke="currentColor" className="text-elevated" strokeWidth="3.5"/>
              <circle cx="18" cy="18" r="15.9155" fill="none"
                stroke="currentColor" className={scoreColor}
                strokeWidth="3.5"
                strokeDasharray={`${healthScore ?? 0} 100`}
                strokeLinecap="round"/>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xl font-display font-bold ${scoreColor}`}>
                {healthScore ?? "—"}
              </span>
            </div>
          </div>
          {snapshot && (
            <p className="text-xs text-muted font-ui mt-2">{snapshot.pagesAudited} sayfa denetlendi</p>
          )}
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted font-ui uppercase tracking-wider">Kritik</p>
          <p className={`text-3xl font-display font-bold mt-2 ${criticalCount > 0 ? "text-red-400" : "text-emerald"}`}>
            {criticalCount}
          </p>
          <p className="text-xs text-muted font-ui mt-1">Hemen düzeltilmeli</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted font-ui uppercase tracking-wider">Uyarı</p>
          <p className={`text-3xl font-display font-bold mt-2 ${warningCount > 0 ? "text-yellow-400" : "text-emerald"}`}>
            {warningCount}
          </p>
          <p className="text-xs text-muted font-ui mt-1">Önemli, acil değil</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted font-ui uppercase tracking-wider">Bilgi</p>
          <p className="text-3xl font-display font-bold text-tech-blue mt-2">{infoCount}</p>
          <p className="text-xs text-muted font-ui mt-1">İyileştirme önerileri</p>
        </div>
      </div>

      {/* En sık sorunlar */}
      {topIssues.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-sm font-ui font-semibold text-text mb-4">En Sık Sorunlar</h3>
          <div className="space-y-3">
            {topIssues.map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-ui text-text truncate">
                      {ISSUE_LABELS[type] ?? type}
                    </span>
                    <span className="text-xs font-mono text-muted ml-2 flex-shrink-0">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-elevated overflow-hidden">
                    <div
                      className="h-full rounded-full bg-tech-blue/60 transition-all"
                      style={{ width: `${Math.round((count / (topIssues[0][1] || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Henüz denetim yok */}
      {!snapshot && issues.length === 0 && (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <p className="text-4xl mb-3">🔍</p>
          <h3 className="text-text font-ui font-semibold text-lg">Henüz denetim yapılmadı</h3>
          <p className="text-sm text-muted font-ui mt-2 max-w-sm mx-auto">
            Site tarama işlemi başlatıldığında teknik SEO sorunları otomatik olarak tespit edilir ve burada listelenir.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-tech-blue text-white rounded-xl text-sm font-ui font-medium hover:bg-tech-blue/90 transition-colors"
          >
            Taramayı Başlat →
          </a>
        </div>
      )}

      {/* Tüm sorunlar çözüldü */}
      {snapshot && issues.length === 0 && (
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <p className="text-3xl mb-2">✅</p>
          <h3 className="text-text font-ui font-semibold">Tüm sorunlar çözüldü!</h3>
          <p className="text-sm text-muted font-ui mt-1">Site sağlığı mükemmel görünüyor.</p>
        </div>
      )}

      {/* Sorun tablosu */}
      {issues.length > 0 && (
        <AuditTable issues={issues} issueLabels={ISSUE_LABELS} />
      )}
    </div>
  );
}
