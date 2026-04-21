import { db } from "@serpio/database";
import { users } from "@serpio/database";
import { eq } from "drizzle-orm";

export async function getUserCredits(userId: string): Promise<number> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  return user?.credits ?? 0;
}

export async function hasEnoughCredits(userId: string, required: number): Promise<boolean> {
  const credits = await getUserCredits(userId);
  return credits >= required;
}
