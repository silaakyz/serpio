import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@serpio/database";
import { projects } from "@serpio/database";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const list = await db.query.projects.findMany({
    where: eq(projects.userId, session.user.id),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return NextResponse.json({ projects: list });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, websiteUrl } = body;

  if (!websiteUrl) {
    return NextResponse.json({ error: "websiteUrl zorunlu" }, { status: 400 });
  }

  const [project] = await db.insert(projects).values({
    userId: session.user.id,
    name: name || new URL(websiteUrl).hostname,
    websiteUrl,
  }).returning();

  return NextResponse.json({ project });
}
