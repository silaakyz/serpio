import { parse } from "node-html-parser";

export interface GeoBreakdown {
  hasStructuredData: boolean;    // JSON-LD schema (25 puan)
  hasEEAT: boolean;              // Yazar/kaynak bilgisi (20 puan)
  hasFAQ: boolean;               // Soru-cevap bloğu (20 puan)
  hasSummary: boolean;           // Özet paragrafı (15 puan)
  hasTopicalDepth: boolean;      // Yeterli içerik derinliği (10 puan)
  hasDateSignals: boolean;       // Güncel tarih işaretleri (5 puan)
  hasExternalCitations: boolean; // Dış kaynak atıfları (5 puan)
}

export interface GeoAnalysisResult {
  geoScore: number;
  suggestions: string[];
  breakdown: GeoBreakdown;
}

export function analyzeGeoScore(content: string, title: string): GeoAnalysisResult {
  const root = parse(content);
  const text = root.text.toLowerCase();
  const suggestions: string[] = [];
  let score = 0;
  const breakdown: GeoBreakdown = {
    hasStructuredData: false,
    hasEEAT: false,
    hasFAQ: false,
    hasSummary: false,
    hasTopicalDepth: false,
    hasDateSignals: false,
    hasExternalCitations: false,
  };

  // 1. JSON-LD Schema Markup (25 puan)
  const hasSchema =
    content.includes("application/ld+json") ||
    content.includes('"@type"') ||
    content.includes('"@context"');
  if (hasSchema) {
    score += 25;
    breakdown.hasStructuredData = true;
  } else {
    suggestions.push(
      "JSON-LD yapılandırılmış veri (Schema Markup) ekleyin — Article, FAQPage veya HowTo şeması"
    );
  }

  // 2. E-E-A-T Sinyalleri (20 puan)
  const eatKeywords = [
    "yazar:", "yazan:", "kaynak:", "uzman", "doktor", "profesor",
    "araştırma", "çalışma", "göre", "author", "expert", "source",
  ];
  const hasEEAT =
    eatKeywords.some((kw) => text.includes(kw)) ||
    root.querySelectorAll('[rel="author"], .author, [itemprop="author"]').length > 0;
  if (hasEEAT) {
    score += 20;
    breakdown.hasEEAT = true;
  } else {
    suggestions.push(
      "Yazar bilgisi ve güvenilir kaynak atıfları ekleyin (E-E-A-T güçlendirme)"
    );
  }

  // 3. FAQ / Soru-Cevap Bloğu (20 puan)
  const hasFAQStructure =
    root.querySelectorAll("details, .faq, [itemtype*='FAQPage']").length > 0;
  const hasFAQText = [
    "sık sorulan sorular", "faq", "soru:", "cevap:",
    "frequently asked", "q:", "a:",
  ].some((kw) => text.includes(kw));
  const hasQuestionHeadings = root.querySelectorAll("h2, h3").some((el) => {
    const t = el.text.trim().toLowerCase();
    return (
      t.endsWith("?") ||
      t.startsWith("ne") ||
      t.startsWith("nasıl") ||
      t.startsWith("neden") ||
      t.startsWith("what") ||
      t.startsWith("how") ||
      t.startsWith("why")
    );
  });
  if (hasFAQStructure || hasFAQText || hasQuestionHeadings) {
    score += 20;
    breakdown.hasFAQ = true;
  } else {
    suggestions.push(
      "Sık sorulan sorular (FAQ) bölümü ekleyin — AI'ların snippet olarak çekebileceği soru-cevap formatı"
    );
  }

  // 4. Özet/TL;DR Paragrafı (15 puan)
  const summaryKeywords = [
    "özet", "kısaca", "özetle", "sonuç olarak", "tldr", "tl;dr",
    "summary", "in short", "in brief", "to summarize",
  ];
  const hasSummaryText = summaryKeywords.some((kw) => text.includes(kw));
  const firstParagraph = root.querySelectorAll("p")[0]?.text ?? "";
  const firstWordCount = firstParagraph.trim().split(/\s+/).length;
  const hasShortIntro = firstWordCount >= 20 && firstWordCount <= 80;
  if (hasSummaryText || hasShortIntro) {
    score += 15;
    breakdown.hasSummary = true;
  } else {
    suggestions.push(
      "Makalenin başına 2-3 cümlelik özet paragrafı ekleyin — LLM'ler bu bölümü snippet olarak kullanır"
    );
  }

  // 5. Topikal Derinlik (10 puan)
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const headingCount = root.querySelectorAll("h2, h3").length;
  if (wordCount >= 800 && headingCount >= 3) {
    score += 10;
    breakdown.hasTopicalDepth = true;
  } else {
    if (wordCount < 800)
      suggestions.push(`İçerik çok kısa (${wordCount} kelime). En az 800 kelime olmalı`);
    if (headingCount < 3)
      suggestions.push("Alt başlık sayısını artırın (H2/H3) — en az 3 alt başlık");
  }

  // 6. Tarih Sinyalleri (5 puan)
  const datePatterns =
    /\b(202[3-9]|2030|güncel|son güncelleme|updated|last modified)\b/i;
  if (datePatterns.test(content)) {
    score += 5;
    breakdown.hasDateSignals = true;
  } else {
    suggestions.push(
      "İçerik güncelleme tarihini ekleyin — AI'lar güncel içerikleri tercih eder"
    );
  }

  // 7. Dış Kaynak Atıfları (5 puan)
  const externalLinks = root
    .querySelectorAll("a[href]")
    .filter((a) => {
      const href = a.getAttribute("href") ?? "";
      return href.startsWith("http") && !href.includes("localhost");
    });
  if (externalLinks.length >= 2) {
    score += 5;
    breakdown.hasExternalCitations = true;
  } else {
    suggestions.push(
      "Güvenilir dış kaynaklara link ekleyin (Wikipedia, resmi siteler, araştırmalar)"
    );
  }

  return { geoScore: score, suggestions, breakdown };
}
