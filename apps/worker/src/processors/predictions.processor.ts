import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { db } from "../lib/db";
import { jobs } from "@serpio/database";
import { eq } from "drizzle-orm";
import { analyzeProjectDecayRisk } from "../services/decay-predictor.service";
import { detectCannibalization } from "../services/cannibalization-detector.service";
import { log } from "../utils/logger";
import { consumeCreditsForAction } from "../utils/credit";

const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6380", {
  maxRetriesPerRequest: null,
});

interface PredictionsJobData {
  type: "decay_analysis" | "cannibalization" | "full_analysis";
  projectId: string;
  userId: string;
  jobDbId: string;
}

const predictionsWorker = new Worker<PredictionsJobData>(
  "predictions",
  async (job: Job<PredictionsJobData>) => {
    const { type, projectId, userId, jobDbId } = job.data;

    await db.update(jobs)
      .set({ status: "active", startedAt: new Date(), progress: 0 })
      .where(eq(jobs.id, jobDbId))
      .catch(() => undefined);

    try {
      if (type === "decay_analysis" || type === "full_analysis") {
        const ok = await consumeCreditsForAction(userId, "cannibalization_analysis", jobDbId);
        if (!ok) throw new Error("Yetersiz kredi");
        await job.updateProgress(10);
        await analyzeProjectDecayRisk(projectId, jobDbId);
        await job.updateProgress(60);
      }

      if (type === "cannibalization" || type === "full_analysis") {
        await detectCannibalization(projectId, jobDbId);
        await job.updateProgress(90);
      }

      await log(jobDbId, "success", "Tahmin analizi tamamlandı ✨");
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

predictionsWorker.on("failed", (job, err) => {
  console.error(`[predictions] Job ${job?.id} başarısız:`, err.message);
});

predictionsWorker.on("completed", (job) => {
  console.log(`[predictions] Job ${job.id} tamamlandı`);
});

export default predictionsWorker;
