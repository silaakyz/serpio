import { NextRequest, NextResponse } from "next/server";
import { adminResponse } from "@/lib/admin-guard";
import { db } from "@serpio/database";
import { jobs, projects, users } from "@serpio/database";
import { count, eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await adminResponse(); if (guard) return guard;
  

  const { searchParams } = req.nextUrl;
  const page   = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit  = Math.min(100, Number(searchParams.get("limit") ?? "30"));
  const status = searchParams.get("status");
  const offset = (page - 1) * limit;

  const where = status
    ? eq(jobs.status, status as "pending" | "active" | "completed" | "failed" | "retrying")
    : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id:          jobs.id,
        type:        jobs.type,
        status:      jobs.status,
        creditCost:  jobs.creditCost,
        progress:    jobs.progress,
        error:       jobs.error,
        createdAt:   jobs.createdAt,
        completedAt: jobs.completedAt,
        projectId:   jobs.projectId,
        projectName: projects.name,
        userEmail:   users.email,
      })
      .from(jobs)
      .leftJoin(projects, eq(jobs.projectId, projects.id))
      .leftJoin(users, eq(projects.userId, users.id))
      .where(where)
      .orderBy(desc(jobs.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(jobs).where(where),
  ]);

  return NextResponse.json({
    jobs: rows,
    pagination: { page, limit, total: total, pages: Math.ceil(total / limit) },
  });
}
