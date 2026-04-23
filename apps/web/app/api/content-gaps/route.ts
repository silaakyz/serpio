import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, contentGaps, projects, eq, and } from "@serpio/database";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const status    = searchParams.get("status");

  if (!projectId) return NextResponse.json({ error: "projectId zorunlu" }, { status: 400 });

  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  const conditions = [eq(contentGaps.projectId, projectId)];
  if (status && ["open", "dismissed", "assigned", "published"].includes(status)) {
    conditions.push(eq(contentGaps.status, status));
  }

  const gaps = await db.query.contentGaps.findMany({
    where: and(...conditions),
    orderBy: (t, { desc }) => [desc(t.priorityScore)],
    limit: 200,
  });

  return NextResponse.json({ gaps });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { id: string; status: string };
  const { id, status } = body;

  if (!id || !status) return NextResponse.json({ error: "id ve status zorunlu" }, { status: 400 });

  const gap = await db.query.contentGaps.findFirst({ where: eq(contentGaps.id, id) });
  if (!gap) return NextResponse.json({ error: "Fırsat bulunamadı" }, { status: 404 });

  const project = await db.query.projects.findFirst({ where: eq(projects.id, gap.projectId) });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  await db.update(contentGaps).set({ status }).where(eq(contentGaps.id, id));

  return NextResponse.json({ success: true });
}
