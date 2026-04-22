import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db, googleConnections, gscMetrics, gaMetrics, articles, projects, eq } from "@serpio/database";
import { getAuthenticatedClient } from "@/lib/google";
import { google } from "googleapis";

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, 5, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Çok fazla istek" }, { status: 429 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { projectId } = body as { projectId?: string };
  if (!projectId) {
    return NextResponse.json({ error: "projectId zorunlu" }, { status: 400 });
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  const conn = await db.query.googleConnections.findFirst({
    where: eq(googleConnections.projectId, projectId),
  });
  if (!conn) {
    return NextResponse.json({ error: "Google bağlantısı yok" }, { status: 400 });
  }

  const authClient = await getAuthenticatedClient(projectId);
  const results = { gsc: 0, ga: 0 };

  // ─── GSC Sync ────────────────────────────────────────────────────────────────
  if (conn.gscSiteUrl) {
    try {
      const webmasters = google.webmasters({ version: "v3", auth: authClient });
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 28);

      const fmt = (d: Date) => d.toISOString().split("T")[0];

      const resp = await webmasters.searchanalytics.query({
        siteUrl: conn.gscSiteUrl,
        requestBody: {
          startDate: fmt(startDate),
          endDate:   fmt(endDate),
          dimensions: ["page", "date"],
          rowLimit:   5000,
        },
      });

      const rows = resp.data.rows ?? [];
      const projectArticles = await db.query.articles.findMany({
        where: eq(articles.projectId, projectId),
        columns: { id: true, originalUrl: true, publishedUrl: true },
      });

      const urlToArticleId = new Map<string, string>();
      for (const a of projectArticles) {
        if (a.originalUrl) urlToArticleId.set(a.originalUrl, a.id);
        if (a.publishedUrl) urlToArticleId.set(a.publishedUrl, a.id);
      }

      for (const row of rows) {
        const pageUrl = row.keys?.[0];
        const date    = row.keys?.[1];
        if (!pageUrl || !date) continue;

        const articleId = urlToArticleId.get(pageUrl);
        if (!articleId) continue;

        await db
          .insert(gscMetrics)
          .values({
            articleId,
            projectId,
            pageUrl,
            date,
            clicks:      Math.round(row.clicks ?? 0),
            impressions: Math.round(row.impressions ?? 0),
            position:    row.position ?? 0,
            ctr:         row.ctr ?? 0,
          })
          .onConflictDoUpdate({
            target: [gscMetrics.pageUrl, gscMetrics.date],
            set: {
              clicks:      Math.round(row.clicks ?? 0),
              impressions: Math.round(row.impressions ?? 0),
              position:    row.position ?? 0,
              ctr:         row.ctr ?? 0,
            },
          });
        results.gsc++;
      }
    } catch (err) {
      console.error("[GSC sync error]", err);
    }
  }

  // ─── GA4 Sync ─────────────────────────────────────────────────────────────────
  if (conn.ga4PropertyId) {
    try {
      const analyticsData = google.analyticsdata({ version: "v1beta", auth: authClient });
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 28);

      const fmt = (d: Date) => d.toISOString().split("T")[0];

      const resp = await analyticsData.properties.runReport({
        property: `properties/${conn.ga4PropertyId}`,
        requestBody: {
          dateRanges: [{ startDate: fmt(startDate), endDate: fmt(endDate) }],
          dimensions: [{ name: "pagePath" }, { name: "date" }],
          metrics: [
            { name: "sessions" },
            { name: "bounceRate" },
            { name: "averageSessionDuration" },
            { name: "conversions" },
          ],
          limit: "5000",
        },
      });

      const rows = resp.data.rows ?? [];
      const baseUrl = project.websiteUrl.replace(/\/$/, "");

      const projectArticles = await db.query.articles.findMany({
        where: eq(articles.projectId, projectId),
        columns: { id: true, originalUrl: true, publishedUrl: true },
      });

      const urlToArticleId = new Map<string, string>();
      for (const a of projectArticles) {
        if (a.originalUrl) {
          try {
            const path = new URL(a.originalUrl).pathname;
            urlToArticleId.set(path, a.id);
          } catch { /* skip */ }
        }
      }

      for (const row of rows) {
        const pagePath = row.dimensionValues?.[0]?.value;
        const date     = row.dimensionValues?.[1]?.value;
        if (!pagePath || !date) continue;

        const articleId = urlToArticleId.get(pagePath);
        if (!articleId) continue;

        const pageUrl = `${baseUrl}${pagePath}`;
        const formattedDate = date.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");

        await db
          .insert(gaMetrics)
          .values({
            articleId,
            projectId,
            pageUrl,
            date: formattedDate,
            sessions:            parseInt(row.metricValues?.[0]?.value ?? "0"),
            bounceRate:          parseFloat(row.metricValues?.[1]?.value ?? "0"),
            avgSessionDuration:  parseFloat(row.metricValues?.[2]?.value ?? "0"),
            conversions:         parseInt(row.metricValues?.[3]?.value ?? "0"),
          })
          .onConflictDoUpdate({
            target: [gaMetrics.pageUrl, gaMetrics.date],
            set: {
              sessions:           parseInt(row.metricValues?.[0]?.value ?? "0"),
              bounceRate:         parseFloat(row.metricValues?.[1]?.value ?? "0"),
              avgSessionDuration: parseFloat(row.metricValues?.[2]?.value ?? "0"),
              conversions:        parseInt(row.metricValues?.[3]?.value ?? "0"),
            },
          });
        results.ga++;
      }
    } catch (err) {
      console.error("[GA4 sync error]", err);
    }
  }

  return NextResponse.json({ success: true, synced: results });
}
