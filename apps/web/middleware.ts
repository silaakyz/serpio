import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Edge-safe: postgres adapter olmadan sadece JWT kontrol
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default (NextAuth(authConfig) as any).auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agency/:path*",
    "/portal/:path*",
    "/api/jobs/:path*",
    "/api/export/:path*",
  ],
};
