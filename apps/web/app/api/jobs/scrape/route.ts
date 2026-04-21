import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@serpio/database";
import { jobs, projects } from "@serpio/database";
import { eq } from "drizzle-orm";
import { Queue } from "bullmq";
import Redis from "ioredis";

interface ScrapePayload {
  projectId: string;
  userId: string;
  url: string;
  jobDbId: string;
  maxDepth: number;
  maxPages: number;
}

const _redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6380", {
  maxRetriesPerRequest: null,
});
const scrapeQueue = new Queue<ScrapePayload>("scrape", {
  connection: _redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 100, age: 86400 },
    removeOnFail: false,
  },
});

export async function POST(req: NextRequest) {
  const { success } = rateLimit(req, 10, 60_000);
  if (!success) {
    return NextResponse.json({ error: "Çok fazla istek. Lütfen bekleyin." }, { status: 429 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { projectId, url, maxDepth, maxPages } = body as {
    projectId: string;
    url: string;
    maxDepth?: number;
    maxPages?: number;
  };

  if (!projectId || !url) {
    return NextResponse.json({ error: "projectId ve url zorunlu" }, { status: 400 });
  }

  // URL format kontrolü
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Geçersiz URL formatı" }, { status: 400 });
  }

  // Projenin kullanıcıya ait olduğunu doğrula
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  // Jobs tablosuna önce kayıt ekle (jobDbId elde etmek için)
  const [jobRecord] = await db.insert(jobs).values({
    projectId,
    type: "scrape",
    status: "pending",
    creditCost: 10,
    payload: { url, maxDepth: maxDepth ?? 2, maxPages: maxPages ?? 100 },
  }).returning();

  // BullMQ'ya job ekle (DB id'yi data'ya göm)
  const bullJob = await scrapeQueue.add("scrape", {
    projectId,
    userId: session.user.id,
    url,
    jobDbId: jobRecord.id,
    maxDepth: maxDepth ?? 2,
    maxPages: maxPages ?? 100,
  });

  // bullmqJobId'yi kayıt et
  await db.update(jobs)
    .set({ bullmqJobId: bullJob.id })
    .where(eq(jobs.id, jobRecord.id));

  return NextResponse.json({
    jobId: jobRecord.id,
    bullmqJobId: bullJob.id,
    status: "queued",
  });
}
