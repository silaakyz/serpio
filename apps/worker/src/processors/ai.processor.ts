import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { db } from "../lib/db";
import { jobs, articles } from "@serpio/database";
import { eq } from "drizzle-orm";
import { generateStyleGuide } from "../services/style-guide.service";
import { rewriteArticle } from "../services/ai-rewrite.service";
import { generateLinkSuggestions } from "../services/linker.service";
import { log } from "../utils/logger";
import { consumeCredits } from "../utils/credit";

const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6380", {
  maxRetriesPerRequest: null,
});

interface AiJobData {
  type: "style_guide" | "analyze" | "rewrite" | "rewrite_all";
  projectId: string;
  userId: string;
  articleId?: string;
  jobDbId?: string;
}

const aiWorker = new Worker<AiJobData>(
  "ai",
  async (job: Job<AiJobData>) => {
    const { type, projectId, userId, articleId, jobDbId } = job.data;

    // BullMQ job ID veya embed edilmiş DB ID ile jobs tablosunu güncelle
    const jobFilter = jobDbId
      ? eq(jobs.id, jobDbId)
      : eq(jobs.bullmqJobId, job.id!);

    // Hangi jobId'yi loglarda kullanacağımızı bul
    let dbJobId = jobDbId ?? "";
    if (!dbJobId) {
      const jobRecord = await db.query.jobs.findFirst({
        where: eq(jobs.bullmqJobId, job.id!),
      });
      dbJobId = jobRecord?.id ?? job.id!;
    }

    try {
      await db.update(jobs).set({ status: "active", startedAt: new Date() }).where(jobFilter);

      if (type === "style_guide") {
        const hasCredits = await consumeCredits(userId, 20, "Stil rehberi oluşturma", dbJobId);
        if (!hasCredits) {
          await log(dbJobId, "error", "Yetersiz kredi!");
          throw new Error("Yetersiz kredi");
        }
        await generateStyleGuide(projectId, dbJobId);
      } else if (type === "rewrite" || type === "analyze") {
        if (!articleId) throw new Error("articleId gerekli");

        const creditCost = type === "analyze" ? 5 : 15;
        const hasCredits = await consumeCredits(userId, creditCost, `AI ${type}: makale`, dbJobId);
        if (!hasCredits) {
          await log(dbJobId, "error", "Yetersiz kredi!");
          throw new Error("Yetersiz kredi");
        }

        await db
          .update(articles)
          .set({ status: "analyzing" })
          .where(eq(articles.id, articleId));

        await rewriteArticle(articleId, projectId, dbJobId);
        await generateLinkSuggestions(articleId, projectId, dbJobId);
      } else if (type === "rewrite_all") {
        const allArticles = await db.query.articles.findMany({
          where: eq(articles.projectId, projectId),
        });

        const toRewrite = allArticles.filter(
          (a) => a.staleStatus !== "fresh" && a.status === "scraped"
        );

        await log(dbJobId, "info", `${toRewrite.length} eski makale yeniden yazılacak`);

        for (let i = 0; i < toRewrite.length; i++) {
          const article = toRewrite[i];

          const hasCredits = await consumeCredits(userId, 15, `AI rewrite: ${article.title}`, dbJobId);
          if (!hasCredits) {
            await log(dbJobId, "warning", `Kredi bitti! ${i}/${toRewrite.length} makale işlendi.`);
            break;
          }

          await db
            .update(articles)
            .set({ status: "analyzing" })
            .where(eq(articles.id, article.id));

          await rewriteArticle(article.id, projectId, dbJobId);
          await generateLinkSuggestions(article.id, projectId, dbJobId);

          await job.updateProgress(Math.round(((i + 1) / toRewrite.length) * 100));
        }
      }

      await log(dbJobId, "success", "AI işlemi tamamlandı ✨");
      await db
        .update(jobs)
        .set({ status: "completed", completedAt: new Date(), progress: 100 })
        .where(jobFilter);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await log(dbJobId, "error", `AI hatası: ${message}`);
      await db.update(jobs).set({ status: "failed", error: message }).where(jobFilter);
      throw err;
    }
  },
  { connection, concurrency: 1 }
);

export default aiWorker;
