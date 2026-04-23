import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, competitors, projects, eq } from "@serpio/database";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId zorunlu" }, { status: 400 });

  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  const list = await db.query.competitors.findMany({
    where: eq(competitors.projectId, projectId),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });

  return NextResponse.json({ competitors: list });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { projectId, name, websiteUrl } = body as { projectId: string; name: string; websiteUrl: string };

  if (!projectId || !name || !websiteUrl) {
    return NextResponse.json({ error: "projectId, name ve websiteUrl zorunlu" }, { status: 400 });
  }

  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  // Max 10 rakip
  const { count } = await import("@serpio/database");
  const [{ count: existing }] = await db.select({ count: count() }).from(competitors).where(eq(competitors.projectId, projectId));
  if ((existing ?? 0) >= 10) {
    return NextResponse.json({ error: "Maksimum 10 rakip eklenebilir" }, { status: 400 });
  }

  const [competitor] = await db.insert(competitors).values({
    projectId,
    name: name.trim(),
    websiteUrl: websiteUrl.trim(),
  }).returning();

  return NextResponse.json({ competitor });
}
