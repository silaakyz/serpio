import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, projects, siteAuditIssues, eq } from "@serpio/database";

export async function POST(
  req: NextRequest,
  { params }: { params: { issueId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const issue = await db.query.siteAuditIssues.findFirst({
    where: eq(siteAuditIssues.id, params.issueId),
  });
  if (!issue) {
    return NextResponse.json({ error: "Sorun bulunamadı" }, { status: 404 });
  }

  // Ownership check via project
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, issue.projectId),
  });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  await db
    .update(siteAuditIssues)
    .set({ resolvedAt: new Date() })
    .where(eq(siteAuditIssues.id, params.issueId));

  return NextResponse.json({ success: true });
}
