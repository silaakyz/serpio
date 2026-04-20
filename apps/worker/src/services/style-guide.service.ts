import OpenAI from "openai";
import { db } from "../lib/db";
import { articles, projects } from "@serpio/database";
import { eq, desc } from "drizzle-orm";
import { log } from "../utils/logger";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateStyleGuide(projectId: string, jobId: string): Promise<void> {
  await log(jobId, "info", "Stil rehberi oluşturuluyor...");

  const recentArticles = await db.query.articles.findMany({
    where: eq(articles.projectId, projectId),
    orderBy: desc(articles.scrapedAt),
    limit: 10,
  });

  if (recentArticles.length < 3) {
    await log(jobId, "warning", "Yeterli makale yok (minimum 3). Varsayılan stil kullanılacak.");
    return;
  }

  const sampleTexts = recentArticles
    .map((a, i) => `--- Makale ${i + 1}: ${a.title} ---\n${a.originalContent.slice(0, 2000)}`)
    .join("\n\n");

  await log(jobId, "info", `${recentArticles.length} makale analiz ediliyor...`);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `Sen bir içerik analiz uzmanısın. Verilen makale örneklerini analiz ederek yazım stilini çıkaracaksın.

Yanıtını SADECE JSON formatında ver, başka hiçbir şey yazma:
{
  "tone": "resmi | samimi | teknik | eğitici | pazarlama",
  "avgSentenceLength": <sayı>,
  "headingStyle": "soru tabanlı | ifade tabanlı | numara tabanlı | karışık",
  "frequentPhrases": ["sık kullanılan ifade 1", "ifade 2"],
  "writingPersonality": "Bu sitenin yazım kişiliğini 2-3 cümleyle anlat",
  "generatedAt": "<ISO tarih>"
}`,
      },
      {
        role: "user",
        content: `Aşağıdaki ${recentArticles.length} makaleyi analiz et ve yazım stilini çıkar:\n\n${sampleTexts}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("GPT-4 yanıt vermedi");

  const styleGuide = JSON.parse(content.replace(/```json\n?|\n?```/g, "").trim());
  styleGuide.generatedAt = new Date().toISOString();

  await db
    .update(projects)
    .set({
      styleGuide,
      styleGuideGeneratedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  await log(
    jobId,
    "success",
    `Stil rehberi oluşturuldu: ${styleGuide.tone} ton, ${styleGuide.headingStyle} başlık stili`
  );
}
