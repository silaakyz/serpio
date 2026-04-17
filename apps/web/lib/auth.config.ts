import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

/**
 * Edge-compatible auth config (adapter YOK — postgres çalışmaz Edge'de)
 * Sadece middleware ve JWT kontrol için kullanılır.
 */
export const authConfig: NextAuthConfig = {
  providers: [
    // DEV ONLY: production'da kaldır
    Credentials({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (process.env.NODE_ENV === "development" && credentials?.email) {
          return {
            id:    "dev-user-1",
            email: credentials.email as string,
            name:  "Dev User",
          };
        }
        return null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error:  "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id      = user.id;
        token.role    = (user as { role?: string }).role    ?? "user";
        token.credits = (user as { credits?: number }).credits ?? 100;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id                                = token.id as string;
        (session.user as { role?: string }).role       = token.role as string;
        (session.user as { credits?: number }).credits = token.credits as number;
      }
      return session;
    },
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
};
