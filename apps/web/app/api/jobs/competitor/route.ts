import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, jobs, projects, competitors, eq } from "@serpio/database";
import { Queue } from "bullmq";
import Redis from "ioredis";

type CompetitorJobType = "crawl_competitor" | "content_gap" | "crawl_all";

interface CompetitorJobPayload {
  type: CompetitorJobType;
  projectId: string;
  userId: string;
  jobDbId: string;
  competitorId?: string;
}

const redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6380", {
  maxRetriesPerRequest: null,
});
const competitorQueue = new Queue<CompetitorJobPayload>("competitor", { connection: redis });

const CREDIT_COSTS: Record<CompetitorJobType, number> = {
  crawl_competitor: 3,
  crawl_all:        3, // rakip başına
  content_gap:      5,
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { type: CompetitorJobType; projectId: string; competitorId?: string };
  const { type, projectId, competitorId } = body;

  if (!type || !projectId) {
    return NextResponse.json({ error: "type ve projectId zorunlu" }, { status: 400 });
  }

  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  if (type === "crawl_competitor" && competitorId) {
    const competitor = await db.query.competitors.findFirst({ where: eq(competitors.id, competitorId) });
    if (!competitor || competitor.projectId !== projectId) {
      return NextResponse.json({ error: "Rakip bulunamadı" }, { status: 404 });
    }
  }

  const dbJobType = type === "content_gap" ? "content_gap" : "competitor_crawl";

  const [jobRecord] = await db.insert(jobs).values({
    projectId,
    type: dbJobType,
    status: "pending",
    creditCost: CREDIT_COSTS[type],
    payload: { type, competitorId },
  }).returning();

  const bullJob = await competitorQueue.add("competitor", {
    type,
    projectId,
    userId: session.user.id,
    jobDbId: jobRecord.id,
    competitorId,
  });

  await db.update(jobs)
    .set({ bullmqJobId: bullJob.id })
    .where(eq(jobs.id, jobRecord.id));

  return NextResponse.json({ jobId: jobRecord.id, bullmqJobId: bullJob.id, status: "queued" });
}
