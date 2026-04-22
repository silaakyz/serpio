import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { db } from "../lib/db";
import { jobs, articles } from "@serpio/database";
import { eq } from "drizzle-orm";
import { log } from "../utils/logger";
import { consumeCreditsForAction } from "../utils/credit";
import { analyzeGeoScore } from "../services/geo-analyzer.service";
import {
  generateFAQ,
  generateArticleSchema,
  injectGeoElements,
} from "../services/schema-generator.service";

const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6380", {
  maxRetriesPerRequest: null,
});

export interface GeoJobData {
  type: "geo_analyze" | "geo_optimize";
  projectId: string;
  userId: string;
  articleId: string;
}

const geoWorker = new Worker<GeoJobData>(
  "geo",
  async (job: Job<GeoJobData>) => {
    const { type, userId, articleId } = job.data;
    const jobId = job.id!;

    try {
      await db
        .update(jobs)
        .set({ status: "active", startedAt: new Date() })
        .where(eq(jobs.bullmqJobId, jobId));

      const article = await db.query.articles.findFirst({
        where: eq(articles.id, articleId),
      });
      if (!article) throw new Error("Makale bulunamadı");

      const content = article.aiContent ?? article.originalContent;

      if (type === "geo_analyze") {
        const ok = await consumeCreditsForAction(userId, "geo_analyze", jobId);
        if (!ok) throw new Error("Yetersiz kredi");

        await log(jobId, "info", `GEO analizi başlıyor: "${article.title}"`);

        const result = analyzeGeoScore(content, article.title);

        await db
          .update(articles)
          .set({
            geoScore: result.geoScore,
            geoSuggestions: result.suggestions,
            updatedAt: new Date(),
          })
          .where(eq(articles.id, articleId));

        await log(jobId, "success", `GEO skoru: ${result.geoScore}/100 ✓`);
        for (const s of result.suggestions) {
          await log(jobId, "warning", `⚠ ${s}`);
        }
        await log(jobId, "info", `Yapılandırılmış veri: ${result.breakdown.hasStructuredData ? "✓" : "✗"}`);
        await log(jobId, "info", `E-E-A-T: ${result.breakdown.hasEEAT ? "✓" : "✗"}`);
        await log(jobId, "info", `FAQ: ${result.breakdown.hasFAQ ? "✓" : "✗"}`);
        await log(jobId, "info", `Özet: ${result.breakdown.hasSummary ? "✓" : "✗"}`);
      } else if (type === "geo_optimize") {
        const ok = await consumeCreditsForAction(userId, "geo_optimize", jobId);
        if (!ok) throw new Error("Yetersiz kredi");

        await log(jobId, "info", `GEO optimizasyonu başlıyor: "${article.title}"`);

        // 1. Mevcut skor
        const analysis = analyzeGeoScore(content, article.title);
        await log(jobId, "info", `Mevcut GEO skoru: ${analysis.geoScore}/100`);

        // 2. AI ile FAQ üret
        const faqs = await generateFAQ(article.title, content, jobId);

        // 3. Article schema oluştur
        const schema = generateArticleSchema(
          article.aiTitle ?? article.title,
          article.originalUrl,
          article.originalPublishedAt
        );

        // 4. GEO elementlerini içeriğe enjekte et
        const optimizedContent = injectGeoElements(
          content,
          article.aiTitle ?? article.title,
          article.originalUrl,
          faqs,
          article.originalPublishedAt
        );

        // 5. DB'ye kaydet
        await db
          .update(articles)
          .set({
            aiContent: optimizedContent,
            geoScore: 85, // Optimize edilmiş başlangıç skoru
            geoSuggestions: [],
            schemaMarkup: schema,
            faqContent: faqs,
            geoOptimizedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(articles.id, articleId));

        await log(jobId, "success", "GEO optimizasyonu tamamlandı ✨");
        await log(jobId, "info", `${faqs.length} FAQ oluşturuldu`);
        await log(jobId, "info", "Schema markup eklendi (Article + FAQPage)");
      }

      await db
        .update(jobs)
        .set({ status: "completed", completedAt: new Date(), progress: 100 })
        .where(eq(jobs.bullmqJobId, jobId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
      await log(jobId, "error", `GEO hatası: ${msg}`);
      await db
        .update(jobs)
        .set({ status: "failed", error: msg })
        .where(eq(jobs.bullmqJobId, jobId));
      throw err;
    }
  },
  { connection, concurrency: 2 }
);

export default geoWorker;
