import { db } from "../lib/db";
import { articles, externalLinkSources } from "@serpio/database";
import { eq, ne, and } from "drizzle-orm";
import { log } from "../utils/logger";

interface LinkSuggestion {
  text: string;
  url: string;
  keyword: string;
}

export async function generateLinkSuggestions(
  articleId: string,
  projectId: string,
  jobId: string
): Promise<{ internal: LinkSuggestion[]; external: LinkSuggestion[] }> {
  await log(jobId, "info", "İç ve dış link önerileri oluşturuluyor...");

  const article = await db.query.articles.findFirst({
    where: eq(articles.id, articleId),
  });
  if (!article) throw new Error("Makale bulunamadı");

  const content = article.aiContent || article.originalContent;
  const contentLower = content.toLowerCase();

  // İç link önerileri: diğer makalelerin AI anahtar kelimeleri
  const otherArticles = await db.query.articles.findMany({
    where: and(eq(articles.projectId, projectId), ne(articles.id, articleId)),
  });

  const internalLinks: LinkSuggestion[] = [];
  const seenKeywords = new Set<string>();

  for (const other of otherArticles) {
    const keywords: string[] = (other.aiKeywords as string[]) ?? [];
    for (const kw of keywords) {
      if (
        !seenKeywords.has(kw.toLowerCase()) &&
        contentLower.includes(kw.toLowerCase()) &&
        internalLinks.length < 5
      ) {
        seenKeywords.add(kw.toLowerCase());
        internalLinks.push({ text: kw, url: other.originalUrl, keyword: kw });
      }
    }
  }

  // Dış link önerileri: external_link_sources tablosundan
  const extSources = await db.query.externalLinkSources.findMany({
    where: and(
      eq(externalLinkSources.projectId, projectId),
      eq(externalLinkSources.isActive, true)
    ),
  });

  const externalLinks: LinkSuggestion[] = [];
  for (const source of extSources) {
    if (
      contentLower.includes(source.keyword.toLowerCase()) &&
      externalLinks.length < 3
    ) {
      externalLinks.push({
        text: source.label ?? source.keyword,
        url: source.url,
        keyword: source.keyword,
      });
    }
  }

  await db
    .update(articles)
    .set({
      internalLinks,
      externalLinks,
      updatedAt: new Date(),
    })
    .where(eq(articles.id, articleId));

  await log(
    jobId,
    "success",
    `${internalLinks.length} iç link + ${externalLinks.length} dış link önerisi ✓`
  );

  return { internal: internalLinks, external: externalLinks };
}
