import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@serpio/database";
import { users } from "@serpio/database";
import { eq } from "@serpio/database";
import { authConfig } from "./auth.config";

/**
 * Full auth config — Node.js runtime (API routes, server actions).
 * Adapter, Google ve Credentials provider burada tanımlanır.
 * Edge middleware auth.config.ts'i kullanır (DB bağlantısı olmadan).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: DrizzleAdapter(db as any),
  providers: [
    Google({
      clientId:     process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email    = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email.toLowerCase().trim()),
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return {
          id:      user.id,
          name:    user.name,
          email:   user.email,
          role:    user.role,
          credits: user.credits,
        };
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
}) as any; // next-auth v5 beta type-inference workaround
