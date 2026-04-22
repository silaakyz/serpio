import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, googleConnections, projects, eq } from "@serpio/database";
import { getAuthenticatedClient } from "@/lib/google";
import { google } from "googleapis";

// Kullanıcının GA4 property listesini döner — property seçimi için
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
    const analyticsAdmin = google.analyticsadmin({ version: "v1beta", auth: authClient });
    const resp = await analyticsAdmin.properties.list({
      filter: "parent:accounts/-",
    });
    const properties = (resp.data.properties ?? []).map((p) => ({
      name:         p.name,
      displayName:  p.displayName,
      propertyId:   p.name?.replace("properties/", ""),
    }));
    return NextResponse.json({ properties });
  } catch (err) {
    console.error("[GA4 properties error]", err);
    return NextResponse.json({ error: "GA4 property listesi alınamadı" }, { status: 500 });
  }
}
