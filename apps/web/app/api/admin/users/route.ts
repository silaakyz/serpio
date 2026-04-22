import { NextRequest, NextResponse } from "next/server";
import { adminResponse } from "@/lib/admin-guard";
import { db } from "@serpio/database";
import { users, creditTransactions } from "@serpio/database";
import { count, eq, ilike, or, desc } from "@serpio/database";

export const dynamic = "force-dynamic";

// GET /api/admin/users — paginated user list with search
export async function GET(req: NextRequest) {
  const guard = await adminResponse(); if (guard) return guard;
  

  const { searchParams } = req.nextUrl;
  const page   = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit  = Math.min(50, Number(searchParams.get("limit") ?? "20"));
  const search = searchParams.get("search") ?? "";
  const offset = (page - 1) * limit;

  const where = search
    ? or(
        ilike(users.email, `%${search}%`),
        ilike(users.name,  `%${search}%`)
      )
    : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id:        users.id,
        name:      users.name,
        email:     users.email,
        role:      users.role,
        credits:   users.credits,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(users)
      .where(where),
  ]);

  return NextResponse.json({
    users: rows,
    pagination: { page, limit, total: total, pages: Math.ceil(total / limit) },
  });
}

// POST /api/admin/users — add/remove credits for a user
export async function POST(req: NextRequest) {
  const guard = await adminResponse(); if (guard) return guard;
  

  const body = await req.json();
  const { userId, amount, description } = body as {
    userId: string;
    amount: number;
    description?: string;
  };

  if (!userId || typeof amount !== "number" || amount === 0) {
    return NextResponse.json({ error: "userId ve sıfır olmayan amount zorunlu" }, { status: 400 });
  }

  // Fetch current balance
  const [user] = await db
    .select({ credits: users.credits })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
  }

  const newBalance = user.credits + amount;

  if (newBalance < 0) {
    return NextResponse.json({ error: "Bakiye sıfırın altına düşemez" }, { status: 400 });
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ credits: newBalance })
      .where(eq(users.id, userId));

    await tx.insert(creditTransactions).values({
      id:          crypto.randomUUID(),
      userId,
      type:        amount > 0 ? "bonus" : "consumption",
      amount,
      balance:     newBalance,
      description: description ?? (amount > 0 ? "Admin kredi ekledi" : "Admin kredi çıkardı"),
    });
  });

  return NextResponse.json({ success: true, newBalance });
}
