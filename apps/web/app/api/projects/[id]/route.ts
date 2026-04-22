import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@serpio/database";
import { projects } from "@serpio/database";
import { eq } from "@serpio/database";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, params.id),
  });

  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Proje bulunamadı" }, { status: 404 });
  }

  return NextResponse.json(project);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, params.id),
  });

  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Proje bulunamadı veya yetki yok" }, { status: 404 });
  }

  const body = await req.json();
  const { name, websiteUrl, publishConfig, activeChannel } = body as {
    name?: string;
    websiteUrl?: string;
    publishConfig?: Record<string, unknown>;
    activeChannel?: string;
  };

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updateData.name = name;
  if (websiteUrl !== undefined) updateData.websiteUrl = websiteUrl;
  if (activeChannel !== undefined) updateData.activeChannel = activeChannel;

  // publishConfig: mevcut config ile merge et (kanalları korumak için)
  if (publishConfig !== undefined) {
    const existing = (project.publishConfig as Record<string, unknown>) ?? {};
    updateData.publishConfig = { ...existing, ...publishConfig };
  }

  await db.update(projects).set(updateData).where(eq(projects.id, params.id));

  const updated = await db.query.projects.findFirst({
    where: eq(projects.id, params.id),
  });

  return NextResponse.json(updated);
}
