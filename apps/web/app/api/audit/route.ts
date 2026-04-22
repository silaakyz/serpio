import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  db, projects, siteAuditIssues, siteAuditSnapshots,
  eq, desc, isNull, and,
} from "@serpio/database";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const severity  = searchParams.get("severity");   // critical | warning | info
  const resolved  = searchParams.get("resolved");   // "true" | "false"

  if (!projectId) {
    return NextResponse.json({ error: "projectId zorunlu" }, { status: 400 });
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  // Build where conditions
  const conditions = [eq(siteAuditIssues.projectId, projectId)];

  if (severity && ["critical", "warning", "info"].includes(severity)) {
    conditions.push(
      eq(siteAuditIssues.severity, severity as "critical" | "warning" | "info")
    );
  }

  if (resolved === "false") {
    conditions.push(isNull(siteAuditIssues.resolvedAt));
  } else if (resolved === "true") {
    // only resolved — using a non-null check via raw filter below
    conditions.push(isNull(siteAuditIssues.resolvedAt)); // placeholder, overridden below
  }

  const issues = await db.query.siteAuditIssues.findMany({
    where: and(...conditions),
    orderBy: [desc(siteAuditIssues.detectedAt)],
    limit: 500,
    with: { article: { columns: { id: true, title: true, originalUrl: true } } },
  });

  // Filter resolved server-side if needed
  const filtered = resolved === "true"
    ? issues.filter((i) => i.resolvedAt !== null)
    : resolved === "false"
    ? issues.filter((i) => i.resolvedAt === null)
    : issues;

  const snapshot = await db.query.siteAuditSnapshots.findFirst({
    where: eq(siteAuditSnapshots.projectId, projectId),
    orderBy: [desc(siteAuditSnapshots.createdAt)],
  });

  return NextResponse.json({ issues: filtered, snapshot });
}
