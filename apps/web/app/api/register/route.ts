import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@serpio/database";
import { users, creditTransactions } from "@serpio/database";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { success } = rateLimit(req, 5, 3_600_000); // 5/saat per IP
  if (!success) {
    return NextResponse.json({ error: "Çok fazla kayıt denemesi. Lütfen bir saat bekleyin." }, { status: 429 });
  }

  const body = await req.json();
  const { name, email, password } = body as {
    name: string;
    email: string;
    password: string;
  };

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Tüm alanlar zorunlu" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Şifre en az 8 karakter olmalı" }, { status: 400 });
  }

  // Email zaten kayıtlı mı?
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase().trim()),
  });

  if (existing) {
    return NextResponse.json({ error: "Bu email zaten kayıtlı" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const [newUser] = await db.insert(users).values({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    credits: 100,
  }).returning();

  // Hoş geldin bonusu kaydı
  await db.insert(creditTransactions).values({
    userId: newUser.id,
    type: "bonus",
    amount: 100,
    balance: 100,
    description: "Hoş geldin bonusu — 100 ücretsiz kredi",
  });

  return NextResponse.json({ success: true });
}
