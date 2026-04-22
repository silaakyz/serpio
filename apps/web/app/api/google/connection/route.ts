import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, googleConnections, projects, eq } from "@serpio/database";
import { createOAuth2Client } from "@/lib/google";

// GET — bağlantı durumu
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId gerekli" }, { status: 400 });
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
    connected:     true,
    gscSiteUrl:    conn.gscSiteUrl,
    ga4PropertyId: conn.ga4PropertyId,
    scope:         conn.scope,
    tokenExpiresAt: conn.tokenExpiresAt,
    updatedAt:     conn.updatedAt,
  });
}

// PATCH — gscSiteUrl / ga4PropertyId güncelle
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId gerekli" }, { status: 400 });
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  const body = await req.json();
  const { gscSiteUrl, ga4PropertyId } = body as {
    gscSiteUrl?:    string | null;
    ga4PropertyId?: string | null;
  };

  await db
    .update(googleConnections)
    .set({ gscSiteUrl, ga4PropertyId, updatedAt: new Date() })
    .where(eq(googleConnections.projectId, projectId));

  return NextResponse.json({ success: true });
}

// DELETE — bağlantıyı kaldır (token revoke + DB silme)
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId gerekli" }, { status: 400 });
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

  if (conn) {
    // Token'ı revoke et (hata olursa yoksay — silmeye devam et)
    try {
      const oauth2Client = createOAuth2Client();
      await oauth2Client.revokeToken(conn.accessToken);
    } catch { /* ignore */ }

    await db.delete(googleConnections).where(eq(googleConnections.projectId, projectId));
  }

  return NextResponse.json({ success: true });
}
