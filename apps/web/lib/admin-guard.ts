import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Throws "401" or "403" if the caller is not an authenticated admin.
 * Usage in API routes: wrap with adminResponse() or catch manually.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("401");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((session.user as any).role !== "admin") throw new Error("403");
  return session.user;
}

/**
 * Converts the error thrown by requireAdmin() into a NextResponse.
 * Returns null when the caller IS an admin (proceed normally).
 *
 * Usage:
 *   const guard = await adminResponse();
 *   if (guard) return guard;
 */
export async function adminResponse(): Promise<NextResponse | null> {
  try {
    await requireAdmin();
    return null;
  } catch (e) {
    const code = e instanceof Error ? e.message : "403";
    if (code === "401") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
