import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@serpio/database";
import { jobs, projects } from "@serpio/database";
import { eq } from "@serpio/database";
import { Queue } from "bullmq";
import Redis from "ioredis";

type AiJobType = "style_guide" | "analyze" | "rewrite" | "rewrite_all";

interface AiJobPayload {
  type: AiJobType;
  projectId: string;
  userId: string;
  articleId?: string;
  jobDbId?: string;
}

const _redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6380", {
  maxRetriesPerRequest: null,
});
const aiQueue = new Queue<AiJobPayload>("ai", {
  connection: _redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 100, age: 86400 },
    removeOnFail: false,
  },
});

const JOB_TYPE_MAP: Record<AiJobType, "style_guide" | "ai_analyze" | "ai_rewrite"> = {
  style_guide: "style_guide",
  analyze:     "ai_analyze",
  rewrite:     "ai_rewrite",
  rewrite_all: "ai_rewrite",
};

const CREDIT_COST: Record<AiJobType, number> = {
  style_guide: 20,
  analyze:      5,
  rewrite:     15,
  rewrite_all:  0, // dinamik hesaplanır
};

export async function POST(req: NextRequest) {
  const { success } = rateLimit(req, 20, 60_000);
  if (!success) {
    return NextResponse.json({ error: "Çok fazla istek. Lütfen bekleyin." }, { status: 429 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { projectId, articleId, type } = body as {
    projectId: string;
    articleId?: string;
    type: AiJobType;
  };

  if (!projectId || !type) {
    return NextResponse.json({ error: "projectId ve type zorunlu" }, { status: 400 });
  }

  const validTypes: AiJobType[] = ["style_guide", "analyze", "rewrite", "rewrite_all"];
  if (!validTypes.includes(type)) {
    return NextResponse.json({ error: "Geçersiz job tipi" }, { status: 400 });
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  // DB'ye job kaydı oluştur (bullmqJobId'yi sonra güncelle)
  const [jobRecord] = await db
    .insert(jobs)
    .values({
      projectId,
      articleId: articleId ?? null,
      type: JOB_TYPE_MAP[type],
      status: "pending",
      creditCost: CREDIT_COST[type],
      payload: { type, articleId },
    })
    .returning();

  // BullMQ'ya gönder — jobDbId gömülü
  const bullJob = await aiQueue.add("ai", {
    type,
    projectId,
    userId: session.user.id,
    articleId,
    jobDbId: jobRecord.id,
  });

  // bullmqJobId'yi kaydet
  await db
    .update(jobs)
    .set({ bullmqJobId: bullJob.id })
    .where(eq(jobs.id, jobRecord.id));

  return NextResponse.json({
    jobId: jobRecord.id,
    bullmqJobId: bullJob.id,
    status: "queued",
  });
}
