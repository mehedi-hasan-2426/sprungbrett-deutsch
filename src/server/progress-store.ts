import { neon } from "@neondatabase/serverless";
import { parseSnapshot } from "../lib/progress-sync.ts";
import type { ProgressSnapshot } from "../lib/progress-sync.ts";
import type { Progress } from "../lib/progress.ts";

export interface ProgressStore {
  read: (accountKey: string) => Promise<ProgressSnapshot>;
  write: (accountKey: string, revision: number, progress: Progress) => Promise<ProgressSnapshot | null>;
}

export function progressDatabaseConfigured(): boolean {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") return false;
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    const ssl = url.searchParams.get("sslmode");
    return ["postgresql:", "postgres:"].includes(url.protocol) && url.hostname.endsWith(".neon.tech")
      && Boolean(url.username && url.password && url.pathname.length > 1) && !url.hash
      && (ssl === null || ["require", "verify-full", "verify-ca"].includes(ssl));
  } catch {
    return false;
  }
}

export function createProgressStore(): ProgressStore {
  if (!progressDatabaseConfigured()) throw new Error("Progress storage is not configured for this environment");
  const sql = neon(process.env.DATABASE_URL ?? "", { fetchOptions: { signal: AbortSignal.timeout(10_000), cache: "no-store" } });
  return {
    async read(accountKey) {
      const rows = await sql`SELECT revision, progress FROM public.sprungbrett_progress WHERE account_key = ${accountKey}`;
      return parseSnapshot(rows[0] ?? { revision: 0, progress: null });
    },
    async write(accountKey, revision, progress) {
      const payload = JSON.stringify(progress);
      const rows = revision === 0
        ? await sql`INSERT INTO public.sprungbrett_progress (account_key, revision, progress)
            VALUES (${accountKey}, 1, ${payload}::jsonb)
            ON CONFLICT (account_key) DO NOTHING RETURNING revision, progress`
        : await sql`UPDATE public.sprungbrett_progress
            SET revision = revision + 1, progress = ${payload}::jsonb, updated_at = now()
            WHERE account_key = ${accountKey} AND revision = ${revision} AND revision < 2147483647
            RETURNING revision, progress`;
      return rows[0] ? parseSnapshot(rows[0]) : null;
    },
  };
}