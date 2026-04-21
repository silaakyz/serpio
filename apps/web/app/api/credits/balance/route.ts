import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserCredits } from "@/lib/check-credits";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const credits = await getUserCredits(session.user.id);
  return NextResponse.json({ credits });
}
