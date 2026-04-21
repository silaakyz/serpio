import { db } from "../lib/db";
import { users, creditTransactions } from "@serpio/database";
import { eq } from "drizzle-orm";

// ─── Merkezi Kredi Fiyat Tablosu ──────────────────────────────────────────────

export const CREDIT_COSTS = {
  // İçerik İşlemleri
  scrape_per_100_urls:      10,
  ai_analyze:                5,
  ai_rewrite:               15,
  style_guide:              20,

  // GEO/LLMO
  geo_analyze:               2,
  geo_optimize:              5,
  llm_visibility_report:    10,

  // Yayınlama
  publish_api:               2,   // WordPress, Shopify, Ghost, vb.
  publish_ftp:               2,
  publish_browser:           5,   // Playwright otomasyon
  publish_git:               1,   // GitHub, GitLab
  publish_webhook:           1,

  // Rakip & Analiz
  competitor_crawl:          3,
  content_gap_analysis:      5,
  keyword_clustering:        2,
  cannibalization_analysis:  3,
  topic_clustering:          5,
  backlink_snapshot:         5,
  competitor_backlink:       3,

  // Dönüşüm & Çeviri
  cro_suggestions:           2,
  translation_per_article:   4,
  programmatic_per_page:     3,

  // Raporlama
  brand_pulse:              10,
  auto_report:               5,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

// ─── Temel Fonksiyonlar ───────────────────────────────────────────────────────

export async function checkCredits(userId: string, required: number): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  return (user?.credits ?? 0) >= required;
}

export async function consumeCredits(
  userId: string,
  amount: number,
  description: string,
  jobId?: string
): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user || user.credits < amount) return false;

  const newBalance = user.credits - amount;

  await db.update(users)
    .set({ credits: newBalance, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await db.insert(creditTransactions).values({
    userId,
    type: "consumption",
    amount: -amount,
    balance: newBalance,
    description,
    jobId,
  });

  return true;
}

export async function consumeCreditsForAction(
  userId: string,
  action: CreditAction,
  jobId?: string,
  description?: string
): Promise<boolean> {
  const cost = CREDIT_COSTS[action];
  const desc = description ?? `${action} (${cost} kredi)`;
  return consumeCredits(userId, cost, desc, jobId);
}

export async function refundCredits(
  userId: string,
  amount: number,
  description: string,
  jobId?: string
): Promise<void> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) return;

  const newBalance = user.credits + amount;

  await db.update(users)
    .set({ credits: newBalance, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await db.insert(creditTransactions).values({
    userId,
    type: "refund",
    amount,
    balance: newBalance,
    description,
    jobId,
  });
}
