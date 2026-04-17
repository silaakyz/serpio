import { db } from "../lib/db";
import { users, creditTransactions } from "@serpio/database";
import { eq } from "drizzle-orm";

export async function checkCredits(userId: string, required: number): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  return (user?.credits ?? 0) >= required;
}

export async function consumeCredits(
  userId: string,
  amount: number,
  description: string,
  jobId?: string
): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user || user.credits < amount) return false;

  const newBalance = user.credits - amount;

  await db.update(users)
    .set({ credits: newBalance, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await db.insert(creditTransactions).values({
    userId,
    type: "consumption",
    amount: -amount,
    balance: newBalance,
    description,
    jobId,
  });

  return true;
}
