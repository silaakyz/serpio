import { db } from "../lib/db";
import { articles, projects } from "@serpio/database";
import { eq } from "drizzle-orm";
import { log } from "../utils/logger";
import { ai, AI_MODEL } from "../lib/ai-client";

export interface RewriteResult {
  aiContent: string;
  aiTitle: string;
  aiMetaDesc: string;
  aiKeywords: string[];
}

export async function rewriteArticle(
  articleId: string,
  projectId: string,
  jobId: string
): Promise<RewriteResult> {
  const article = await db.query.articles.findFirst({
    where: eq(articles.id, articleId),
  });
  if (!article) throw new Error("Makale bulunamadı");

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  const styleGuide = project?.styleGuide;
  const stylePrompt = styleGuide
    ? `\n\nYAZIM STİLİ REHBERİ:\n- Ton: ${styleGuide.tone}\n- Ortalama cümle uzunluğu: ${styleGuide.avgSentenceLength} kelime\n- Başlık stili: ${styleGuide.headingStyle}\n- Sık kullanılan ifadeler: ${(styleGuide.frequentPhrases ?? []).join(", ")}\n- Kişilik: ${styleGuide.writingPersonality}`
    : "";

  await log(jobId, "info", `"${article.title}" yeniden yazılıyor...`);

  const response = await ai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: "system",
        content: `Sen profesyonel bir SEO içerik editörüsün. Verilen makaleyi güncelleyip yeniden yazacaksın.

KURALLAR:
1. Orijinal içeriğin konusunu ve ana fikirlerini koru
2. Güncel olmayan bilgileri güncelle
3. SEO için optimize et: doğal anahtar kelime kullanımı, başlık hiyerarşisi (H2, H3), kısa paragraflar
4. Okunabilirliği artır: aktif cümleler, kısa paragraflar, madde listeleri
5. Verilen stil rehberine uygun yaz${stylePrompt}

ÇIKTI FORMATI (SADECE JSON, başka bir şey yazma):
{
  "title": "Güncellenmiş SEO-uyumlu başlık",
  "content": "Güncellenmiş HTML içerik (h2, h3, p, ul, li, strong, em etiketleri kullan)",
  "metaDescription": "155 karakter max meta açıklama",
  "keywords": ["anahtar", "kelime", "listesi", "5-10 adet"]
}`,
      },
      {
        role: "user",
        content: `MAKALE BAŞLIĞI: ${article.title}\n\nORİJİNAL İÇERİK:\n${article.originalContent.slice(0, 8000)}\n\nORİJİNAL URL: ${article.originalUrl}\nESKİME DURUMU: ${article.staleStatus}\n\nBu makaleyi yukarıdaki kurallara göre yeniden yaz.`,
      },
    ],
    temperature: 0.7,
    max_tokens: 4000,
  });

  const rawContent = response.choices[0]?.message?.content;
  if (!rawContent) throw new Error("AI yanıt vermedi");

  const result = JSON.parse(rawContent.replace(/```json\n?|\n?```/g, "").trim());

  await db
    .update(articles)
    .set({
      aiContent: result.content,
      aiTitle: result.title,
      aiMetaDesc: result.metaDescription,
      aiKeywords: result.keywords,
      status: "ready",
      updatedAt: new Date(),
    })
    .where(eq(articles.id, articleId));

  await log(jobId, "success", `"${result.title}" — yeniden yazıldı ✓`);

  return {
    aiContent: result.content,
    aiTitle: result.title,
    aiMetaDesc: result.metaDescription,
    aiKeywords: result.keywords,
  };
}
