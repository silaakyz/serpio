import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@serpio/database";
import { users, creditTransactions } from "@serpio/database";
import { eq, desc, and, gte, lte } from "@serpio/database";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const page    = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
  const limit   = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const type    = searchParams.get("type");  // "consumption" | "purchase" | "refund" | "bonus" | null
  const offset  = (page - 1) * limit;

  const userId = session.user.id;

  // Bakiye
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  const credits = user?.credits ?? 0;

  // Filtre koşulları
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = [eq(creditTransactions.userId, userId)];
  if (type && ["consumption","purchase","refund","bonus"].includes(type)) {
    conditions.push(eq(creditTransactions.type, type as "consumption" | "purchase" | "refund" | "bonus"));
  }

  // Bu ay
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [allTx, monthlyTx] = await Promise.all([
    // Sayfalı geçmiş
    db.query.creditTransactions.findMany({
      where: and(...conditions),
      orderBy: desc(creditTransactions.createdAt),
      limit,
      offset,
    }),
    // Bu ay tüm kayıtlar (istatistik için)
    db.query.creditTransactions.findMany({
      where: and(
        eq(creditTransactions.userId, userId),
        gte(creditTransactions.createdAt, monthStart)
      ),
      orderBy: desc(creditTransactions.createdAt),
    }),
  ]);

  // Bu ay harcanan / satın alınan
  const monthlySpent    = monthlyTx.filter(t => t.type === "consumption").reduce((s, t) => s + Math.abs(t.amount), 0);
  const monthlyPurchased = monthlyTx.filter(t => t.type === "purchase"  ).reduce((s, t) => s + t.amount, 0);

  // Tahmini yetme süresi (gün bazlı ortalama tüketim)
  const daysInMonth = now.getDate();
  const dailyAvg    = daysInMonth > 0 ? monthlySpent / daysInMonth : 0;
  const estimatedDays = dailyAvg > 0 ? Math.floor(credits / dailyAvg) : null;

  // Toplam kayıt sayısı (pagination için)
  const totalCount = await db.query.creditTransactions.findMany({
    where: and(...conditions),
  }).then(r => r.length);

  return NextResponse.json({
    credits,
    stats: {
      monthlySpent,
      monthlyPurchased,
      estimatedDays,
      dailyAvg: Math.round(dailyAvg * 10) / 10,
    },
    transactions: allTx,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
}
