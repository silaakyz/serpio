import { auth } from "@/lib/auth";
import { db } from "@serpio/database";
import { articles, projects } from "@serpio/database";
import { eq, desc } from "@serpio/database";
import { GeoTable } from "@/components/dashboard/GeoTable";

export default async function GeoPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const project = await db.query.projects.findFirst({
    where: eq(projects.userId, session.user.id),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });

  const articlesList = project
    ? await db.query.articles.findMany({
        where: eq(articles.projectId, project.id),
        orderBy: [desc(articles.geoScore), desc(articles.createdAt)],
        limit: 200,
      })
    : [];

  const totalArticles = articlesList.length;
  const withGeoScore = articlesList.filter((a) => a.geoScore !== null);
  const avgGeoScore =
    withGeoScore.length > 0
      ? Math.round(
          withGeoScore.reduce((sum, a) => sum + (a.geoScore ?? 0), 0) /
            withGeoScore.length
        )
      : 0;
  const optimizedCount = articlesList.filter((a) => a.geoOptimizedAt !== null).length;
  const withSchemaCount = articlesList.filter((a) => a.schemaMarkup !== null).length;
  const withFaqCount = articlesList.filter(
    (a) => Array.isArray(a.faqContent) && (a.faqContent as unknown[]).length > 0
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-ui font-bold text-text">GEO / LLMO Optimizasyon</h2>
        <p className="text-sm text-muted font-ui mt-1">
          ChatGPT, Perplexity ve Gemini gibi AI arama motorlarında görünürlüğünüzü artırın.
        </p>
      </div>

      {/* Özet kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted font-ui uppercase tracking-wider">Ort. GEO Skoru</p>
          <div className="mt-2 flex items-end gap-2">
            <span
              className={`text-3xl font-display font-bold ${
                avgGeoScore >= 70
                  ? "text-emerald"
                  : avgGeoScore >= 40
                  ? "text-yellow-400"
                  : "text-red-400"
              }`}
            >
              {withGeoScore.length > 0 ? avgGeoScore : "—"}
            </span>
            {withGeoScore.length > 0 && (
              <span className="text-xs text-muted font-ui mb-1">/ 100</span>
            )}
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-elevated overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                avgGeoScore >= 70
                  ? "bg-emerald"
                  : avgGeoScore >= 40
                  ? "bg-yellow-400"
                  : "bg-red-400"
              }`}
              style={{ width: `${avgGeoScore}%` }}
            />
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted font-ui uppercase tracking-wider">Optimize Edilmiş</p>
          <p className="text-3xl font-display font-bold text-emerald mt-2">{optimizedCount}</p>
          <p className="text-xs text-muted font-ui mt-1">/ {totalArticles} makale</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted font-ui uppercase tracking-wider">Schema Markup&apos;lı</p>
          <p className="text-3xl font-display font-bold text-tech-blue mt-2">{withSchemaCount}</p>
          <p className="text-xs text-muted font-ui mt-1">JSON-LD eklendi</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted font-ui uppercase tracking-wider">FAQ&apos;lu</p>
          <p className="text-3xl font-display font-bold text-gold mt-2">{withFaqCount}</p>
          <p className="text-xs text-muted font-ui mt-1">Soru-cevap bloğu</p>
        </div>
      </div>

      {/* Bilgi kutusu — GEO nedir */}
      {totalArticles === 0 && (
        <div className="bg-surface border border-border rounded-xl p-6 text-center">
          <p className="text-2xl mb-2">🌐</p>
          <h3 className="text-text font-ui font-semibold">Henüz makale yok</h3>
          <p className="text-sm text-muted font-ui mt-1">
            GEO analizi için önce sitenizi tarayın.
          </p>
        </div>
      )}

      {/* GEO Tablosu */}
      {totalArticles > 0 && project && (
        <GeoTable articles={articlesList} projectId={project.id} />
      )}
    </div>
  );
}
