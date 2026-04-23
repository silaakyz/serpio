import { db } from "../lib/db";
import { articles, gscMetrics, competitorChanges } from "@serpio/database";
import { eq, and, gte } from "drizzle-orm";
import { log } from "../utils/logger";

interface DecayPrediction {
  articleId: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  predictedDecayDate: Date | null;
  factors: {
    contentAge: number;
    positionTrend: number;
    competitorActivity: number;
    geoScore: number;
  };
}

export async function predictDecayRisk(
  articleId: string,
): Promise<DecayPrediction> {
  const article = await db.query.articles.findFirst({
    where: eq(articles.id, articleId),
  });
  if (!article) throw new Error("Makale bulunamadı");

  let riskScore = 0;
  const factors = { contentAge: 0, positionTrend: 0, competitorActivity: 0, geoScore: 0 };

  // 1. İçerik Yaşı (0-30 puan)
  const contentDate = article.lastModifiedAt || article.originalPublishedAt || article.scrapedAt;
  const ageMonths = (Date.now() - contentDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (ageMonths > 12)     factors.contentAge = 30;
  else if (ageMonths > 9) factors.contentAge = 20;
  else if (ageMonths > 6) factors.contentAge = 10;
  else if (ageMonths > 3) factors.contentAge = 5;
  riskScore += factors.contentAge;

  // 2. GSC Pozisyon Trendi (0-35 puan)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const recentMetrics = await db.query.gscMetrics.findMany({
    where: and(
      eq(gscMetrics.articleId, articleId),
      gte(gscMetrics.date, thirtyDaysAgo.toISOString().split("T")[0])
    ),
  });
  const prevMetrics = await db.query.gscMetrics.findMany({
    where: and(
      eq(gscMetrics.articleId, articleId),
      gte(gscMetrics.date, sixtyDaysAgo.toISOString().split("T")[0])
    ),
  });

  if (recentMetrics.length > 0 && prevMetrics.length > 0) {
    const recentAvg = recentMetrics.reduce((s, m) => s + (m.position || 0), 0) / recentMetrics.length;
    const prevAvg   = prevMetrics.reduce((s, m) => s + (m.position || 0), 0) / prevMetrics.length;
    const drop = recentAvg - prevAvg;
    if (drop > 10)      factors.positionTrend = 35;
    else if (drop > 5)  factors.positionTrend = 25;
    else if (drop > 2)  factors.positionTrend = 10;
    else if (drop > 0)  factors.positionTrend = 5;
  } else if (!article.currentPosition) {
    factors.positionTrend = 15;
  } else if (article.currentPosition > 20) {
    factors.positionTrend = 20;
  }
  riskScore += factors.positionTrend;

  // 3. Rakip Aktivitesi (0-25 puan)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const articleKeywords = (article.aiKeywords || []).map((k) => k.toLowerCase());

  if (articleKeywords.length > 0) {
    const recentCompChanges = await db.query.competitorChanges.findMany({
      where: gte(competitorChanges.detectedAt, sevenDaysAgo),
      limit: 200,
    });
    const relevantChanges = recentCompChanges.filter(
      (c) => c.summary && articleKeywords.some((kw) => c.summary!.toLowerCase().includes(kw))
    );
    if (relevantChanges.length >= 3)      factors.competitorActivity = 25;
    else if (relevantChanges.length >= 2) factors.competitorActivity = 15;
    else if (relevantChanges.length >= 1) factors.competitorActivity = 8;
  }
  riskScore += factors.competitorActivity;

  // 4. GEO Skoru (0-10 puan)
  if (article.geoScore !== null && article.geoScore !== undefined) {
    if (article.geoScore < 30)      factors.geoScore = 10;
    else if (article.geoScore < 50) factors.geoScore = 5;
    else if (article.geoScore < 70) factors.geoScore = 2;
  } else {
    factors.geoScore = 5;
  }
  riskScore += factors.geoScore;

  // Risk seviyesi
  let riskLevel: "low" | "medium" | "high" | "critical";
  if (riskScore >= 70)      riskLevel = "critical";
  else if (riskScore >= 50) riskLevel = "high";
  else if (riskScore >= 30) riskLevel = "medium";
  else                      riskLevel = "low";

  // Tahmini düşüş tarihi
  let predictedDecayDate: Date | null = null;
  if (riskScore >= 50) {
    const daysUntilDecay = Math.max(7, Math.round((100 / riskScore) * 30));
    predictedDecayDate = new Date();
    predictedDecayDate.setDate(predictedDecayDate.getDate() + daysUntilDecay);
  }

  return { articleId, riskScore, riskLevel, predictedDecayDate, factors };
}

export async function analyzeProjectDecayRisk(
  projectId: string,
  jobId: string
): Promise<void> {
  await log(jobId, "info", "Decay risk analizi başlıyor...");

  const projectArticles = await db.query.articles.findMany({
    where: eq(articles.projectId, projectId),
  });

  await log(jobId, "info", `${projectArticles.length} makale analiz edilecek...`);

  let highRiskCount = 0;

  for (const article of projectArticles) {
    const prediction = await predictDecayRisk(article.id);

    await db.update(articles)
      .set({
        decayRiskScore:     prediction.riskScore,
        decayRiskLevel:     prediction.riskLevel,
        predictedDecayDate: prediction.predictedDecayDate,
        updatedAt:          new Date(),
      })
      .where(eq(articles.id, article.id));

    if (prediction.riskLevel === "high" || prediction.riskLevel === "critical") {
      highRiskCount++;
    }
  }

  await log(jobId, "success",
    `Decay analizi tamamlandı: ${projectArticles.length} makale, ${highRiskCount} yüksek riskli ✓`
  );
}
