import { google } from "googleapis";
import { createOAuth2Client, refreshAccessToken } from "./google-auth.service";
import { db } from "../lib/db";
import { gscMetrics, articles, googleConnections, eq } from "@serpio/database";

type LogFn = (level: string, message: string) => Promise<void>;

export async function syncGSCMetrics(
  projectId: string,
  logFn: LogFn
): Promise<void> {
  await logFn("info", "GSC verisi senkronize ediliyor...");

  const connection = await db.query.googleConnections.findFirst({
    where: eq(googleConnections.projectId, projectId),
  });

  if (!connection?.gscSiteUrl) {
    await logFn("warning", "Google Search Console bağlantısı veya site URL bulunamadı. Atlanıyor.");
    return;
  }

  // Token yenile (gerekirse)
  const oauth2Client = createOAuth2Client();
  if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
    const { accessToken, expiresAt } = await refreshAccessToken(connection.refreshToken);
    oauth2Client.setCredentials({ access_token: accessToken });
    await db
      .update(googleConnections)
      .set({ accessToken, tokenExpiresAt: expiresAt, updatedAt: new Date() })
      .where(eq(googleConnections.projectId, projectId));
  } else {
    oauth2Client.setCredentials({ access_token: connection.accessToken });
  }

  const searchConsole = google.searchconsole({ version: "v1", auth: oauth2Client });

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const response = await searchConsole.searchanalytics.query({
    siteUrl: connection.gscSiteUrl,
    requestBody: {
      startDate: fmt(startDate),
      endDate:   fmt(endDate),
      dimensions: ["page", "date"],
      rowLimit:  5000,
    },
  });

  const rows = response.data.rows ?? [];
  await logFn("info", `${rows.length} GSC satırı alındı`);

  const projectArticles = await db.query.articles.findMany({
    where: eq(articles.projectId, projectId),
    columns: { id: true, originalUrl: true, publishedUrl: true },
  });

  const urlToArticleId = new Map<string, string>();
  for (const a of projectArticles) {
    if (a.originalUrl) urlToArticleId.set(a.originalUrl, a.id);
    if (a.publishedUrl) urlToArticleId.set(a.publishedUrl, a.id);
  }

  let saved = 0;
  for (const row of rows) {
    const pageUrl = row.keys?.[0];
    const date    = row.keys?.[1];
    if (!pageUrl || !date) continue;

    const articleId = urlToArticleId.get(pageUrl);
    if (!articleId) continue;

    await db
      .insert(gscMetrics)
      .values({
        projectId,
        articleId,
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
    saved++;
  }

  // articles tablosundaki currentPosition / monthlyClicks güncelle
  for (const article of projectArticles) {
    const articleRows = rows.filter((r) => r.keys?.[0] === article.originalUrl || r.keys?.[0] === article.publishedUrl);
    if (articleRows.length === 0) continue;

    const avgPosition =
      articleRows.reduce((s, r) => s + (r.position ?? 0), 0) / articleRows.length;
    const totalClicks      = articleRows.reduce((s, r) => s + (r.clicks      ?? 0), 0);
    const totalImpressions = articleRows.reduce((s, r) => s + (r.impressions ?? 0), 0);

    await db
      .update(articles)
      .set({
        currentPosition:    Math.round(avgPosition * 10) / 10,
        monthlyClicks:      Math.round(totalClicks),
        monthlyImpressions: Math.round(totalImpressions),
        updatedAt:          new Date(),
      })
      .where(eq(articles.id, article.id));
  }

  await logFn("success", `GSC verisi güncellendi: ${saved} kayıt ✓`);
}
