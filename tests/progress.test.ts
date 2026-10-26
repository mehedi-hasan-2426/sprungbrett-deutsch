import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyProgress, groupScore, itemState, load, parseImport, recordAnswer, save, streak, MAX_IMPORT_BYTES } from "../src/lib/progress.ts";
import { gradeItem, step } from "../src/lib/grade.ts";
import type { Item } from "../src/lib/types.ts";

test("round trip export and import", () => {
  const p = emptyProgress();
  p.cards["w1-auf-stehen"] = { box: 2, due: "2026-10-29" };
  p.writing["w1-wr-1"] = { text: "Liebe Eva, …", score: [2, 1, 2, 2], at: 1 };
  assert.deepEqual(parseImport(JSON.stringify(p)), p);
});

test("placement writing scores preserve all progress after reload", () => {
  const progress = emptyProgress();
  progress.writing["p-wr-1"] = { text: "Liebe Frau Klein,", score: [4, 3, 4], at: 1 };
  progress.cards["w1-auf-stehen"] = { box: 2, due: "2026-10-29" };
  const store = new Map<string, string>();
  const storage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => void store.set(key, value) };
  assert.ok(save(storage, progress));
  assert.deepEqual(load(storage), progress);
  assert.deepEqual(parseImport(JSON.stringify(progress)), progress);
});

test("weekly writing scores still reject marks outside their rubric", () => {
  const progress = emptyProgress();
  progress.writing["w1-wr-1"] = { text: "Liebe Eva,", score: [4, 3, 4, 4], at: 1 };
  assert.throws(() => parseImport(JSON.stringify(progress)));
});

test("hostile or broken imports are rejected", () => {
  const bad = [
    "not json",
    "[]",
    JSON.stringify({ ...emptyProgress(), version: 2 }),
    JSON.stringify({ ...emptyProgress(), items: { "../x": { status: "solved", attempts: 1, firstTry: true, at: 1 } } }),
    '{"version":1,"items":{"__proto__":{"status":"solved","attempts":1,"firstTry":true,"at":1}},"cards":{},"newCards":{"day":"","count":0},"writing":{},"speaking":{},"canDo":{},"mistakes":[],"days":[],"settings":{"english":true}}',
    JSON.stringify({ ...emptyProgress(), cards: { a: { box: 9, due: "2026-01-01" } } }),
    JSON.stringify({ ...emptyProgress(), writing: { a: { text: "x".repeat(6000), score: [], at: 1 } } }),
    JSON.stringify({ ...emptyProgress(), mistakes: [{ tag: "XX", at: 1 }] }),
    JSON.stringify({ ...emptyProgress(), settings: { english: "yes" } }),
    "x".repeat(MAX_IMPORT_BYTES + 1),
  ];
  for (const text of bad) assert.throws(() => parseImport(text), Error, text.slice(0, 60));
  assert.equal(({} as Record<string, unknown>).status, undefined);
});

test("load falls back to empty progress on corrupt storage", () => {
  assert.deepEqual(load({ getItem: () => "{broken" }), emptyProgress());
  assert.deepEqual(load(undefined), emptyProgress());
});

test("save reports a full or blocked storage instead of throwing", () => {
  const full = { setItem: () => { throw new Error("QuotaExceededError"); } };
  assert.equal(save(full, emptyProgress()), false);
});

test("streak counts consecutive days ending today or yesterday", () => {
  assert.equal(streak(["2026-10-24", "2026-10-25", "2026-10-26"], "2026-10-26", "2026-10-25"), 3);
  assert.equal(streak(["2026-10-24", "2026-10-25"], "2026-10-26", "2026-10-25"), 2);
  assert.equal(streak(["2026-10-20"], "2026-10-26", "2026-10-25"), 0);
});

test("full lesson flow: wrong, hint, wrong, solution, progress saved", () => {
  const item: Item = {
    id: "w3-g1-3", n: 3, group: "G1", prompt: "Ich gehe heute ___ Ärztin. (zu + die)", kind: "text", blanks: 1, capStart: false,
    answers: [["zur"]], display: "zur", tag: "KA", hint: "Dativ nach zu.", rule: "zu + der = zur",
  };
  const store = new Map<string, string>();
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  let p = load(storage);

  let state = itemState(p, item.id);
  let next = step(state, gradeItem(item, ["zu die"]).ok);
  assert.equal(next.status, "hint");
  p = recordAnswer(p, item.id, state, next, item.tag, 1000);
  assert.equal(p.mistakes.length, 1);

  state = next;
  next = step(state, gradeItem(item, ["zu der"]).ok);
  assert.equal(next.status, "revealed");
  p = recordAnswer(p, item.id, state, next, item.tag, 2000);
  assert.equal(p.mistakes.length, 1);
  assert.ok(save(storage, p));

  const reloaded = load(storage);
  assert.equal(reloaded.items[item.id]?.status, "revealed");
  assert.equal(reloaded.mistakes[0]?.tag, "KA");
  assert.deepEqual(groupScore(reloaded, [item.id, "w3-g1-4"]), { done: 1, correct: 0, total: 2 });
});
