import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, googleConnections, projects, eq } from "@serpio/database";
import { getAuthenticatedClient } from "@/lib/google";
import { google } from "googleapis";

// Kullanıcının GSC'deki site listesini döner — site seçimi için
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
    return NextResponse.json({ error: "Google bağlantısı yok" }, { status: 400 });
  }

  try {
    const authClient = await getAuthenticatedClient(projectId);
    const webmasters = google.webmasters({ version: "v3", auth: authClient });
    const resp = await webmasters.sites.list();
    const sites = (resp.data.siteEntry ?? []).map((s) => ({
      siteUrl:        s.siteUrl,
      permissionLevel: s.permissionLevel,
    }));
    return NextResponse.json({ sites });
  } catch (err) {
    console.error("[GSC sites error]", err);
    return NextResponse.json({ error: "GSC site listesi alınamadı" }, { status: 500 });
  }
}
