import { test } from "node:test";
import assert from "node:assert/strict";
import { claimLegacyProgress, emptyProgress, load, parseImport, progressStorageKey, save, STORAGE_KEY } from "../src/lib/progress.ts";

const first = "a".repeat(64);
const second = "b".repeat(64);
function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}

test("accounts never automatically load anonymous or another account's progress", () => {
  const storage = memoryStorage();
  const original = { ...emptyProgress(), days: ["2026-10-26"] };
  save(storage, original);
  assert.deepEqual(load(storage, progressStorageKey(first)), emptyProgress());
  save(storage, original, progressStorageKey(first));
  assert.deepEqual(load(storage, progressStorageKey(second)), emptyProgress());
  assert.deepEqual(load(storage, progressStorageKey(first)), original);
  assert.throws(() => progressStorageKey(""), /invalid account/);
});

test("explicit legacy migration validates, saves then removes the anonymous copy", () => {
  const storage = memoryStorage();
  const legacy = emptyProgress();
  legacy.items["w1-plus-hard-1"] = { status: "solved", attempts: 1, firstTry: true, at: 1, inputs: ["Meine Antwort."] };
  save(storage, legacy);
  assert.deepEqual(claimLegacyProgress(storage, first), legacy);
  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.deepEqual(load(storage, progressStorageKey(first)), legacy);
  assert.deepEqual(parseImport(JSON.stringify(legacy)), legacy);
});

test("failed migration and malformed imports preserve the original data", () => {
  const storage = memoryStorage();
  const original = JSON.stringify(emptyProgress());
  storage.setItem(STORAGE_KEY, original);
  const fullStorage = { ...storage, setItem() { throw new Error("full"); } };
  assert.throws(() => claimLegacyProgress(fullStorage, first), /could not be saved/);
  assert.equal(storage.getItem(STORAGE_KEY), original);
  storage.setItem(STORAGE_KEY, "invalid JSON");
  assert.throws(() => claimLegacyProgress(storage, first), /valid JSON/);
  assert.equal(storage.getItem(STORAGE_KEY), "invalid JSON");
  assert.equal(save(undefined, emptyProgress()), false);
});