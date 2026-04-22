import * as cheerio from "cheerio";

export interface AuditIssue {
  issueType: string;
  severity: "critical" | "warning" | "info";
  details: Record<string, unknown>;
}

export interface PageAuditResult {
  url: string;
  loadTime: number;      // ms — passed in from scraper timing
  issues: AuditIssue[];
  healthScore: number;   // 0-100
}

/**
 * Analyzes raw HTML for technical SEO issues.
 * No Playwright needed — works on already-scraped HTML.
 */
export function auditHtml(
  html: string,
  url: string,
  loadTime: number,
  allTitles: Set<string>,
  allDescriptions: Set<string>
): PageAuditResult {
  const issues: AuditIssue[] = [];
  const $ = cheerio.load(html);

  // 1. HTTPS
  if (url.startsWith("http://")) {
    issues.push({
      issueType: "missing_https",
      severity: "critical",
      details: { url },
    });
  }

  // 2. Title
  const title = $("title").text().trim();
  if (!title) {
    issues.push({ issueType: "missing_title", severity: "critical", details: { url } });
  } else if (title.length < 30) {
    issues.push({
      issueType: "title_too_short",
      severity: "warning",
      details: { title, length: title.length, recommended: "30-60 karakter" },
    });
  } else if (title.length > 60) {
    issues.push({
      issueType: "title_too_long",
      severity: "warning",
      details: { title, length: title.length, recommended: "30-60 karakter" },
    });
  }
  if (title && allTitles.has(title)) {
    issues.push({ issueType: "duplicate_title", severity: "warning", details: { title } });
  }
  if (title) allTitles.add(title);

  // 3. Meta Description
  const metaDesc = $('meta[name="description"]').attr("content")?.trim() ?? "";
  if (!metaDesc) {
    issues.push({ issueType: "missing_meta_desc", severity: "warning", details: { url } });
  } else if (metaDesc.length < 120) {
    issues.push({
      issueType: "meta_desc_too_short",
      severity: "info",
      details: { length: metaDesc.length, recommended: "120-160 karakter" },
    });
  } else if (metaDesc.length > 160) {
    issues.push({
      issueType: "meta_desc_too_long",
      severity: "warning",
      details: { length: metaDesc.length, recommended: "120-160 karakter" },
    });
  }
  if (metaDesc && allDescriptions.has(metaDesc)) {
    issues.push({
      issueType: "duplicate_meta_desc",
      severity: "warning",
      details: { preview: metaDesc.slice(0, 60) + "…" },
    });
  }
  if (metaDesc) allDescriptions.add(metaDesc);

  // 4. Canonical
  const canonical = $('link[rel="canonical"]').attr("href");
  if (!canonical) {
    issues.push({ issueType: "missing_canonical", severity: "info", details: { url } });
  }

  // 5. Viewport
  const viewport = $('meta[name="viewport"]').attr("content");
  if (!viewport) {
    issues.push({ issueType: "missing_viewport", severity: "critical", details: { url } });
  }

  // 6. H1
  const h1Tags = $("h1");
  if (h1Tags.length === 0) {
    issues.push({ issueType: "missing_h1", severity: "warning", details: { url } });
  } else if (h1Tags.length > 1) {
    const texts = h1Tags
      .map((_, el) => $(el).text().trim().slice(0, 60))
      .get();
    issues.push({
      issueType: "multiple_h1",
      severity: "warning",
      details: { count: h1Tags.length, h1Texts: texts },
    });
  }

  // 7. Heading hierarchy
  const headingLevels = $("h1,h2,h3,h4,h5,h6")
    .map((_, el) => parseInt(el.tagName[1]))
    .get();
  let hierarchyBroken = false;
  for (let i = 1; i < headingLevels.length; i++) {
    if (headingLevels[i] - headingLevels[i - 1] > 1) {
      hierarchyBroken = true;
      break;
    }
  }
  if (hierarchyBroken) {
    issues.push({
      issueType: "broken_heading_hierarchy",
      severity: "info",
      details: { headings: headingLevels.slice(0, 10) },
    });
  }

  // 8. Alt text
  const missingAlt = $("img:not([alt])").length;
  if (missingAlt > 0) {
    issues.push({
      issueType: "missing_alt_text",
      severity: "warning",
      details: { count: missingAlt },
    });
  }

  // 9. Slow page
  if (loadTime > 3000) {
    issues.push({
      issueType: "slow_page",
      severity: loadTime > 5000 ? "critical" : "warning",
      details: { loadTimeMs: loadTime, threshold: 3000 },
    });
  }

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount  = issues.filter((i) => i.severity === "warning").length;
  const healthScore   = Math.max(0, 100 - criticalCount * 20 - warningCount * 5);

  return { url, loadTime, issues, healthScore };
}

export function calculateProjectHealthScore(results: PageAuditResult[]): number {
  if (results.length === 0) return 100;
  return Math.round(
    results.reduce((s, r) => s + r.healthScore, 0) / results.length
  );
}
