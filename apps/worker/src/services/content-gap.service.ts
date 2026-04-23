import { db } from "../lib/db";
import { competitors, competitorPages, articles, contentGaps } from "@serpio/database";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { ai, AI_MODEL } from "../lib/ai-client";
import { log } from "../utils/logger";

export async function analyzeContentGaps(
  projectId: string,
  jobId: string
): Promise<void> {
  await log(jobId, "info", "İçerik boşluğu analizi başlıyor...");

  // Proje makalelerinin anahtar kelimelerini topla
  const projectArticles = await db.query.articles.findMany({
    where: eq(articles.projectId, projectId),
  });
  const projectKeywords = new Set(
    projectArticles.flatMap((a) => a.aiKeywords || []).map((k) => k.toLowerCase())
  );

  await log(jobId, "info", `Proje'de ${projectKeywords.size} benzersiz anahtar kelime`);

  // Projenin rakiplerini bul
  const projectCompetitors = await db.query.competitors.findMany({
    where: eq(competitors.projectId, projectId),
  });

  if (projectCompetitors.length === 0) {
    await log(jobId, "warning", "Henüz rakip eklenmemiş. Ayarlardan rakip ekleyin.");
    return;
  }

  const competitorIds = projectCompetitors.map((c) => c.id);
  const allCompetitorPages = await db.query.competitorPages.findMany({
    where: and(
      inArray(competitorPages.competitorId, competitorIds),
      eq(competitorPages.status, "active")
    ),
  });

  await log(jobId, "info", `${allCompetitorPages.length} rakip sayfası analiz ediliyor...`);

  // Rakiplerin hedeflediği ama bizde olmayan anahtar kelimeler
  const gaps = new Map<string, { urls: string[]; count: number }>();

  for (const page of allCompetitorPages) {
    const pageKeywords = page.keywords || [];
    for (const kw of pageKeywords) {
      const kwLower = kw.toLowerCase();
      if (!projectKeywords.has(kwLower) && kwLower.length > 3) {
        const existing = gaps.get(kwLower) || { urls: [], count: 0 };
        if (!existing.urls.includes(page.url)) {
          existing.urls.push(page.url);
        }
        existing.count++;
        gaps.set(kwLower, existing);
      }
    }
  }

  // Rakip URL'lerden keyword çıkarma (keyword yoksa URL path'inden çıkar)
  if (gaps.size === 0) {
    await log(jobId, "info", "Rakip sayfalarında anahtar kelime bulunamadı — URL path analizi yapılıyor...");

    for (const page of allCompetitorPages) {
      if (!page.url) continue;
      try {
        const path = new URL(page.url).pathname;
        const segments = path.split("/").filter((s) => s.length > 3 && !/^\d+$/.test(s));
        for (const seg of segments) {
          const kw = seg.replace(/-/g, " ").toLowerCase();
          if (!projectKeywords.has(kw)) {
            const existing = gaps.get(kw) || { urls: [], count: 0 };
            if (!existing.urls.includes(page.url)) existing.urls.push(page.url);
            existing.count++;
            gaps.set(kw, existing);
          }
        }
      } catch {}
    }
  }

  await log(jobId, "info", `${gaps.size} potansiyel içerik boşluğu tespit edildi`);

  // En önemli boşlukları al
  const topGaps = Array.from(gaps.entries())
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 50);

  // AI ile başlık önerileri üret
  const gapKeywords = topGaps.slice(0, 20).map(([kw]) => kw);
  const suggestedTitles: Record<string, string> = {};

  try {
    const response = await ai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: `Verilen anahtar kelimeler için SEO-uyumlu Türkçe makale başlıkları öner.
SADECE JSON döndür: { "anahtar kelime": "Önerilen Başlık" }`,
        },
        {
          role: "user",
          content: `Şu anahtar kelimeler için başlık öner:\n${gapKeywords.join("\n")}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 1000,
    });
    const raw = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "").trim());
    Object.assign(suggestedTitles, parsed);
  } catch {
    // AI başlık önerileri opsiyonel
  }

  // DB'ye kaydet — çakışmada atla
  let saved = 0;
  for (const [keyword, { urls, count }] of topGaps) {
    const priorityScore = Math.min(100, count * 20);
    try {
      await db.insert(contentGaps).values({
        projectId,
        keyword,
        competitorUrls: urls,
        priorityScore,
        status: "open",
        suggestedTitle: suggestedTitles[keyword] || null,
      }).onConflictDoNothing();
      saved++;
    } catch {}
  }

  await log(jobId, "success", `${saved} içerik fırsatı kaydedildi ✓`);
}
