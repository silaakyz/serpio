import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default auth((req: any) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // ── /admin/** — admin rolü zorunlu ────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!session?.user) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    const role = (session.user as { role?: string }).role;
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}) as any;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/agency/:path*",
    "/portal/:path*",
    "/api/jobs/:path*",
    "/api/admin/:path*",
    "/api/export/:path*",
  ],
};
