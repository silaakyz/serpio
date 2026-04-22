import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGoogleAuthUrl } from "@/lib/google";
import { db, projects, eq } from "@serpio/database";

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

  // State = projectId|userId (URL-safe base64)
  const state = Buffer.from(`${projectId}|${session.user.id}`).toString("base64url");
  const url = getGoogleAuthUrl(state);

  return NextResponse.redirect(url);
}
