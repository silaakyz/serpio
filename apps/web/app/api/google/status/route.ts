import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, googleConnections, projects, eq } from "@serpio/database";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
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
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    gscSiteUrl:    conn.gscSiteUrl,
    ga4PropertyId: conn.ga4PropertyId,
    scope:         conn.scope,
    tokenExpiresAt: conn.tokenExpiresAt,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId zorunlu" }, { status: 400 });
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  const body = await req.json();
  const { gscSiteUrl, ga4PropertyId } = body as { gscSiteUrl?: string; ga4PropertyId?: string };

  await db
    .update(googleConnections)
    .set({ gscSiteUrl, ga4PropertyId, updatedAt: new Date() })
    .where(eq(googleConnections.projectId, projectId));

  return NextResponse.json({ success: true });
}
