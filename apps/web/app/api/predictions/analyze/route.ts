import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, jobs, projects, eq } from "@serpio/database";
import { Queue } from "bullmq";
import Redis from "ioredis";

interface PredictionsJobPayload {
  type: "decay_analysis" | "cannibalization" | "full_analysis";
  projectId: string;
  userId: string;
  jobDbId: string;
}

const redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6380", {
  maxRetriesPerRequest: null,
});
const predictionsQueue = new Queue<PredictionsJobPayload>("predictions", { connection: redis });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { projectId: string; type?: string };
  const { projectId } = body;
  const type = (body.type as PredictionsJobPayload["type"]) || "full_analysis";

  if (!projectId) return NextResponse.json({ error: "projectId zorunlu" }, { status: 400 });

  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  const dbJobType = type === "cannibalization" ? "cannibalization" : "decay_analysis";

  const [jobRecord] = await db.insert(jobs).values({
    projectId,
    type: dbJobType,
    status: "pending",
    creditCost: 3,
    payload: { type },
  }).returning();

  const bullJob = await predictionsQueue.add("predictions", {
    type,
    projectId,
    userId: session.user.id,
    jobDbId: jobRecord.id,
  });

  await db.update(jobs)
    .set({ bullmqJobId: bullJob.id })
    .where(eq(jobs.id, jobRecord.id));

  return NextResponse.json({ jobId: jobRecord.id, bullmqJobId: bullJob.id, status: "queued" });
}
