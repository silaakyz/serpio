import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, competitors, projects, eq } from "@serpio/database";

async function getCompetitorWithAuth(competitorId: string, userId: string) {
  const competitor = await db.query.competitors.findFirst({
    where: eq(competitors.id, competitorId),
  });
  if (!competitor) return null;
  const project = await db.query.projects.findFirst({ where: eq(projects.id, competitor.projectId) });
  if (!project || project.userId !== userId) return null;
  return competitor;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const competitor = await getCompetitorWithAuth(params.id, session.user.id);
  if (!competitor) return NextResponse.json({ error: "Rakip bulunamadı" }, { status: 404 });

  const body = await req.json() as { name?: string; isActive?: boolean };
  await db.update(competitors)
    .set({
      ...(body.name     !== undefined ? { name: body.name }         : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    })
    .where(eq(competitors.id, params.id));

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const competitor = await getCompetitorWithAuth(params.id, session.user.id);
  if (!competitor) return NextResponse.json({ error: "Rakip bulunamadı" }, { status: 404 });

  await db.delete(competitors).where(eq(competitors.id, params.id));

  return NextResponse.json({ success: true });
}
