import { NextRequest, NextResponse } from "next/server";
import { adminResponse } from "@/lib/admin-guard";
import { db } from "@serpio/database";
import { jobLogs, jobs, projects, users } from "@serpio/database";
import { count, eq, desc } from "@serpio/database";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await adminResponse(); if (guard) return guard;
  

  const { searchParams } = req.nextUrl;
  const page  = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? "50"));
  const level = searchParams.get("level");
  const offset = (page - 1) * limit;

  const where = level
    ? eq(jobLogs.level, level as "info" | "success" | "warning" | "error" | "debug")
    : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id:        jobLogs.id,
        level:     jobLogs.level,
        message:   jobLogs.message,
        meta:      jobLogs.meta,
        createdAt: jobLogs.createdAt,
        jobId:     jobLogs.jobId,
        jobType:   jobs.type,
        jobStatus: jobs.status,
        projectName: projects.name,
        userEmail:   users.email,
      })
      .from(jobLogs)
      .leftJoin(jobs,     eq(jobLogs.jobId,    jobs.id))
      .leftJoin(projects, eq(jobs.projectId,   projects.id))
      .leftJoin(users,    eq(projects.userId,  users.id))
      .where(where)
      .orderBy(desc(jobLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(jobLogs).where(where),
  ]);

  return NextResponse.json({
    logs: rows,
    pagination: { page, limit, total: total, pages: Math.ceil(total / limit) },
  });
}
