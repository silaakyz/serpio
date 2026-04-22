import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { db, googleConnections, projects, eq } from "@serpio/database";
import { Queue } from "bullmq";
import Redis from "ioredis";

const _redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6380", {
  maxRetriesPerRequest: null,
});
const gscSyncQueue = new Queue("gsc-sync", { connection: _redis });

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, 5, 60_000);
  if (!rl.success) {
    return NextResponse.json({ error: "Çok fazla istek" }, { status: 429 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { projectId } = body as { projectId?: string };
  if (!projectId) {
    return NextResponse.json({ error: "projectId zorunlu" }, { status: 400 });
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  const conn = await db.query.googleConnections.findFirst({
    where: eq(googleConnections.projectId, projectId),
  });
  if (!conn) {
    return NextResponse.json({ error: "Google bağlantısı yok" }, { status: 400 });
  }

  const job = await gscSyncQueue.add("gsc-sync", { projectId });

  return NextResponse.json({ success: true, jobId: job.id });
}
