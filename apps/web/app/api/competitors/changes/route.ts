import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, competitors, competitorChanges, projects, eq, desc, inArray } from "@serpio/database";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const limit     = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);

  if (!projectId) return NextResponse.json({ error: "projectId zorunlu" }, { status: 400 });

  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  const projectCompetitors = await db.query.competitors.findMany({
    where: eq(competitors.projectId, projectId),
    columns: { id: true, name: true },
  });

  if (projectCompetitors.length === 0) {
    return NextResponse.json({ changes: [] });
  }

  const competitorIds = projectCompetitors.map((c) => c.id);
  const nameMap = new Map(projectCompetitors.map((c) => [c.id, c.name]));

  const changeRows = await db.query.competitorChanges.findMany({
    where: inArray(competitorChanges.competitorId, competitorIds),
    orderBy: [desc(competitorChanges.detectedAt)],
    limit,
  });

  const changes = changeRows.map((c) => ({
    ...c,
    competitorName: nameMap.get(c.competitorId) ?? "",
  }));

  return NextResponse.json({ changes });
}
