import { NextResponse } from "next/server";
import { adminResponse } from "@/lib/admin-guard";
import { db } from "@serpio/database";
import { users, jobs, creditTransactions } from "@serpio/database";
import { count, eq, gte, and, sum } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await adminResponse(); if (guard) return guard;
  

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    [totalUsers],
    [newUsersThisWeek],
    [totalJobs],
    [completedJobs],
    [failedJobs],
    [totalCreditsConsumed],
    [totalCreditsPurchased],
    [activeJobs],
    recentJobs,
  ] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(users).where(gte(users.createdAt, weekAgo)),
    db.select({ count: count() }).from(jobs),
    db.select({ count: count() }).from(jobs).where(eq(jobs.status, "completed")),
    db.select({ count: count() }).from(jobs).where(eq(jobs.status, "failed")),
    db.select({ total: sum(creditTransactions.amount) })
      .from(creditTransactions)
      .where(and(
        eq(creditTransactions.type, "consumption"),
        gte(creditTransactions.createdAt, monthAgo)
      )),
    db.select({ total: sum(creditTransactions.amount) })
      .from(creditTransactions)
      .where(and(
        eq(creditTransactions.type, "purchase"),
        gte(creditTransactions.createdAt, monthAgo)
      )),
    db.select({ count: count() }).from(jobs).where(eq(jobs.status, "active")),
    db.select({
      id: jobs.id,
      type: jobs.type,
      status: jobs.status,
      createdAt: jobs.createdAt,
    })
      .from(jobs)
      .orderBy(jobs.createdAt)
      .limit(5),
  ]);

  const total = totalJobs.count ?? 0;
  const completed = completedJobs.count ?? 0;
  const failed = failedJobs.count ?? 0;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return NextResponse.json({
    users: {
      total: totalUsers.count,
      newThisWeek: newUsersThisWeek.count,
    },
    jobs: {
      total,
      completed,
      failed,
      active: activeJobs.count,
      successRate,
    },
    credits: {
      consumedThisMonth: Math.abs(Number(totalCreditsConsumed.total ?? 0)),
      purchasedThisMonth: Number(totalCreditsPurchased.total ?? 0),
    },
    recentJobs,
  });
}
