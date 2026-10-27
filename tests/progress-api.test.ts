import { test } from "node:test";
import assert from "node:assert/strict";
import type { NextApiRequest, NextApiResponse } from "next";
import { createProgressHandler } from "../src/server/progress-api.ts";
import type { ProgressSnapshot } from "../src/lib/progress-sync.ts";
import { emptyProgress } from "../src/lib/progress.ts";

const first = "a".repeat(64);
const second = "b".repeat(64);
const origin = "https://course.example.com";

function fixture() {
  const rows = new Map<string, ProgressSnapshot>();
  let account: string | null = first;
  let enabled = true;
  let unavailable = false;
  const handler = createProgressHandler({
    authorize: async () => account,
    configured: () => enabled,
    origin: () => origin,
    store: () => ({
      async read(key) {
        if (unavailable) throw new Error("synthetic database failure");
        return rows.get(key) ?? { revision: 0, progress: null };
      },
      async write(key, revision, progress) {
        if (unavailable) throw new Error("synthetic database failure");
        const current = rows.get(key) ?? { revision: 0, progress: null };
        if (current.revision !== revision) return null;
        const next = { revision: revision + 1, progress };
        rows.set(key, next);
        return next;
      },
    }),
  });
  const invoke = async (method = "GET", body?: unknown, headers: Record<string, string> = {}, query = {}) => {
    let status = 200;
    let payload: unknown;
    const returnedHeaders = new Map<string, string>();
    const response = {
      setHeader: (name: string, value: string) => { returnedHeaders.set(name, value); },
      status: (value: number) => { status = value; return response; },
      json: (value: unknown) => { payload = value; },
    };
    const request = { method, body, query, headers: { origin, "content-type": "application/json", "x-sprungbrett-sync": "1", ...headers } };
    await handler(request as unknown as NextApiRequest, response as unknown as NextApiResponse);
    return { status, payload, headers: returnedHeaders };
  };
  return { rows, invoke, setAccount: (key: string | null) => { account = key; }, disable: () => { enabled = false; }, fail: () => { unavailable = true; } };
}

test("cloud API derives ownership from the session and isolates both users", async () => {
  const api = fixture();
  const progress = { ...emptyProgress(), days: ["2026-10-27"] };
  assert.equal((await api.invoke("PUT", { revision: 0, progress })).status, 200);
  api.setAccount(second);
  assert.deepEqual((await api.invoke()).payload, { revision: 0, progress: null });
  assert.equal((await api.invoke("PUT", { revision: 0, progress: emptyProgress() })).status, 200);
  assert.equal(api.rows.size, 2);
  api.setAccount(first);
  const read = await api.invoke();
  assert.deepEqual(read.payload, { revision: 1, progress });
  assert.match(read.headers.get("Cache-Control") ?? "", /private.*no-store/);
  assert.equal((await api.invoke("PUT", { revision: 1, progress, accountKey: second })).status, 400);
  assert.equal((await api.invoke("GET", undefined, {}, { accountKey: second })).status, 400);
});

test("stale and competing initial saves conflict instead of overwriting", async () => {
  const api = fixture();
  const progress = emptyProgress();
  assert.equal((await api.invoke("PUT", { revision: 0, progress })).status, 200);
  assert.equal((await api.invoke("PUT", { revision: 0, progress })).status, 409);
  assert.equal((await api.invoke("PUT", { revision: 1, progress: { ...progress, days: ["2026-10-27"] } })).status, 200);
  assert.equal((await api.invoke("PUT", { revision: 1, progress })).status, 409);
  assert.equal(api.rows.get(first)?.revision, 2);
});

test("cloud API rejects anonymous, cross-site, malformed and unsupported requests", async () => {
  const api = fixture();
  const save = { revision: 0, progress: emptyProgress() };
  assert.equal((await api.invoke("PUT", save, { origin: "https://evil.example" })).status, 403);
  assert.equal((await api.invoke("PUT", save, { "x-sprungbrett-sync": "" })).status, 403);
  assert.equal((await api.invoke("GET", undefined, { "sec-fetch-site": "cross-site" })).status, 403);
  assert.equal((await api.invoke("POST", save)).status, 405);
  assert.equal((await api.invoke("PUT", save, { "content-type": "text/plain" })).status, 415);
  assert.equal((await api.invoke("PUT", { ...save, revision: -1 })).status, 400);
  assert.equal((await api.invoke("PUT", { revision: 0, progress: {} })).status, 400);
  api.setAccount(null);
  assert.equal((await api.invoke()).status, 401);
  assert.equal((await api.invoke("PUT", save)).status, 401);
  assert.equal(api.rows.size, 0);
});

test("unconfigured or unavailable storage fails closed without deleting data", async () => {
  const disabled = fixture();
  disabled.disable();
  assert.equal((await disabled.invoke()).status, 503);
  const failed = fixture();
  const progress = emptyProgress();
  await failed.invoke("PUT", { revision: 0, progress });
  failed.fail();
  assert.equal((await failed.invoke("PUT", { revision: 1, progress })).status, 503);
  assert.equal(failed.rows.get(first)?.revision, 1);
});