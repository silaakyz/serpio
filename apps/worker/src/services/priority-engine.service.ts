import { db } from "../lib/db";
import { articles } from "@serpio/database";
import { eq } from "drizzle-orm";

export interface PriorityItem {
  articleId: string;
  title: string;
  url: string;
  priorityScore: number;
  reasons: string[];
  suggestedAction: string;
}

const STALE_WEIGHT: Record<string, number> = {
  fresh:        0,
  stale_3m:    20,
  stale_6m:    40,
  stale_9m_plus: 60,
};

export async function calculateUpdatePriorities(
  projectId: string
): Promise<PriorityItem[]> {
  const projectArticles = await db.query.articles.findMany({
    where: eq(articles.projectId, projectId),
  });

  const priorities: PriorityItem[] = [];

  for (const article of projectArticles) {
    let priorityScore = 0;
    const reasons: string[] = [];

    const monthlyClicks = article.monthlyClicks  || 0;
    const decayRisk     = article.decayRiskScore || 0;
    const geoScore      = article.geoScore       ?? 50;
    const staleWeight   = STALE_WEIGHT[article.staleStatus] ?? 0;

    // Trafik katkısı
    if (monthlyClicks > 100) {
      priorityScore += 30;
      reasons.push(`Ayda ${monthlyClicks} tıklama — yüksek değerli sayfa`);
    } else if (monthlyClicks > 20) {
      priorityScore += 15;
      reasons.push(`Ayda ${monthlyClicks} tıklama`);
    }

    // Decay riski
    priorityScore += Math.round(decayRisk * 0.3);
    if (decayRisk >= 70)      reasons.push("Kritik sıralama düşüş riski");
    else if (decayRisk >= 50) reasons.push("Yüksek sıralama düşüş riski");
    else if (decayRisk >= 30) reasons.push("Orta sıralama düşüş riski");

    // İçerik eskiliği
    priorityScore += staleWeight;
    if (staleWeight >= 60)      reasons.push("İçerik 9+ ay güncellenmedi");
    else if (staleWeight >= 40) reasons.push("İçerik 6-9 ay eski");
    else if (staleWeight >= 20) reasons.push("İçerik 3-6 ay eski");

    // GEO skoru
    if (geoScore < 40) {
      priorityScore += 20;
      reasons.push(`Düşük GEO skoru (${geoScore}/100)`);
    } else if (geoScore < 60) {
      priorityScore += 10;
      reasons.push(`GEO skoru iyileştirilebilir (${geoScore}/100)`);
    }

    // AI hazır ama yayınlanmamış
    if (article.aiContent && article.status === "ready") {
      priorityScore += 15;
      reasons.push("AI güncellemesi hazır — yayınlanmayı bekliyor");
    }

    // Öneri aksiyon
    let suggestedAction = "İçeriği Güncelle";
    if (article.status === "ready")  suggestedAction = "Yayınla";
    else if (geoScore < 50)          suggestedAction = "GEO Optimize Et";
    else if (staleWeight >= 40)      suggestedAction = "AI ile Güncelle";

    if (priorityScore > 10 && reasons.length > 0) {
      priorities.push({
        articleId:      article.id,
        title:          article.aiTitle || article.title,
        url:            article.originalUrl,
        priorityScore:  Math.min(100, priorityScore),
        reasons,
        suggestedAction,
      });
    }
  }

  return priorities
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 20);
}
