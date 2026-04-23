import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  db, projects, articles, cannibalizationIssues,
  eq, and, desc,
} from "@serpio/database";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId zorunlu" }, { status: 400 });

  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  // Decay risk makaleler
  const decayArticles = await db.query.articles.findMany({
    where: eq(articles.projectId, projectId),
    orderBy: [desc(articles.decayRiskScore)],
    limit: 100,
    columns: {
      id: true, title: true, aiTitle: true, originalUrl: true, slug: true,
      decayRiskScore: true, decayRiskLevel: true, predictedDecayDate: true,
      staleStatus: true, geoScore: true, monthlyClicks: true, currentPosition: true,
      status: true, aiContent: true,
    },
  });

  // Kanibalizasyon sorunları
  const cannibalIssues = await db.query.cannibalizationIssues.findMany({
    where: and(
      eq(cannibalizationIssues.projectId, projectId),
      eq(cannibalizationIssues.status, "open")
    ),
    orderBy: [desc(cannibalizationIssues.similarityScore)],
    limit: 50,
    with: {
      articleA: { columns: { id: true, title: true, aiTitle: true, originalUrl: true } },
      articleB: { columns: { id: true, title: true, aiTitle: true, originalUrl: true } },
    },
  });

  // Öncelik listesi — hesapla
  const STALE_WEIGHT: Record<string, number> = { fresh: 0, stale_3m: 20, stale_6m: 40, stale_9m_plus: 60 };

  const priorities = decayArticles
    .map((article) => {
      let score = 0;
      const reasons: string[] = [];

      const monthlyClicks = article.monthlyClicks || 0;
      const decayRisk     = article.decayRiskScore || 0;
      const geoScore      = article.geoScore ?? 50;
      const staleWeight   = STALE_WEIGHT[article.staleStatus] ?? 0;

      if (monthlyClicks > 100) { score += 30; reasons.push(`Ayda ${monthlyClicks} tıklama`); }
      else if (monthlyClicks > 20) { score += 15; reasons.push(`Ayda ${monthlyClicks} tıklama`); }

      score += Math.round(decayRisk * 0.3);
      if (decayRisk >= 70)      reasons.push("Kritik sıralama düşüş riski");
      else if (decayRisk >= 50) reasons.push("Yüksek sıralama düşüş riski");
      else if (decayRisk >= 30) reasons.push("Orta sıralama düşüş riski");

      score += staleWeight;
      if (staleWeight >= 60)      reasons.push("9+ ay güncellenmedi");
      else if (staleWeight >= 40) reasons.push("6-9 ay eski içerik");
      else if (staleWeight >= 20) reasons.push("3-6 ay eski içerik");

      if (geoScore < 40) { score += 20; reasons.push(`Düşük GEO: ${geoScore}/100`); }
      else if (geoScore < 60) { score += 10; reasons.push(`GEO iyileştirilebilir: ${geoScore}/100`); }

      if (article.aiContent && article.status === "ready") {
        score += 15;
        reasons.push("AI içeriği hazır — yayınlanmayı bekliyor");
      }

      let suggestedAction = "İçeriği Güncelle";
      if (article.status === "ready")   suggestedAction = "Yayınla";
      else if (geoScore < 50)           suggestedAction = "GEO Optimize Et";
      else if (staleWeight >= 40)       suggestedAction = "AI ile Güncelle";

      return {
        articleId:      article.id,
        title:          article.aiTitle || article.title,
        url:            article.originalUrl,
        priorityScore:  Math.min(100, score),
        reasons,
        suggestedAction,
      };
    })
    .filter((p) => p.priorityScore > 10 && p.reasons.length > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 20);

  return NextResponse.json({
    decayRisk:       decayArticles,
    cannibalization: cannibalIssues,
    priorities,
  });
}
