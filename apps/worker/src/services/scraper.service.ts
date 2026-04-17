import { chromium, Browser, Page } from "playwright";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import * as cheerio from "cheerio";
import robotsParser from "robots-parser";
import { parseStringPromise } from "xml2js";
import pLimit from "p-limit";
import { type CheerioAPI } from "cheerio";

export interface ScrapedArticle {
  title: string;
  content: string;
  textContent: string;
  url: string;
  slug: string;
  excerpt: string;
  publishedAt: Date | null;
  lastModifiedAt: Date | null;
  author: string | null;
  wordCount: number;
  language: string | null;
}

export interface ScrapeOptions {
  maxDepth: number;
  maxPages: number;
  concurrency: number;
  delay: number;
  respectRobots: boolean;
}

// Taranmaması gereken URL kalıpları
const SKIP_PATTERNS = [
  /\.(pdf|jpg|jpeg|png|gif|svg|webp|ico|css|js|woff|woff2|ttf|eot|zip|gz|tar|mp4|mp3|avi)(\?.*)?$/i,
  /\/tag\//i,
  /\/tags\//i,
  /\/category\//i,
  /\/categories\//i,
  /\/author\//i,
  /\/authors\//i,
  /\/page\/\d+/i,
  /\/wp-content\//i,
  /\/wp-includes\//i,
  /\/wp-admin\//i,
  /\/wp-json\//i,
  /\/feed\/?$/i,
  /\/cdn-cgi\//i,
  /\/search\?/i,
  /#/,
  /^javascript:/i,
  /^mailto:/i,
  /^tel:/i,
];

export class UniversalScraper {
  private browser: Browser | null = null;
  private robotsRules: ReturnType<typeof robotsParser> | null = null;
  private visitedUrls = new Set<string>();
  private baseUrl = "";
  private baseDomain = "";

