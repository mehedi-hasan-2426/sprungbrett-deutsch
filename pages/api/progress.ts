import { getServerSession } from "next-auth/next";
import { canAccess } from "../../src/lib/access.ts";
import { authConfigured, authOptions } from "../../src/server/auth.ts";
import type { CourseSession } from "../../src/server/auth.ts";
import { createProgressHandler } from "../../src/server/progress-api.ts";
import { createProgressStore, progressDatabaseConfigured } from "../../src/server/progress-store.ts";

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

export default createProgressHandler({
  async authorize(request, response) {
    if (!authConfigured()) return null;
    const session = await getServerSession(request, response, authOptions) as CourseSession | null;
    return session?.accountKey && canAccess(session.user?.email, true, process.env.ALLOWED_EMAILS) ? session.accountKey : null;
  },
  configured: progressDatabaseConfigured,
  store: createProgressStore,
  origin: () => new URL(process.env.NEXTAUTH_URL ?? "").origin,
});