import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { db } from "../lib/db";
import { articles, jobs } from "@serpio/database";
import { eq } from "drizzle-orm";
import { UniversalScraper } from "../services/scraper.service";
import { log } from "../utils/logger";
import { consumeCredits, refundCredits } from "../utils/credit";

const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6380", {
  maxRetriesPerRequest: null,
});

interface ScrapeJobData {
  projectId: string;
  userId: string;
  url: string;
  jobDbId: string; // jobs tablosundaki id
  maxDepth?: number;
  maxPages?: number;
}

const scrapeWorker = new Worker<ScrapeJobData>(
  "scrape",
  async (job: Job<ScrapeJobData>) => {

    const { projectId, userId, url, jobDbId, maxDepth, maxPages } = job.data;
    const jobId = jobDbId; // log için jobs tablosundaki id'yi kullan

    // İş durumunu "active" yap
    await db.update(jobs)
      .set({ status: "active", startedAt: new Date(), progress: 0 })
      .where(eq(jobs.id, jobId))
      .catch(() => undefined);

    const creditCost = 10;

    try {
      await log(jobId, "info", `Scraping başlatılıyor → ${url}`);

      // Kredi kontrolü ve tüketimi
      const credited = await consumeCredits(userId, creditCost, `Scraping: ${url}`, jobId);
      if (!credited) {
        await log(jobId, "error", "Yetersiz kredi! İşlem iptal edildi.");
        throw new Error("Yetersiz kredi");
      }
      await log(jobId, "success", `${creditCost} kredi kullanıldı`);

      // Scraper başlat
      const scraper = new UniversalScraper();
      await scraper.initialize();
      await log(jobId, "info", "Chromium tarayıcısı başlatıldı");

      // robots.txt kontrolü
      await log(jobId, "info", "robots.txt kontrol ediliyor...");

      // Scrape et
      const scrapedArticles = await scraper.scrape(
        url,
        {
          maxDepth: maxDepth ?? 2,
          maxPages: maxPages ?? 100,
          concurrency: 3,
          delay: 1200,
        },
        async (current, total, pageUrl) => {
          const shortUrl = (() => {
            try { return new URL(pageUrl).pathname; } catch { return pageUrl; }
          })();
          await log(jobId, "success", `[${current}/${total}] Çekildi → ${shortUrl}`);
          await job.updateProgress(Math.round((current / total) * 90));
        }
      );

      await scraper.close();
      await log(jobId, "info", `Tarama tamamlandı — ${scrapedArticles.length} sayfa işlendi`);

      // Makaleleri DB'ye kaydet
      let savedCount = 0;
      let skippedCount = 0;

      for (const article of scrapedArticles) {
        // Aynı URL zaten varsa atla
        const existing = await db.query.articles.findFirst({
          where: eq(articles.originalUrl, article.url),
        }).catch(() => null);

        if (existing) {
          skippedCount++;
          continue;
        }

        const staleStatus = calcStaleStatus(article.lastModifiedAt ?? article.publishedAt);

        await db.insert(articles).values({
          projectId,
          title: article.title || "Başlıksız",
          originalContent: article.content || article.textContent,
          originalUrl: article.url,
          slug: article.slug || null,
          excerpt: article.excerpt || null,
          originalPublishedAt: article.publishedAt,
          lastModifiedAt: article.lastModifiedAt,
          staleStatus,
          status: "scraped",
        }).catch(() => { skippedCount++; });

        savedCount++;
      }

      await log(jobId, "success", `${savedCount} yeni makale kaydedildi`);
      if (skippedCount > 0) {
        await log(jobId, "info", `${skippedCount} makale atlandı (zaten mevcut veya hata)`);
      }
      await log(jobId, "success", "İşlem başarıyla tamamlandı ✨");

      await db.update(jobs)
        .set({ status: "completed", completedAt: new Date(), progress: 100 })
        .where(eq(jobs.id, jobId))
        .catch(() => undefined);

      return { articlesFound: scrapedArticles.length, articlesSaved: savedCount };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await log(jobId, "error", `Hata: ${message}`);
      await db.update(jobs)
        .set({ status: "failed", error: message })
        .where(eq(jobs.id, jobId))
        .catch(() => undefined);
      // Yetersiz kredi hatası değilse → ödenen kredileri iade et
      if (message !== "Yetersiz kredi") {
        await refundCredits(userId, creditCost, `İade: scraping başarısız — ${url}`, jobId)
          .catch(() => undefined);
      }
      throw err;
    }
  },
  {
    connection,
    concurrency: 2,
    limiter: { max: 5, duration: 10_000 },
  }
);

scrapeWorker.on("failed", (job, err) => {
  console.error(`[scrape] Job ${job?.id} başarısız:`, err.message);
});

scrapeWorker.on("completed", (job) => {
  console.log(`[scrape] Job ${job.id} tamamlandı`);
});

function calcStaleStatus(date: Date | null): "fresh" | "stale_3m" | "stale_6m" | "stale_9m_plus" {
  if (!date) return "stale_9m_plus";
  const months = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (months < 3) return "fresh";
  if (months < 6) return "stale_3m";
  if (months < 9) return "stale_6m";
  return "stale_9m_plus";
}

export default scrapeWorker;
