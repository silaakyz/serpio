import { NextRequest, NextResponse } from "next/server";
import { adminResponse } from "@/lib/admin-guard";
import { db } from "@serpio/database";
import { users, jobs, creditTransactions } from "@serpio/database";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/admin/users/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await adminResponse(); if (guard) return guard;
  

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, params.id));

  if (!user) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
  }

  const [recentJobs, recentTransactions] = await Promise.all([
    db
      .select({
        id:          jobs.id,
        type:        jobs.type,
        status:      jobs.status,
        creditCost:  jobs.creditCost,
        createdAt:   jobs.createdAt,
        completedAt: jobs.completedAt,
      })
      .from(jobs)
      .where(eq(jobs.projectId, params.id)) // Note: jobs link to projectId not userId directly
      .orderBy(desc(jobs.createdAt))
      .limit(10),
    db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, params.id))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(20),
  ]);

  // Don't expose password
  const { password: _pw, ...safeUser } = user;

  return NextResponse.json({ user: safeUser, recentJobs, recentTransactions });
}

// PATCH /api/admin/users/[id] — update role
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await adminResponse(); if (guard) return guard;
  

  const body = await req.json();
  const { role } = body as { role?: "user" | "admin" };

  if (!role || !["user", "admin"].includes(role)) {
    return NextResponse.json({ error: "Geçersiz rol" }, { status: 400 });
  }

  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, params.id));

  return NextResponse.json({ success: true });
}
