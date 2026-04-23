import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { db } from "../lib/db";
import { jobs, competitors } from "@serpio/database";
import { eq } from "drizzle-orm";
import { crawlCompetitor } from "../services/competitor-tracker.service";
import { analyzeContentGaps } from "../services/content-gap.service";
import { log } from "../utils/logger";
import { consumeCreditsForAction } from "../utils/credit";

const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6380", {
  maxRetriesPerRequest: null,
});

interface CompetitorJobData {
  type: "crawl_competitor" | "content_gap" | "crawl_all";
  projectId: string;
  userId: string;
  jobDbId: string;
  competitorId?: string;
}

const competitorWorker = new Worker<CompetitorJobData>(
  "competitor",
  async (job: Job<CompetitorJobData>) => {
    const { type, projectId, userId, jobDbId, competitorId } = job.data;

    await db.update(jobs)
      .set({ status: "active", startedAt: new Date(), progress: 0 })
      .where(eq(jobs.id, jobDbId))
      .catch(() => undefined);

    try {
      if (type === "crawl_competitor" && competitorId) {
        const ok = await consumeCreditsForAction(userId, "competitor_crawl", jobDbId);
        if (!ok) throw new Error("Yetersiz kredi");
        await job.updateProgress(10);
        await crawlCompetitor(competitorId, jobDbId);

      } else if (type === "crawl_all") {
        const projectCompetitors = await db.query.competitors.findMany({
          where: eq(competitors.projectId, projectId),
        });
        if (projectCompetitors.length === 0) {
          await log(jobDbId, "warning", "Projede hiç rakip bulunamadı.");
        }
        let i = 0;
        for (const competitor of projectCompetitors) {
          const ok = await consumeCreditsForAction(userId, "competitor_crawl", jobDbId);
          if (!ok) {
            await log(jobDbId, "warning", "Kredi yetersiz, kalan rakipler atlandı");
            break;
          }
          await crawlCompetitor(competitor.id, jobDbId);
          i++;
          await job.updateProgress(Math.round((i / projectCompetitors.length) * 90));
        }

      } else if (type === "content_gap") {
        const ok = await consumeCreditsForAction(userId, "content_gap_analysis", jobDbId);
        if (!ok) throw new Error("Yetersiz kredi");
        await job.updateProgress(10);
        await analyzeContentGaps(projectId, jobDbId);
      }

      await log(jobDbId, "success", "İşlem tamamlandı ✨");
      await db.update(jobs)
        .set({ status: "completed", completedAt: new Date(), progress: 100 })
        .where(eq(jobs.id, jobDbId))
        .catch(() => undefined);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await log(jobDbId, "error", `Hata: ${message}`);
      await db.update(jobs)
        .set({ status: "failed", error: message })
        .where(eq(jobs.id, jobDbId))
        .catch(() => undefined);
      throw err;
    }
  },
  { connection, concurrency: 1 }
);

competitorWorker.on("failed", (job, err) => {
  console.error(`[competitor] Job ${job?.id} başarısız:`, err.message);
});

competitorWorker.on("completed", (job) => {
  console.log(`[competitor] Job ${job.id} tamamlandı`);
});

export default competitorWorker;
