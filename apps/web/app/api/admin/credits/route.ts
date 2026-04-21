import { NextRequest, NextResponse } from "next/server";
import { adminResponse } from "@/lib/admin-guard";
import { db } from "@serpio/database";
import { creditTransactions } from "@serpio/database";
import { count, eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await adminResponse(); if (guard) return guard;
  

  const { searchParams } = req.nextUrl;
  const page  = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? "30"));
  const type  = searchParams.get("type");
  const offset = (page - 1) * limit;

  const where = type
    ? eq(creditTransactions.type, type as "purchase" | "consumption" | "refund" | "bonus")
    : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(creditTransactions)
      .where(where)
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(creditTransactions).where(where),
  ]);

  return NextResponse.json({
    transactions: rows,
    pagination: { page, limit, total: total, pages: Math.ceil(total / limit) },
  });
}
