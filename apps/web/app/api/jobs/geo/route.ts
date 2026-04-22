import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@serpio/database";
import { jobs, projects, articles } from "@serpio/database";
import { eq } from "@serpio/database";
import { Queue } from "bullmq";
import Redis from "ioredis";

type GeoJobType = "geo_analyze" | "geo_optimize";
const CREDIT_COST: Record<GeoJobType, number> = {
  geo_analyze: 2,
  geo_optimize: 5,
};

const _redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6380", {
  maxRetriesPerRequest: null,
});
const geoQueue = new Queue("geo", {
  connection: _redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: false,
  },
});

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, 20, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Çok fazla istek. Lütfen bekleyin." }, { status: 429 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { projectId, articleId, type } = body as {
    projectId?: string;
    articleId?: string;
    type?: GeoJobType;
  };

  if (!projectId || !articleId || !type) {
    return NextResponse.json(
      { error: "projectId, articleId ve type zorunlu" },
      { status: 400 }
    );
  }

  if (!["geo_analyze", "geo_optimize"].includes(type)) {
    return NextResponse.json({ error: "Geçersiz type" }, { status: 400 });
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  const article = await db.query.articles.findFirst({
    where: eq(articles.id, articleId),
  });
  if (!article || article.projectId !== projectId) {
    return NextResponse.json({ error: "Makale bulunamadı" }, { status: 404 });
  }

  const bullJob = await geoQueue.add("geo", {
    type,
    projectId,
    userId: session.user.id,
    articleId,
  });

  const [jobRow] = await db
    .insert(jobs)
    .values({
      projectId,
      articleId,
      bullmqJobId: bullJob.id,
      type,
      status: "pending",
      creditCost: CREDIT_COST[type],
      payload: { type, articleId },
    })
    .returning();

  return NextResponse.json({ jobId: bullJob.id, dbJobId: jobRow.id, status: "queued" });
}
