import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible auth config (adapter YOK — postgres çalışmaz Edge'de)
 * Sadece middleware ve JWT kontrol için kullanılır.
 */
export const authConfig: NextAuthConfig = {
  // Credentials provider auth.ts'de tanımlanır (Node.js runtime gerektirir).
  // Edge middleware bu config'i kullanır; sadece JWT/session kontrolü yapar.
  providers: [],
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
