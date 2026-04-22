import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { db } from "../lib/db";
import { articles, jobs, siteAuditIssues, siteAuditSnapshots } from "@serpio/database";
import { eq } from "drizzle-orm";
import { UniversalScraper } from "../services/scraper.service";
import { auditHtml, calculateProjectHealthScore, PageAuditResult } from "../services/audit-analyzer.service";
import { log } from "../utils/logger";
import { consumeCredits, refundCredits } from "../utils/credit";

const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6380", {
  maxRetriesPerRequest: null,
});

interface ScrapeJobData {
  projectId: string;
  userId: string;
  url: string;
  jobDbId: string;
  maxDepth?: number;
  maxPages?: number;
}

const scrapeWorker = new Worker<ScrapeJobData>(
  "scrape",
  async (job: Job<ScrapeJobData>) => {
    const { projectId, userId, url, jobDbId, maxDepth, maxPages } = job.data;
    const jobId = jobDbId;

    await db.update(jobs)
      .set({ status: "active", startedAt: new Date(), progress: 0 })
      .where(eq(jobs.id, jobId))
      .catch(() => undefined);

    const creditCost = 10;

    try {
      await log(jobId, "info", `Scraping başlatılıyor → ${url}`);

      const credited = await consumeCredits(userId, creditCost, `Scraping: ${url}`, jobId);
      if (!credited) {
        await log(jobId, "error", "Yetersiz kredi! İşlem iptal edildi.");
        throw new Error("Yetersiz kredi");
      }
      await log(jobId, "success", `${creditCost} kredi kullanıldı`);

      const scraper = new UniversalScraper();
      await scraper.initialize();
      await log(jobId, "info", "Chromium tarayıcısı başlatıldı");
      await log(jobId, "info", "robots.txt kontrol ediliyor...");

      const scrapedArticles = await scraper.scrape(
        url,
        {
          maxDepth:    maxDepth ?? 2,
          maxPages:    maxPages ?? 100,
          concurrency: 3,
          delay:       1200,
        },
        async (current, total, pageUrl) => {
          const shortUrl = (() => {
            try { return new URL(pageUrl).pathname; } catch { return pageUrl; }
          })();
          await log(jobId, "success", `[${current}/${total}] Çekildi → ${shortUrl}`);
          await job.updateProgress(Math.round((current / total) * 85));
        }
      );

      await scraper.close();
      await log(jobId, "info", `Tarama tamamlandı — ${scrapedArticles.length} sayfa işlendi`);

      // ─── Makaleleri kaydet ────────────────────────────────────────────────
      let savedCount   = 0;
      let skippedCount = 0;
      const savedArticleMap = new Map<string, string>(); // url → articleId

      for (const article of scrapedArticles) {
        const existing = await db.query.articles.findFirst({
          where: eq(articles.originalUrl, article.url),
          columns: { id: true },
        }).catch(() => null);

        if (existing) {
          savedArticleMap.set(article.url, existing.id);
          skippedCount++;
          continue;
        }

        const staleStatus = calcStaleStatus(article.lastModifiedAt ?? article.publishedAt);

        const [saved] = await db.insert(articles).values({
          projectId,
          title:           article.title || "Başlıksız",
          originalContent: article.content || article.textContent,
          originalUrl:     article.url,
          slug:            article.slug || null,
          excerpt:         article.excerpt || null,
          originalPublishedAt: article.publishedAt,
          lastModifiedAt:      article.lastModifiedAt,
          staleStatus,
          status: "scraped",
        }).returning({ id: articles.id }).catch(() => []);

        if (saved) {
          savedArticleMap.set(article.url, saved.id);
          savedCount++;
        } else {
          skippedCount++;
        }
      }

      await log(jobId, "success", `${savedCount} yeni makale kaydedildi`);
      if (skippedCount > 0) {
        await log(jobId, "info", `${skippedCount} makale atlandı (zaten mevcut veya hata)`);
      }

      // ─── Teknik SEO Audit ─────────────────────────────────────────────────
      await log(jobId, "info", "Teknik SEO analizi yapılıyor...");

      const allTitles       = new Set<string>();
      const allDescriptions = new Set<string>();
      const auditResults: PageAuditResult[] = [];

      for (const article of scrapedArticles) {
        if (!article.html) continue;
        const result = auditHtml(
          article.html,
          article.url,
          article.loadTime ?? 0,
          allTitles,
          allDescriptions
        );
        auditResults.push(result);
      }

      // Audit sorunlarını DB'ye kaydet
      for (const result of auditResults) {
        const articleId = savedArticleMap.get(result.url) ?? null;
        for (const issue of result.issues) {
          await db.insert(siteAuditIssues).values({
            projectId,
            articleId,
            pageUrl:   result.url,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            issueType: issue.issueType as any,
            severity:  issue.severity,
            details:   issue.details,
          }).onConflictDoNothing().catch(() => undefined);
        }
      }

      // Snapshot kaydet
      const allIssues    = auditResults.flatMap((r) => r.issues);
      const healthScore  = calculateProjectHealthScore(auditResults);
      const avgLoadTime  = auditResults.length
        ? auditResults.reduce((s, r) => s + r.loadTime, 0) / auditResults.length
        : 0;

      await db.insert(siteAuditSnapshots).values({
        projectId,
        healthScore,
        totalIssues:   allIssues.length,
        criticalCount: allIssues.filter((i) => i.severity === "critical").length,
        warningCount:  allIssues.filter((i) => i.severity === "warning").length,
        infoCount:     allIssues.filter((i) => i.severity === "info").length,
        pagesAudited:  auditResults.length,
        avgLoadTime:   Math.round(avgLoadTime),
      }).catch(() => undefined);

      await log(jobId, "success", `Site Sağlığı Skoru: ${healthScore}/100 ✓`);
      await log(jobId, "info",
        `${allIssues.filter((i) => i.severity === "critical").length} kritik, ` +
        `${allIssues.filter((i) => i.severity === "warning").length} uyarı`
      );

      await log(jobId, "success", "İşlem başarıyla tamamlandı ✨");

      await db.update(jobs)
        .set({ status: "completed", completedAt: new Date(), progress: 100 })
        .where(eq(jobs.id, jobId))
        .catch(() => undefined);

      return { articlesFound: scrapedArticles.length, articlesSaved: savedCount, healthScore };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await log(jobId, "error", `Hata: ${message}`);
      await db.update(jobs)
        .set({ status: "failed", error: message })
        .where(eq(jobs.id, jobId))
        .catch(() => undefined);
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
