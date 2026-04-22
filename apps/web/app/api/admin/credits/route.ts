import { NextRequest, NextResponse } from "next/server";
import { adminResponse } from "@/lib/admin-guard";
import { db, sql, desc, count } from "@serpio/database";
import { creditTransactions } from "@serpio/database";
import type { SQL } from "@serpio/database";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await adminResponse(); if (guard) return guard;
  

  const { searchParams } = req.nextUrl;
  const page  = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? "30"));
  const type  = searchParams.get("type");
  const offset = (page - 1) * limit;

  const validTypes = ["purchase", "consumption", "refund", "bonus"];
  const typeFilter = type && validTypes.includes(type)
    ? sql`${creditTransactions.type} = ${type}`
    : undefined;

  const baseQuery = db.select().from(creditTransactions);
  const countQuery = db.select({ total: count() }).from(creditTransactions);

  const [rows, [{ total }]] = await Promise.all([
    (typeFilter ? baseQuery.where(typeFilter) : baseQuery)
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit)
      .offset(offset),
    typeFilter ? countQuery.where(typeFilter) : countQuery,
  ]);

  return NextResponse.json({
    transactions: rows,
    pagination: { page, limit, total: total, pages: Math.ceil(total / limit) },
  });
}
