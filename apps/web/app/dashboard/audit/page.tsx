import { auth } from "@/lib/auth";
import {
  db, projects, siteAuditIssues, siteAuditSnapshots,
  eq, desc, isNull, and,
} from "@serpio/database";
import { AuditTable } from "@/components/dashboard/AuditTable";
import Link from "next/link";

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

  // Son 2 snapshot (trend için)
  const snapshots = await db.query.siteAuditSnapshots.findMany({
    where: eq(siteAuditSnapshots.projectId, project.id),
    orderBy: [desc(siteAuditSnapshots.createdAt)],
    limit: 2,
  });
  const snapshot  = snapshots[0] ?? null;
  const prevSnap  = snapshots[1] ?? null;

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
  const healthScore   = snapshot?.healthScore ?? null;

  // Trend hesapla
  const scoreDiff = healthScore !== null && prevSnap
    ? healthScore - prevSnap.healthScore
    : null;
  const critDiff = snapshot && prevSnap
    ? snapshot.criticalCount - prevSnap.criticalCount
    : null;

  const scoreColor =
    healthScore === null    ? "text-muted"      :
    healthScore >= 80       ? "text-emerald"     :
    healthScore >= 50       ? "text-yellow-400"  : "text-red-400";

  // Sorun tipi dağılımı
  const typeCounts = new Map<string, number>();
  for (const issue of issues) {
    typeCounts.set(issue.issueType, (typeCounts.get(issue.issueType) ?? 0) + 1);
  }
  const topIssues = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxCount  = topIssues[0]?.[1] ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-ui font-bold text-text">Site Sağlığı</h2>
          <p className="text-sm text-muted font-ui mt-1">
            Teknik SEO denetim sonuçları
            {snapshot && (
              <span className="ml-2 text-border">
                · Son denetim: {new Date(snapshot.createdAt).toLocaleDateString("tr-TR", {
                  day: "2-digit", month: "long", year: "numeric",
                })}
                {snapshot.avgLoadTime && ` · Ort. yükleme: ${Math.round(snapshot.avgLoadTime)}ms`}
              </span>
            )}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-elevated border border-border rounded-lg text-sm font-ui text-muted hover:text-text hover:border-border/80 transition-colors"
        >
          ↻ Yeniden Denetle
        </Link>
      </div>

      {/* Ana skor + sayaçlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {/* Büyük skor */}
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col items-center justify-center col-span-2 md:col-span-1 relative">
          <p className="text-xs text-muted font-ui uppercase tracking-wider mb-2">Site Sağlığı</p>
          <span className={`text-6xl font-display font-bold leading-none ${scoreColor}`}>
            {healthScore ?? "—"}
          </span>
          <span className="text-xs text-muted font-ui mt-1">/ 100</span>

          {/* Trend badge */}
          {scoreDiff !== null && scoreDiff !== 0 && (
            <div className={`absolute top-3 right-3 inline-flex items-center gap-0.5 text-xs font-ui font-semibold px-1.5 py-0.5 rounded-md ${
              scoreDiff > 0 ? "text-emerald bg-emerald/10" : "text-red-400 bg-red-400/10"
            }`}>
              {scoreDiff > 0 ? "▲" : "▼"} {Math.abs(scoreDiff)}
            </div>
          )}

          {snapshot && (
            <p className="text-xs text-muted font-ui mt-2 text-center">
              {snapshot.pagesAudited} sayfa denetlendi
            </p>
          )}
        </div>

        {/* Kritik */}
        <div className="bg-surface border border-border rounded-xl p-4 relative">
          <p className="text-xs text-muted font-ui uppercase tracking-wider">Kritik</p>
          <p className={`text-3xl font-display font-bold mt-2 ${criticalCount > 0 ? "text-red-400" : "text-emerald"}`}>
            {criticalCount}
          </p>
          <p className="text-xs text-muted font-ui mt-1">Hemen düzeltilmeli</p>
          {critDiff !== null && critDiff !== 0 && (
            <span className={`absolute top-3 right-3 text-xs font-ui font-semibold ${critDiff > 0 ? "text-red-400" : "text-emerald"}`}>
              {critDiff > 0 ? `+${critDiff}` : critDiff}
            </span>
          )}
        </div>

        {/* Uyarı */}
        <div className="bg-surface border border-border rounded-xl p-4 relative">
          <p className="text-xs text-muted font-ui uppercase tracking-wider">Uyarı</p>
          <p className={`text-3xl font-display font-bold mt-2 ${warningCount > 0 ? "text-yellow-400" : "text-emerald"}`}>
            {warningCount}
          </p>
          <p className="text-xs text-muted font-ui mt-1">Önemli, acil değil</p>
          {snapshot && prevSnap && snapshot.warningCount !== prevSnap.warningCount && (
            <span className={`absolute top-3 right-3 text-xs font-ui font-semibold ${
              snapshot.warningCount > prevSnap.warningCount ? "text-yellow-400" : "text-emerald"
            }`}>
              {snapshot.warningCount > prevSnap.warningCount
                ? `+${snapshot.warningCount - prevSnap.warningCount}`
                : snapshot.warningCount - prevSnap.warningCount}
            </span>
          )}
        </div>

        {/* Bilgi */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted font-ui uppercase tracking-wider">Bilgi</p>
          <p className="text-3xl font-display font-bold text-tech-blue mt-2">{infoCount}</p>
          <p className="text-xs text-muted font-ui mt-1">İyileştirme önerileri</p>
        </div>
      </div>

      {/* Trend kartı (önceki snapshot varsa) */}
      {prevSnap && snapshot && (
        <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-xs text-muted font-ui uppercase tracking-wider mb-1">Önceki Skor</p>
            <p className="text-2xl font-display font-bold text-muted">{prevSnap.healthScore}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`text-2xl font-display font-bold ${scoreDiff! > 0 ? "text-emerald" : scoreDiff! < 0 ? "text-red-400" : "text-muted"}`}>
              {scoreDiff! > 0 ? "▲" : scoreDiff! < 0 ? "▼" : "═"} {Math.abs(scoreDiff!)} puan
            </div>
          </div>
          <div className="text-xs text-muted font-ui">
            <p>Önceki denetim: {new Date(prevSnap.createdAt).toLocaleDateString("tr-TR")}</p>
            <p className="mt-0.5">
              {prevSnap.criticalCount} kritik → {snapshot.criticalCount} kritik
              {" · "}
              {prevSnap.warningCount} uyarı → {snapshot.warningCount} uyarı
            </p>
          </div>
        </div>
      )}

      {/* Sorun tipi dağılım grafiği */}
      {topIssues.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-sm font-ui font-semibold text-text mb-4">En Yaygın Sorunlar</h3>
          <div className="space-y-2.5">
            {topIssues.map(([type, cnt]) => (
              <div key={type} className="flex items-center gap-3">
                <div className="w-36 flex-shrink-0">
                  <span className="text-xs font-ui text-text truncate block">
                    {ISSUE_LABELS[type] ?? type}
                  </span>
                </div>
                <div className="flex-1 h-2 rounded-full bg-elevated overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      issues.find((i) => i.issueType === type)?.severity === "critical"
                        ? "bg-red-400"
                        : issues.find((i) => i.issueType === type)?.severity === "warning"
                        ? "bg-yellow-400"
                        : "bg-tech-blue"
                    }`}
                    style={{ width: `${Math.round((cnt / maxCount) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-muted w-6 text-right flex-shrink-0">{cnt}</span>
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
            Site tarama işlemi başlatıldığında teknik SEO sorunları otomatik olarak tespit edilir.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-tech-blue text-white rounded-xl text-sm font-ui font-medium hover:bg-tech-blue/90 transition-colors"
          >
            Taramayı Başlat →
          </Link>
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
        <div>
          <h3 className="text-sm font-ui font-semibold text-text mb-3">
            Sorun Listesi
            <span className="ml-2 text-muted font-normal">({issues.length} açık sorun)</span>
          </h3>
          <AuditTable issues={issues} issueLabels={ISSUE_LABELS} />
        </div>
      )}
    </div>
  );
}