  async initialize() {
    this.browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
      ],
    });
  }

  async close() {
    await this.browser?.close();
    this.browser = null;
  }

  async scrape(
    url: string,
    options: Partial<ScrapeOptions> = {},
    onProgress?: (current: number, total: number, url: string) => Promise<void>
  ): Promise<ScrapedArticle[]> {
    const opts: ScrapeOptions = {
      maxDepth: options.maxDepth ?? 2,
      maxPages: options.maxPages ?? 100,
      concurrency: options.concurrency ?? 3,
      delay: options.delay ?? 1500,
      respectRobots: options.respectRobots ?? true,
    };

    this.baseUrl = new URL(url).origin;
    this.baseDomain = new URL(url).hostname;
    this.visitedUrls.clear();

    if (opts.respectRobots) {
      await this.loadRobotsTxt();
    }

    // URL keşif stratejisi — öncelik sırasıyla
    let urls: string[] = [];

    urls = await this.discoverFromSitemap();

    if (urls.length === 0) {
      urls = await this.discoverFromFeed(url);
    }

    if (urls.length === 0) {
      urls = await this.discoverFromCrawl(url, opts.maxDepth);
    }

    // Giriş URL'sini de listeye ekle (eğer yoksa)
    if (!urls.includes(url)) urls.unshift(url);

    // maxPages limiti uygula
    urls = urls.slice(0, opts.maxPages);

    const limit = pLimit(opts.concurrency);
    const articles: ScrapedArticle[] = [];
    let completed = 0;

    const tasks = urls.map((pageUrl) =>
      limit(async () => {
        try {
          const article = await this.extractArticle(pageUrl);
          if (article && article.wordCount > 100) {
            articles.push(article);
          }
        } catch {
          // Sessizce geç
        } finally {
          completed++;
          await onProgress?.(completed, urls.length, pageUrl);
          await this.sleep(opts.delay);
        }
      })
    );

    await Promise.all(tasks);
    return articles;
  }

  // ─── Sitemap Keşfi ────────────────────────────────────────────────────────

  private async discoverFromSitemap(): Promise<string[]> {
    const candidates = [
      `${this.baseUrl}/sitemap.xml`,
      `${this.baseUrl}/sitemap_index.xml`,
      `${this.baseUrl}/sitemap-index.xml`,
      `${this.baseUrl}/sitemap-posts.xml`,
      `${this.baseUrl}/post-sitemap.xml`,
      `${this.baseUrl}/page-sitemap.xml`,
    ];

    for (const sitemapUrl of candidates) {
      try {
        const text = await this.fetchText(sitemapUrl);
        if (!text) continue;

        const parsed = await parseStringPromise(text, { explicitArray: true }).catch(() => null);
        if (!parsed) continue;

        const urls: string[] = [];

        // Sitemap index (nested sitemaps)
        if (parsed.sitemapindex?.sitemap) {
          for (const sm of parsed.sitemapindex.sitemap) {
            const loc = Array.isArray(sm.loc) ? sm.loc[0] : sm.loc;
            if (!loc) continue;
            try {
              const subText = await this.fetchText(loc);
              if (!subText) continue;
              const subParsed = await parseStringPromise(subText, { explicitArray: true }).catch(() => null);
              if (subParsed?.urlset?.url) {
                for (const u of subParsed.urlset.url) {
                  const subLoc = Array.isArray(u.loc) ? u.loc[0] : u.loc;
                  if (subLoc && this.isContentUrl(subLoc)) urls.push(subLoc);
                }
              }
            } catch { /* skip */ }
          }
          if (urls.length > 0) return urls;
        }

        // Normal sitemap
        if (parsed.urlset?.url) {
          for (const u of parsed.urlset.url) {
            const loc = Array.isArray(u.loc) ? u.loc[0] : u.loc;
            if (loc && this.isContentUrl(loc)) urls.push(loc);
          }
          if (urls.length > 0) return urls;
        }
      } catch { /* next candidate */ }
    }

    return [];
  }

  // ─── Feed Keşfi ───────────────────────────────────────────────────────────

  private async discoverFromFeed(startUrl: string): Promise<string[]> {
    const candidates = [
      `${this.baseUrl}/feed`,
      `${this.baseUrl}/feed/`,
      `${this.baseUrl}/rss`,
      `${this.baseUrl}/rss.xml`,
      `${this.baseUrl}/atom.xml`,
      `${this.baseUrl}/feed.xml`,
      `${this.baseUrl}/index.xml`,
    ];

    // <link rel="alternate" type="application/rss+xml"> header'dan da bul
    try {
      const html = await this.fetchText(startUrl);
      if (html) {
        const $ = cheerio.load(html);
        $('link[rel="alternate"]').each((_, el) => {
          const type = $(el).attr("type") ?? "";
          const href = $(el).attr("href") ?? "";
          if ((type.includes("rss") || type.includes("atom")) && href) {
            const feedUrl = href.startsWith("http") ? href : `${this.baseUrl}${href}`;
            if (!candidates.includes(feedUrl)) candidates.unshift(feedUrl);
          }
        });
      }
    } catch { /* ok */ }

    for (const feedUrl of candidates) {
      try {
        const text = await this.fetchText(feedUrl);
        if (!text) continue;

        const parsed = await parseStringPromise(text, { explicitArray: true }).catch(() => null);
        if (!parsed) continue;

        const urls: string[] = [];

        // RSS 2.0
        const items = parsed.rss?.channel?.[0]?.item ?? [];
        for (const item of items) {
          const link = Array.isArray(item.link) ? item.link[0] : item.link;
          if (link && typeof link === "string" && this.isSameDomain(link)) {
            urls.push(link);
          }
        }

        // Atom
        const entries = parsed.feed?.entry ?? [];
        for (const entry of entries) {
          if (Array.isArray(entry.link)) {
            for (const l of entry.link) {
              const href = l?.$ ? l.$.href : (typeof l === "string" ? l : null);
              if (href && this.isSameDomain(href)) urls.push(href);
            }
          }
        }

        if (urls.length > 0) return urls;
      } catch { /* next */ }
    }

    return [];
  }

  // ─── Recursive Crawl ──────────────────────────────────────────────────────

  private async discoverFromCrawl(startUrl: string, maxDepth: number): Promise<string[]> {
    const discovered: string[] = [];
    const queue: Array<{ url: string; depth: number }> = [{ url: startUrl, depth: 0 }];
    this.visitedUrls.add(this.normalizeUrl(startUrl));

    while (queue.length > 0) {
      const current = queue.shift()!;
      discovered.push(current.url);

      if (current.depth >= maxDepth) continue;
      if (discovered.length >= 500) break; // Hard limit

      try {
        const html = await this.fetchText(current.url);
        if (!html) continue;

        const $ = cheerio.load(html);
        $("a[href]").each((_, el) => {
          let href = $(el).attr("href") ?? "";
          if (!href) return;

          // Relative → absolute
          try {
            href = new URL(href, current.url).toString();
          } catch {
            return;
          }

          // Normalize: fragment kaldır, query strip
          const normalized = this.normalizeUrl(href);

          if (
            !this.visitedUrls.has(normalized) &&
            this.isSameDomain(href) &&
            !this.shouldSkipUrl(href) &&
            this.isAllowedByRobots(href)
          ) {
            this.visitedUrls.add(normalized);
            queue.push({ url: href.split("#")[0]!, depth: current.depth + 1 });
          }
        });
      } catch { /* skip */ }
    }

    return discovered;
  }

  // ─── robots.txt ───────────────────────────────────────────────────────────

  private async loadRobotsTxt() {
    try {
      const robotsUrl = `${this.baseUrl}/robots.txt`;
      const text = await this.fetchText(robotsUrl);
      if (text) {
        this.robotsRules = robotsParser(robotsUrl, text);
      }
    } catch { /* robots.txt yoksa geç */ }
  }

  private isAllowedByRobots(url: string): boolean {
    if (!this.robotsRules) return true;
    return this.robotsRules.isAllowed(url, "Serpio-Bot") !== false;
  }

  // ─── Makale Çıkarma ───────────────────────────────────────────────────────

  private async extractArticle(url: string): Promise<ScrapedArticle | null> {
    if (!this.browser) throw new Error("Browser başlatılmadı");

    const page = await this.browser.newPage();

    try {
      await page.setExtraHTTPHeaders({
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
      });

      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      await this.autoScroll(page);

      const html = await page.content();
      const $ = cheerio.load(html);

      // Gürültüyü kaldır (navigasyon, footer, reklam vb.)
      $("nav, header, footer, aside, .sidebar, .advertisement, .ads, #ads, [role='banner'], [role='navigation']").remove();

      const cleanHtml = $.html();

      const dom = new JSDOM(cleanHtml, { url });
      const reader = new Readability(dom.window.document, {
        charThreshold: 50,
      });
      const article = reader.parse();

      if (!article?.textContent || article.textContent.trim().length < 100) {
        return null;
      }

      const publishedAt = this.extractDate($, url);
      const lastModifiedAt = this.extractLastModified($);
      const author = this.extractAuthor($);
      const language = $("html").attr("lang")?.split("-")[0] ?? null;

      const slug = (() => {
        const parts = new URL(url).pathname.split("/").filter(Boolean);
        return parts[parts.length - 1] ?? "";
      })();

      const excerpt =
        article.excerpt ||
        $('meta[name="description"]').attr("content") ||
        $('meta[property="og:description"]').attr("content") ||
        article.textContent.slice(0, 200).trim();

      return {
        title: article.title || $("title").text().trim() || "",
        content: article.content || "",
        textContent: article.textContent || "",
        url,
        slug,
        excerpt,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
        lastModifiedAt: lastModifiedAt ? new Date(lastModifiedAt) : null,
        author,
        wordCount: article.textContent.split(/\s+/).filter(Boolean).length,
        language,
      };
    } catch {
      return null;
    } finally {
      await page.close();
    }
  }

  // SPA ve lazy-load içerikler için otomatik scroll
  private async autoScroll(page: Page) {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 400;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight || totalHeight > 12000) {
            clearInterval(timer);
            resolve();
          }
        }, 80);
      });
    });
    await page.waitForTimeout(800);
  }

  // ─── Tarih Çıkarma ────────────────────────────────────────────────────────

  private extractDate($: CheerioAPI, url: string): string | null {
    // 1. JSON-LD schema
    const jsonLd = this.parseJsonLd($);
    if (jsonLd?.datePublished) return jsonLd.datePublished as string;
    if (jsonLd?.uploadDate) return jsonLd.uploadDate as string;

    // 2. Open Graph
    const ogDate = $('meta[property="article:published_time"]').attr("content");
    if (ogDate) return ogDate;

    // 3. <time> elementi
    const timeEl = $("time[datetime]").first().attr("datetime");
    if (timeEl) return timeEl;

    // 4. Meta name
    const metaDate = $('meta[name="date"], meta[name="pubdate"], meta[name="publish-date"]').attr("content");
    if (metaDate) return metaDate;

    // 5. URL'den tarih çıkar: /2024/01/15/ veya /2024-01-15-
    const urlDateMatch = url.match(/\/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (urlDateMatch) {
      return `${urlDateMatch[1]}-${urlDateMatch[2].padStart(2, "0")}-${urlDateMatch[3].padStart(2, "0")}`;
    }

    return null;
  }

  private extractLastModified($: CheerioAPI): string | null {
    // 1. JSON-LD
    const jsonLd = this.parseJsonLd($);
    if (jsonLd?.dateModified) return jsonLd.dateModified as string;

    // 2. Open Graph
    const ogMod = $('meta[property="article:modified_time"]').attr("content");
    if (ogMod) return ogMod;

    // 3. Meta
    const metaMod = $('meta[name="last-modified"], meta[name="revised"]').attr("content");
    if (metaMod) return metaMod;

    return null;
  }

  private extractAuthor($: CheerioAPI): string | null {
    // 1. JSON-LD
    const jsonLd = this.parseJsonLd($);
    if (jsonLd?.author) {
      const a = jsonLd.author as Record<string, unknown>;
      if (typeof a.name === "string") return a.name;
      if (typeof a === "string") return a;
    }

    // 2. Meta
    const metaAuthor = $('meta[name="author"]').attr("content");
    if (metaAuthor) return metaAuthor;

    // 3. Open Graph
    const ogAuthor = $('meta[property="article:author"]').attr("content");
    if (ogAuthor) return ogAuthor;

    // 4. Yaygın CSS seçiciler
    const selectors = [
      ".author",
      ".author-name",
      '[rel="author"]',
      '[itemprop="author"]',
      ".byline",
      ".by-author",
    ];
    for (const sel of selectors) {
      const text = $(sel).first().text().trim().replace(/^by\s+/i, "");
      if (text && text.length < 100) return text;
    }

    return null;
  }

  // JSON-LD schema.org parse
  private parseJsonLd($: CheerioAPI): Record<string, unknown> | null {
    try {
      let result: Record<string, unknown> | null = null;
      $('script[type="application/ld+json"]').each((_, el) => {
        if (result) return;
        try {
          const data = JSON.parse($(el).html() ?? "{}");
          const objs = Array.isArray(data) ? data : [data];
          for (const obj of objs) {
            const type = obj["@type"] ?? "";
            if (
              type === "Article" ||
              type === "BlogPosting" ||
              type === "NewsArticle" ||
              type === "WebPage"
            ) {
              result = obj;
              break;
            }
          }
        } catch { /* skip */ }
      });
      return result;
    } catch {
      return null;
    }
  }

  // ─── Yardımcı Metodlar ────────────────────────────────────────────────────

  private async fetchText(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Serpio-Bot/1.0 (+https://serpio.app/bot)",
          Accept: "text/html,application/xml,application/rss+xml,text/xml,*/*",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  private normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      u.hash = "";
      return u.toString().replace(/\/$/, "");
    } catch {
      return url;
    }
  }

  private isSameDomain(url: string): boolean {
    try {
      return new URL(url).hostname === this.baseDomain;
    } catch {
      return false;
    }
  }

  private isContentUrl(url: string): boolean {
    if (!this.isSameDomain(url)) return false;
    if (this.shouldSkipUrl(url)) return false;
    return true;
  }

  private shouldSkipUrl(url: string): boolean {
    return SKIP_PATTERNS.some((p) => p.test(url));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
