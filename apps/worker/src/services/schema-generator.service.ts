import { ai, AI_MODEL } from "../lib/ai-client";
import { log } from "../utils/logger";

export interface FAQItem {
  q: string;
  a: string;
}

// Makale için JSON-LD Article schema üret
export function generateArticleSchema(
  title: string,
  url: string,
  publishedAt?: Date | null
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    datePublished: publishedAt?.toISOString() ?? new Date().toISOString(),
    dateModified: new Date().toISOString(),
    url,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
  };
}

// İçerikten AI ile FAQ üret
export async function generateFAQ(
  title: string,
  content: string,
  jobId: string
): Promise<FAQItem[]> {
  await log(jobId, "info", "FAQ içeriği üretiliyor...");

  const plainText = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000);

  const response = await ai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: "system",
        content: `Verilen içeriğe göre 5 adet sık sorulan soru ve kısa cevap üret.
SADECE JSON array döndür, başka hiçbir şey yazma:
[
  { "q": "Soru?", "a": "Kısa, net cevap (1-3 cümle)." },
  ...
]`,
      },
      {
        role: "user",
        content: `Makale: ${title}\n\n${plainText}`,
      },
    ],
    temperature: 0.5,
    max_tokens: 1500,
  });

  const raw = response.choices[0]?.message?.content ?? "[]";
  const clean = raw.replace(/```json\n?|\n?```/g, "").trim();

  let faqs: FAQItem[] = [];
  try {
    faqs = JSON.parse(clean);
  } catch {
    await log(jobId, "warning", "FAQ JSON ayrıştırma hatası — boş liste kullanılıyor");
    return [];
  }

  await log(jobId, "success", `${faqs.length} FAQ oluşturuldu ✓`);
  return faqs;
}

// İçeriğe FAQ HTML + JSON-LD schema'ları enjekte et
export function injectGeoElements(
  content: string,
  title: string,
  url: string,
  faqs: FAQItem[],
  publishedAt?: Date | null
): string {
  const articleSchema = generateArticleSchema(title, url, publishedAt);

  const faqSchema =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  const schemaTags = `
<script type="application/ld+json">${JSON.stringify(articleSchema, null, 2)}</script>
${faqSchema ? `<script type="application/ld+json">${JSON.stringify(faqSchema, null, 2)}</script>` : ""}
`.trim();

  const faqHtml =
    faqs.length > 0
      ? `
<section class="faq-section" itemscope itemtype="https://schema.org/FAQPage">
  <h2>Sık Sorulan Sorular</h2>
  ${faqs
    .map(
      (f) => `
  <div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <h3 itemprop="name">${f.q}</h3>
    <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">${f.a}</p>
    </div>
  </div>`
    )
    .join("")}
</section>`
      : "";

  return schemaTags + "\n" + content + faqHtml;
}
