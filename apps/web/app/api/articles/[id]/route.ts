import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@serpio/database";
import { articles, projects } from "@serpio/database";
import { eq } from "@serpio/database";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const article = await db.query.articles.findFirst({
    where: eq(articles.id, params.id),
  });
  if (!article) {
    return NextResponse.json({ error: "Makale bulunamadı" }, { status: 404 });
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, article.projectId),
  });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
  }

  const body = await req.json();
  const { aiContent, aiTitle, status } = body as {
    aiContent?: string;
    aiTitle?: string;
    status?: "ready" | "scheduled" | "published";
  };

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (aiContent !== undefined) updateData.aiContent = aiContent;
  if (aiTitle !== undefined) updateData.aiTitle = aiTitle;
  if (status !== undefined) updateData.status = status;

  await db.update(articles).set(updateData).where(eq(articles.id, params.id));

  return NextResponse.json({ success: true });
}
