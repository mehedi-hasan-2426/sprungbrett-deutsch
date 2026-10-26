import { test } from "node:test";
import assert from "node:assert/strict";
import { compareOne, gradeItem, step, START } from "../src/lib/grade.ts";
import type { Item } from "../src/lib/types.ts";

const item = (over: Partial<Item>): Item => ({
  id: "t-1", n: 1, group: "G1", prompt: "", kind: "text", blanks: 1, capStart: false,
  answers: [["fährt"]], display: "fährt", tag: "VF", hint: "", rule: "", ...over,
});

test("exact and whitespace-insensitive answers pass", () => {
  assert.equal(compareOne("  fährt ", "fährt").ok, true);
  assert.equal(compareOne("Ich stehe um 7 Uhr auf", "Ich stehe um 7 Uhr auf.").ok, true);
});

test("ae/oe/ue/ss are accepted with an umlaut note", () => {
  const v = compareOne("faehrt", "fährt");
  assert.equal(v.ok, true);
  assert.deepEqual(v.notes, ["umlaut"]);
  assert.equal(compareOne("Strasse", "Straße").ok, true);
});

test("lowercase noun is an error unless the blank starts a sentence", () => {
  const mid = compareOne("bett", "Bett", false);
  assert.equal(mid.ok, false);
  assert.equal(mid.spellingOnly, true);
  assert.equal(compareOne("kannst", "Kannst", true).ok, true);
  assert.equal(compareOne("ich KAUFE ein", "ich kaufe ein").ok, false);
});

test("missing comma is accepted with a note", () => {
  const v = compareOne("Ich komme zu spät weil der Bus Verspätung hat", "Ich komme zu spät, weil der Bus Verspätung hat.");
  assert.equal(v.ok, true);
  assert.ok(v.notes.includes("comma"));
});

test("wrong word is wrong", () => {
  assert.equal(compareOne("fahrt", "fährt").ok, false);
  assert.equal(compareOne("", "fährt").ok, false);
});

test("multi-blank answers are graded per blank", () => {
  const it = item({ blanks: 2, answers: [["Siehst", "fern"]], capStart: true });
  assert.equal(gradeItem(it, ["siehst", "fern"]).ok, true);
  assert.equal(gradeItem(it, ["Siehst", "an"]).ok, false);
});

test("any listed alternative is accepted", () => {
  const it = item({ blanks: 0, capStart: true, answers: [["Wo wohnst du?"], ["Wo wohnen Sie?"]] });
  assert.equal(gradeItem(it, ["Wo wohnen Sie"]).ok, true);
});

test("choice items compare the option key", () => {
  const it = item({ kind: "choice", correct: "b", answers: [] });
  assert.equal(gradeItem(it, ["b"]).ok, true);
  assert.equal(gradeItem(it, ["a"]).ok, false);
});

test("feedback flow: hint after first miss, solution after second", () => {
  const s1 = step(START, false);
  assert.equal(s1.status, "hint");
  const s2 = step(s1, false);
  assert.equal(s2.status, "revealed");
  assert.equal(s2.firstTry, false);
  assert.deepEqual(step(s2, true), s2);
  const ok = step(START, true);
  assert.equal(ok.status, "solved");
  assert.equal(ok.firstTry, true);
});
