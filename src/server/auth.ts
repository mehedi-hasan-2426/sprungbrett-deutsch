import { createHash } from "node:crypto";
import type { NextAuthOptions, Session } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { approvedEmails, canAccess, safeAuthRedirect, sessionIsCurrent } from "../lib/access.ts";

export type CourseSession = Session & { accountKey?: string };

export function authConfigured(): boolean {
  try {
    const url = new URL(process.env.NEXTAUTH_URL ?? "");
    const secure = url.protocol === "https:" || (process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
    return secure && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash
      && approvedEmails(process.env.ALLOWED_EMAILS).length === 2
      && (process.env.NEXTAUTH_SECRET?.length ?? 0) >= 32
      && Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  } catch {
    return false;
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    authorization: { params: { scope: "openid email", prompt: "select_account" } },
    checks: ["pkce", "state", "nonce"],
  })],
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/signin", error: "/signin" },
  debug: false,
  logger: {
    error(code) { console.error("Authentication error:", code); },
    warn(code) { console.warn("Authentication warning:", code); },
  },
  callbacks: {
    async signIn({ account, profile }) {
      const verified = profile && "email_verified" in profile ? profile.email_verified : false;
      const allowed = authConfigured() && account?.provider === "google" && canAccess(profile?.email, verified, process.env.ALLOWED_EMAILS);
      if (!allowed) console.warn("Google sign-in denied by the two-account access policy.");
      return allowed;
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.provider = account.provider;
        token.verified = profile && "email_verified" in profile ? profile.email_verified === true : false;
        token.email = profile?.email?.toLowerCase();
        token.signedInAt = Date.now();
      }
      if (!authConfigured() || token.provider !== "google" || !canAccess(token.email, token.verified, process.env.ALLOWED_EMAILS) || !sessionIsCurrent(token.signedInAt)) return {};
      return token;
    },
    async session({ session, token }) {
      const next = session as CourseSession;
      if (typeof token.sub !== "string" || !canAccess(token.email, token.verified, process.env.ALLOWED_EMAILS) || !sessionIsCurrent(token.signedInAt)) {
        delete next.user;
        delete next.accountKey;
        next.expires = new Date(0).toISOString();
        return next;
      }
      next.user = { email: token.email };
      next.accountKey = createHash("sha256").update(`google:${token.sub}`).digest("hex");
      return next;
    },
    async redirect({ url, baseUrl }) {
      return safeAuthRedirect(url, baseUrl);
    },
  },
};