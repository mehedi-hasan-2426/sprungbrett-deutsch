import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyProgress } from "../src/lib/progress.ts";
import { parseSnapshot, ProgressSync, sameProgress, syncDecision } from "../src/lib/progress-sync.ts";
import type { ProgressSnapshot, SyncStatus } from "../src/lib/progress-sync.ts";

test("cloud progress snapshots validate revision, schema and payload", () => {
  assert.deepEqual(parseSnapshot({ revision: 0, progress: null }), { revision: 0, progress: null });
  assert.equal(parseSnapshot({ revision: 1, progress: emptyProgress() }).revision, 1);
  for (const invalid of [null, [], {}, { revision: -1, progress: null }, { revision: 1.5, progress: null }, { revision: 0, progress: {} }, { revision: 1, progress: null }, { revision: 1, progress: { version: 999 } }]) {
    assert.throws(() => parseSnapshot(invalid));
  }
});

test("a new device adopts cloud progress and an existing browser seeds an empty cloud", () => {
  const local = emptyProgress();
  const learned = { ...local, days: ["2026-10-27"] };
  assert.equal(syncDecision(local, null, { revision: 2, progress: learned }), "adopt");
  assert.equal(syncDecision(learned, null, { revision: 0, progress: null }), "upload");
  assert.equal(syncDecision(learned, null, { revision: 2, progress: learned }), "adopt");
});

test("only an unchanged cloud base permits automatic upload", () => {
  const original = emptyProgress();
  const local = { ...original, days: ["2026-10-27"] };
  const other = { ...original, days: ["2026-10-26"] };
  const base = { revision: 1, progress: original };
  assert.equal(syncDecision(local, base, base), "upload");
  assert.equal(syncDecision(original, base, { revision: 2, progress: other }), "adopt");
  assert.equal(syncDecision(local, base, { revision: 2, progress: other }), "conflict");
  assert.equal(syncDecision(local, null, { revision: 2, progress: other }), "conflict");
  assert.equal(syncDecision(local, base, { revision: 0, progress: null }), "conflict");
});

test("JSONB key ordering does not manufacture conflicts", () => {
  const progress = emptyProgress();
  const reordered = Object.fromEntries(Object.entries(progress).reverse()) as typeof progress;
  assert.equal(sameProgress(progress, reordered), true);
  assert.equal(syncDecision(progress, null, { revision: 1, progress: reordered }), "adopt");
});

function controllerFixture() {
  let local = emptyProgress();
  let cloud: ProgressSnapshot = { revision: 0, progress: null };
  let status: SyncStatus = "loading";
  let unavailable = false;
  let duringWrite: (() => void) | null = null;
  const controller = new ProgressSync({
    local: () => local,
    base: null,
    adopt: (value) => { local = value; },
    acknowledge: () => {},
    status: (value) => { status = value; },
    transport: {
      async read() {
        if (unavailable) throw new Error("offline");
        return cloud;
      },
      async write(revision, progress) {
        duringWrite?.();
        if (unavailable) throw new Error("offline");
        if (revision !== cloud.revision) return { saved: false, snapshot: cloud };
        cloud = { revision: revision + 1, progress };
        return { saved: true, snapshot: cloud };
      },
    },
  });
  return {
    controller, local: () => local, cloud: () => cloud, status: () => status,
    edit: (days: string[]) => { local = { ...local, days }; },
    external: () => { cloud = { revision: cloud.revision + 1, progress: { ...emptyProgress(), days: ["2026-10-25"] } }; },
    offline: (value: boolean) => { unavailable = value; },
    duringWrite: (callback: (() => void) | null) => { duringWrite = callback; },
  };
}

test("edits made during an in-flight save are queued rather than discarded", async () => {
  const fixture = controllerFixture();
  fixture.edit(["2026-10-26"]);
  fixture.duringWrite(() => { fixture.duringWrite(null); fixture.edit(["2026-10-26", "2026-10-27"]); });
  assert.equal(await fixture.controller.sync(), true);
  assert.deepEqual(fixture.cloud().progress, fixture.local());
  assert.equal(fixture.cloud().revision, 2);
  assert.equal(fixture.status(), "saved");
});

test("offline edits remain local and retry safely", async () => {
  const fixture = controllerFixture();
  await fixture.controller.sync();
  fixture.edit(["2026-10-27"]);
  fixture.offline(true);
  assert.equal(await fixture.controller.sync(), false);
  assert.equal(fixture.status(), "offline");
  assert.deepEqual(fixture.local().days, ["2026-10-27"]);
  fixture.offline(false);
  assert.equal(await fixture.controller.sync(), true);
  assert.deepEqual(fixture.cloud().progress, fixture.local());
});

test("conflicts require a choice and a new competing save cannot be overwritten by an old choice", async () => {
  const fixture = controllerFixture();
  await fixture.controller.sync();
  fixture.edit(["2026-10-27"]);
  fixture.external();
  assert.equal(await fixture.controller.sync(), false);
  assert.equal(fixture.status(), "conflict");
  assert.deepEqual(fixture.local().days, ["2026-10-27"]);
  fixture.external();
  assert.equal(await fixture.controller.resolve("local"), false);
  assert.equal(fixture.status(), "conflict");
  assert.equal(await fixture.controller.resolve("cloud"), true);
  assert.deepEqual(fixture.local(), fixture.cloud().progress);
});

test("closed controllers never apply a late response to another account", async () => {
  const fixture = controllerFixture();
  fixture.external();
  const pending = fixture.controller.sync();
  fixture.controller.close();
  assert.equal(await pending, false);
  assert.deepEqual(fixture.local(), emptyProgress());
});