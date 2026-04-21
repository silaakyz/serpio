import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@serpio/database";
import { jobs, projects, articles } from "@serpio/database";
import { eq } from "drizzle-orm";
import { Queue } from "bullmq";
import Redis from "ioredis";

interface PublishJobPayload {
  projectId: string;
  userId: string;
  articleId: string;
  channel?: string;
  jobDbId?: string;
}

const _redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6380", {
  maxRetriesPerRequest: null,
});
const publishQueue = new Queue<PublishJobPayload>("publish", { connection: _redis });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { projectId, articleId, channel } = body as {
    projectId: string;
    articleId: string;
    channel?: string;
  };

  if (!projectId || !articleId) {
    return NextResponse.json({ error: "projectId ve articleId zorunlu" }, { status: 400 });
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
  if (!article || article.status !== "ready") {
    return NextResponse.json({ error: "Makale yayınlamaya hazır değil (status: ready olmalı)" }, { status: 400 });
  }

  const activeChannel = channel || project.activeChannel;
  const publishConfig = project.publishConfig as Record<string, unknown> | null;
  const channelConfig = publishConfig?.[activeChannel];

  if (!channelConfig) {
    return NextResponse.json(
      { error: `${activeChannel} kanalı yapılandırılmamış. Ayarlar → Yayınlama bölümünden credential girin.` },
      { status: 400 }
    );
  }

  // DB job kaydı oluştur
  const [jobRecord] = await db
    .insert(jobs)
    .values({
      projectId,
      articleId,
      type: "publish",
      status: "pending",
      creditCost: 2,
      payload: { channel: activeChannel },
    })
    .returning();

  // BullMQ'ya gönder
  const bullJob = await publishQueue.add("publish", {
    projectId,
    userId: session.user.id,
    articleId,
    channel: activeChannel,
    jobDbId: jobRecord.id,
  });

  await db
    .update(jobs)
    .set({ bullmqJobId: bullJob.id })
    .where(eq(jobs.id, jobRecord.id));

  return NextResponse.json({ jobId: jobRecord.id, bullmqJobId: bullJob.id, status: "queued" });
}
