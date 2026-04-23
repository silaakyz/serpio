import crypto from "crypto";
import { db } from "../lib/db";
import { competitors, competitorPages, competitorChanges } from "@serpio/database";
import { eq } from "drizzle-orm";
import { UniversalScraper } from "./scraper.service";
import { log } from "../utils/logger";

function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export async function crawlCompetitor(
  competitorId: string,
  jobId: string
): Promise<{ newPages: number; changedPages: number; removedPages: number }> {
  const competitor = await db.query.competitors.findFirst({
    where: eq(competitors.id, competitorId),
  });
  if (!competitor) throw new Error("Rakip bulunamadı");

  await log(jobId, "info", `Rakip taranıyor: ${competitor.name} (${competitor.websiteUrl})`);

  const scraper = new UniversalScraper();
  await scraper.initialize();

  let scrapedArticles: Awaited<ReturnType<typeof scraper.scrape>> = [];
  try {
    scrapedArticles = await scraper.scrape(
      competitor.websiteUrl,
      { maxPages: 50, maxDepth: 2, concurrency: 2, delay: 2000 },
      async (current, total) => {
        if (current % 10 === 0) {
          await log(jobId, "info", `[Rakip] ${current}/${total} sayfa tarandı`);
        }
      }
    );
  } finally {
    await scraper.close();
  }

  await log(jobId, "info", `${scrapedArticles.length} sayfa bulundu — değişiklik analizi yapılıyor...`);

  const existingPages = await db.query.competitorPages.findMany({
    where: eq(competitorPages.competitorId, competitorId),
  });
  const existingUrlMap = new Map(existingPages.map((p) => [p.url, p]));

  let newPages = 0;
  let changedPages = 0;

  for (const scraped of scrapedArticles) {
    const newHash = hashContent(scraped.textContent || scraped.content);
    const existing = existingUrlMap.get(scraped.url);

    if (!existing) {
      // Yeni sayfa — önce insert et, sonra change kaydı oluştur
      const [inserted] = await db.insert(competitorPages).values({
        competitorId,
        url:          scraped.url,
        title:        scraped.title,
        contentHash:  newHash,
        keywords:     [],
        wordCount:    scraped.wordCount || 0,
        lastCheckedAt: new Date(),
      }).returning({ id: competitorPages.id }).catch(() => []);

      if (inserted) {
        await db.insert(competitorChanges).values({
          competitorPageId: inserted.id,
          competitorId,
          changeType: "new_page",
          newHash,
          summary: `Yeni sayfa keşfedildi: "${scraped.title}"`,
        }).catch(() => undefined);
        newPages++;
      }
      existingUrlMap.delete(scraped.url);

    } else if (existing.contentHash !== newHash) {
      const changeType = existing.title !== scraped.title ? "title_changed" : "content_updated";
      const summary = changeType === "title_changed"
        ? `Başlık değişti: "${existing.title}" → "${scraped.title}"`
        : "İçerik güncellendi";

      await db.update(competitorPages)
        .set({
          contentHash:   newHash,
          title:         scraped.title,
          lastChangedAt: new Date(),
          lastCheckedAt: new Date(),
        })
        .where(eq(competitorPages.id, existing.id));

      await db.insert(competitorChanges).values({
        competitorPageId: existing.id,
        competitorId,
        changeType,
        oldHash: existing.contentHash || "",
        newHash,
        summary,
      }).catch(() => undefined);

      changedPages++;
      existingUrlMap.delete(scraped.url);
    } else {
      await db.update(competitorPages)
        .set({ lastCheckedAt: new Date() })
        .where(eq(competitorPages.id, existing.id));
      existingUrlMap.delete(scraped.url);
    }
  }

  // Artık erişilemeyen sayfalar
  let removedPages = 0;
  for (const [, page] of existingUrlMap) {
    await db.update(competitorPages)
      .set({ status: "removed", lastCheckedAt: new Date() })
      .where(eq(competitorPages.id, page.id));

    await db.insert(competitorChanges).values({
      competitorPageId: page.id,
      competitorId,
      changeType: "removed",
      oldHash: page.contentHash || "",
      summary: `Sayfa kaldırıldı: "${page.title}"`,
    }).catch(() => undefined);

    removedPages++;
  }

  await db.update(competitors)
    .set({ lastCrawledAt: new Date(), totalPages: scrapedArticles.length })
    .where(eq(competitors.id, competitorId));

  await log(jobId, "success",
    `Rakip tarama tamamlandı: ${newPages} yeni, ${changedPages} değişti, ${removedPages} kaldırıldı`
  );

  return { newPages, changedPages, removedPages };
}
