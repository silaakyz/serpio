import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Google from "next-auth/providers/google";
import { db } from "@serpio/database";
import { authConfig } from "./auth.config";

/**
 * Full auth config — Node.js runtime (API routes, server actions).
 * Adapter ve Google provider eklenir.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db),
  providers: [
    Google({
      clientId:     process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    ...authConfig.providers,
  ],
  secret: process.env.AUTH_SECRET,
}) as any; // next-auth v5 beta type-inference workaround
