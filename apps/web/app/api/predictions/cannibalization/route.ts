import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, cannibalizationIssues, projects, eq } from "@serpio/database";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { id: string; status: string };
  const { id, status } = body;
  if (!id || !status) return NextResponse.json({ error: "id ve status zorunlu" }, { status: 400 });

  const issue = await db.query.cannibalizationIssues.findFirst({
    where: eq(cannibalizationIssues.id, id),
  });
  if (!issue) return NextResponse.json({ error: "Sorun bulunamadı" }, { status: 404 });

  const project = await db.query.projects.findFirst({ where: eq(projects.id, issue.projectId) });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  await db.update(cannibalizationIssues).set({ status }).where(eq(cannibalizationIssues.id, id));

  return NextResponse.json({ success: true });
}
