import { test } from "node:test";
import assert from "node:assert/strict";
import { neonConfig } from "@neondatabase/serverless";
import { createProgressStore, progressDatabaseConfigured } from "../src/server/progress-store.ts";
import { emptyProgress } from "../src/lib/progress.ts";

test("database configuration is server-only, Neon TLS only and disabled in previews", () => {
  const originalUrl = process.env.DATABASE_URL;
  const originalEnvironment = process.env.VERCEL_ENV;
  try {
    process.env.DATABASE_URL = "postgresql://synthetic:synthetic@ep-test.us-east-1.aws.neon.tech/test?sslmode=require";
    process.env.VERCEL_ENV = "production";
    assert.equal(progressDatabaseConfigured(), true);
    process.env.VERCEL_ENV = "preview";
    assert.equal(progressDatabaseConfigured(), false);
    process.env.VERCEL_ENV = "production";
    for (const invalid of ["", "postgresql://synthetic:synthetic@evil.example/test", "postgresql://synthetic:synthetic@ep-test.neon.tech/test?sslmode=disable"]) {
      process.env.DATABASE_URL = invalid;
      assert.equal(progressDatabaseConfigured(), false);
      assert.throws(() => createProgressStore());
    }
  } finally {
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    if (originalEnvironment === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalEnvironment;
  }
});

test("Neon queries keep ownership and progress in parameters and use atomic revisions", async () => {
  const originalUrl = process.env.DATABASE_URL;
  const originalEnvironment = process.env.VERCEL_ENV;
  const originalFetch = neonConfig.fetchFunction;
  const calls: { query: string; params: string[] }[] = [];
  const progress = emptyProgress();
  const account = "a".repeat(64);
  try {
    process.env.DATABASE_URL = "postgresql://synthetic:synthetic@ep-test.us-east-1.aws.neon.tech/test?sslmode=require";
    process.env.VERCEL_ENV = "production";
    neonConfig.fetchFunction = async (_input: unknown, options?: RequestInit) => {
      const body = JSON.parse(String(options?.body)) as { query: string; params: string[] };
      calls.push(body);
      return new Response(JSON.stringify({ fields: [{ name: "revision", dataTypeID: 23 }, { name: "progress", dataTypeID: 3802 }], rows: [["1", JSON.stringify(progress)]], rowCount: 1, command: "SELECT" }), { status: 200 });
    };
    const store = createProgressStore();
    assert.equal((await store.read(account)).revision, 1);
    assert.equal((await store.write(account, 0, progress))?.revision, 1);
    assert.equal((await store.write(account, 1, progress))?.revision, 1);
    assert.equal(calls.length, 3);
    for (const call of calls) {
      assert.ok(call.params.includes(account));
      assert.ok(!call.query.includes(account));
      assert.match(call.query, /\$1/);
    }
    assert.match(calls[1]?.query ?? "", /ON CONFLICT \(account_key\) DO NOTHING/);
    assert.match(calls[2]?.query ?? "", /WHERE account_key = \$\d+ AND revision = \$\d+/);
    assert.ok(calls[2]?.params.includes("1"));
  } finally {
    neonConfig.fetchFunction = originalFetch;
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
    if (originalEnvironment === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalEnvironment;
  }
});