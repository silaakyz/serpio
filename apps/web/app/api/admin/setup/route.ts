import { NextRequest, NextResponse } from "next/server";
import { db } from "@serpio/database";
import { users } from "@serpio/database";
import { eq, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/setup?secret=ADMIN_SETUP_SECRET
 *
 * ONE-TIME endpoint — promotes ADMIN_EMAIL to admin role.
 * Auto-disables once any admin exists.
 *
 * Required env vars:
 *   ADMIN_SETUP_SECRET  — shared secret to authenticate the call
 *   ADMIN_EMAIL         — the user email to promote
 *
 * Alternative (direct SQL):
 *   docker exec serpio_postgres psql -U serpio -d serpio_dev \
 *     -c "UPDATE users SET role = 'admin' WHERE email = 'you@example.com';"
 *
 * Disable permanently: remove ADMIN_SETUP_SECRET from .env
 */
export async function GET(req: NextRequest) {
  const secret     = process.env.ADMIN_SETUP_SECRET;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!secret) {
    return NextResponse.json({ error: "Setup endpoint is disabled" }, { status: 404 });
  }

  const { searchParams } = req.nextUrl;
  const providedSecret = searchParams.get("secret");

  if (providedSecret !== secret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  if (!adminEmail) {
    return NextResponse.json(
      { error: "ADMIN_EMAIL is not set in .env" },
      { status: 500 }
    );
  }

  // Auto-disable: if any admin already exists, refuse
  const [{ adminCount }] = await db
    .select({ adminCount: count() })
    .from(users)
    .where(eq(users.role, "admin"));

  if (adminCount > 0) {
    return NextResponse.json(
      { error: "An admin already exists. Remove ADMIN_SETUP_SECRET from .env to disable this endpoint." },
      { status: 403 }
    );
  }

  const result = await db
    .update(users)
    .set({ role: "admin", updatedAt: new Date() })
    .where(eq(users.email, adminEmail.toLowerCase().trim()))
    .returning({ id: users.id, email: users.email, role: users.role });

  if (result.length === 0) {
    return NextResponse.json(
      { error: `No user found with email: ${adminEmail}` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `${result[0].email} is now an admin. Remove ADMIN_SETUP_SECRET from .env to disable this endpoint.`,
    user: result[0],
  });
}
