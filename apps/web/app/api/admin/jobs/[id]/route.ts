import { NextRequest, NextResponse } from "next/server";
import { adminResponse } from "@/lib/admin-guard";
import { db } from "@serpio/database";
import { jobs, jobLogs, projects, users } from "@serpio/database";
import { eq, asc } from "@serpio/database";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await adminResponse(); if (guard) return guard;
  

  const [row] = await db
    .select({
      id:          jobs.id,
      type:        jobs.type,
      status:      jobs.status,
      creditCost:  jobs.creditCost,
      progress:    jobs.progress,
      error:       jobs.error,
      payload:     jobs.payload,
      result:      jobs.result,
      bullmqJobId: jobs.bullmqJobId,
      createdAt:   jobs.createdAt,
      startedAt:   jobs.startedAt,
      completedAt: jobs.completedAt,
      projectId:   jobs.projectId,
      projectName: projects.name,
      userEmail:   users.email,
    })
    .from(jobs)
    .leftJoin(projects, eq(jobs.projectId, projects.id))
    .leftJoin(users, eq(projects.userId, users.id))
    .where(eq(jobs.id, params.id));

  if (!row) {
    return NextResponse.json({ error: "Job bulunamadı" }, { status: 404 });
  }

  const logs = await db
    .select()
    .from(jobLogs)
    .where(eq(jobLogs.jobId, params.id))
    .orderBy(asc(jobLogs.createdAt));

  return NextResponse.json({ job: row, logs });
}
