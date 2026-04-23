import { db } from "../lib/db";
import { articles, cannibalizationIssues } from "@serpio/database";
import { eq, and } from "drizzle-orm";
import { log } from "../utils/logger";

function calculateSimilarity(
  keywordsA: string[],
  keywordsB: string[]
): { score: number; overlapping: string[] } {
  if (keywordsA.length === 0 || keywordsB.length === 0) return { score: 0, overlapping: [] };

  const setA = new Set(keywordsA.map((k) => k.toLowerCase()));
  const setB = new Set(keywordsB.map((k) => k.toLowerCase()));

  const intersection = [...setA].filter((k) => setB.has(k));
  const union        = new Set([...setA, ...setB]);

  return {
    score:       intersection.length / union.size,
    overlapping: intersection,
  };
}

export async function detectCannibalization(
  projectId: string,
  jobId: string
): Promise<void> {
  await log(jobId, "info", "Kanibalizasyon analizi başlıyor...");

  const projectArticles = await db.query.articles.findMany({
    where: eq(articles.projectId, projectId),
  });

  await log(jobId, "info", `${projectArticles.length} makale arasında çakışma aranıyor...`);

  let detected = 0;
  let saved    = 0;

  for (let i = 0; i < projectArticles.length; i++) {
    for (let j = i + 1; j < projectArticles.length; j++) {
      const artA = projectArticles[i];
      const artB = projectArticles[j];

      const keywordsA = artA.aiKeywords || [];
      const keywordsB = artB.aiKeywords || [];

      if (keywordsA.length === 0 || keywordsB.length === 0) continue;

      const { score, overlapping } = calculateSimilarity(keywordsA, keywordsB);

      if (score >= 0.4 && overlapping.length >= 2) {
        detected++;

        // Zaten kayıtlı mı?
        const existing = await db.query.cannibalizationIssues.findFirst({
          where: and(
            eq(cannibalizationIssues.projectId, projectId),
            eq(cannibalizationIssues.articleIdA, artA.id),
            eq(cannibalizationIssues.articleIdB, artB.id),
          ),
        });

        if (!existing) {
          const recommendation =
            `"${artA.title}" ile "${artB.title}" aynı konuyu hedefliyor ` +
            `(${Math.round(score * 100)}% benzerlik). ` +
            `Örtüşen kelimeler: ${overlapping.slice(0, 5).join(", ")}. ` +
            `Birini canonical olarak belirleyin veya içerikleri farklılaştırın.`;

          await db.insert(cannibalizationIssues).values({
            projectId,
            articleIdA:          artA.id,
            articleIdB:          artB.id,
            overlappingKeywords: overlapping,
            similarityScore:     score,
            recommendation,
            status:              "open",
          }).catch(() => undefined);

          saved++;
        }
      }
    }
  }

  await log(jobId, "success",
    `Kanibalizasyon analizi tamamlandı: ${detected} tespit, ${saved} yeni kayıt ✓`
  );
}
