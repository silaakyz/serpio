import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Server component / API route'larında admin kontrolü.
 * Edge middleware zaten /admin/** rotalarını koruyor;
 * bu yardımcı API route'lar için ek güvence sağlar.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }
  return { error: null, session };
}
