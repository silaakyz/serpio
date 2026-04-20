import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { db } from "../lib/db";
import { jobs, articles, projects } from "@serpio/database";
import { eq } from "drizzle-orm";
import { log } from "../utils/logger";
import { consumeCredits } from "../utils/credit";
import { publishToWordPress } from "../services/wordpress.service";
import { publishToGitHub } from "../services/github.service";
import { publishToFTP } from "../services/ftp.service";
import { publishToWebhook } from "../services/webhook.service";

const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6380", {
  maxRetriesPerRequest: null,
});

interface PublishJobData {
  projectId: string;
  userId: string;
  articleId: string;
  channel?: string;
  jobDbId?: string;
}

// Kanal bazlı kredi maliyeti
const CHANNEL_CREDIT: Record<string, number> = {
  wordpress: 2,
  github:    1,
  gitlab:    1,
  ftp:       2,
  sftp:      2,
  webhook:   1,
  browser_automation: 5,
};

const publishWorker = new Worker<PublishJobData>(
  "publish",
  async (job: Job<PublishJobData>) => {
    const { projectId, userId, articleId, channel, jobDbId } = job.data;

    const jobFilter = jobDbId
      ? eq(jobs.id, jobDbId)
      : eq(jobs.bullmqJobId, job.id!);

    let dbJobId = jobDbId ?? "";
    if (!dbJobId) {
      const jobRecord = await db.query.jobs.findFirst({
        where: eq(jobs.bullmqJobId, job.id!),
      });
      dbJobId = jobRecord?.id ?? job.id!;
    }

    try {
      await db.update(jobs).set({ status: "active", startedAt: new Date() }).where(jobFilter);

      const article = await db.query.articles.findFirst({
        where: eq(articles.id, articleId),
      });
      if (!article) throw new Error("Makale bulunamadı");
      if (article.status !== "ready") throw new Error("Makale henüz hazır değil (status: ready olmalı)");

      const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
      });
      if (!project) throw new Error("Proje bulunamadı");

      const activeChannel = channel || project.activeChannel;
      const publishConfig = project.publishConfig as Record<string, unknown> | null;
      const config = publishConfig?.[activeChannel] as Record<string, unknown> | undefined;

      if (!config) {
        throw new Error(
          `${activeChannel} kanalı yapılandırılmamış. Ayarlar → Yayınlama bölümünden credential girin.`
        );
      }

      await log(dbJobId, "info", `Yayınlanıyor: "${article.aiTitle || article.title}" → ${activeChannel}`);

      const creditCost = CHANNEL_CREDIT[activeChannel] ?? 2;
      const hasCredits = await consumeCredits(userId, creditCost, `Yayınlama (${activeChannel})`, dbJobId);
      if (!hasCredits) throw new Error("Yetersiz kredi");

      const articleData = {
        title: article.aiTitle || article.title,
        content: article.aiContent || article.originalContent,
        slug: article.slug || article.id,
        excerpt: article.excerpt ?? "",
        metaDesc: article.aiMetaDesc ?? "",
        keywords: (article.aiKeywords as string[]) ?? [],
        url: article.originalUrl,
        status: "publish" as const,
        action: "update" as const,
        publishedAt: new Date(),
      };

      let result: { success: boolean; publishedUrl?: string; postId?: number; error?: string };

      switch (activeChannel) {
        case "wordpress":
          result = await publishToWordPress(
            config as unknown as Parameters<typeof publishToWordPress>[0],
            articleData,
            dbJobId
          );
          break;

        case "github":
          result = await publishToGitHub(
            config as unknown as Parameters<typeof publishToGitHub>[0],
            articleData,
            dbJobId
          );
          break;

        case "ftp":
        case "sftp": {
          const ftpCfg = { ...config, protocol: activeChannel } as unknown as Parameters<typeof publishToFTP>[0];
          result = await publishToFTP(ftpCfg, articleData, dbJobId);
          break;
        }

        case "webhook":
          result = await publishToWebhook(
            config as unknown as Parameters<typeof publishToWebhook>[0],
            articleData,
            dbJobId
          );
          break;

        default:
          throw new Error(`${activeChannel} kanalı henüz desteklenmiyor`);
      }

      if (result.success) {
        await db
          .update(articles)
          .set({
            status: "published",
            publishedAt: new Date(),
            publishedUrl: result.publishedUrl ?? null,
            wpPostId: result.postId ?? null,
            updatedAt: new Date(),
          })
          .where(eq(articles.id, articleId));

        await log(dbJobId, "success", `Yayınlandı ✓ → ${result.publishedUrl || activeChannel}`);
      } else {
        throw new Error(result.error ?? "Yayınlama başarısız");
      }

      await db
        .update(jobs)
        .set({ status: "completed", completedAt: new Date(), progress: 100 })
        .where(jobFilter);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await log(dbJobId, "error", `Yayınlama hatası: ${message}`);
      await db.update(jobs).set({ status: "failed", error: message }).where(jobFilter);
      await db
        .update(articles)
        .set({ status: "failed" })
        .where(eq(articles.id, articleId));
      throw err;
    }
  },
  { connection, concurrency: 2 }
);

export default publishWorker;
