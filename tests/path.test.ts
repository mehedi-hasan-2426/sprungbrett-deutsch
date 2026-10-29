import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseLevel } from "../src/lib/levels.ts";
import { STAGES, stageOf, weekTitle } from "../src/lib/weeks.ts";
import type { Course } from "../src/lib/types.ts";

const course = JSON.parse(readFileSync(new URL("../content/generated/course.json", import.meta.url), "utf8")) as Course;

test("stages cover every topic once, in order, each ending with its own checkpoint", () => {
  const topics = STAGES.flatMap((s) => [...s.topics]);
  assert.deepEqual(topics, course.weeks.map((_, k) => k + 1));
  assert.deepEqual(STAGES.map((s) => s.checkpoint), [1, 2, 3]);
  for (const cp of course.checkpoints) assert.equal(stageOf(cp.week)?.checkpoint, cp.n, `checkpoint ${cp.n} follows topic ${cp.week}`);
});

test("topic titles no longer contain checkpoint labels", () => {
  for (const unit of course.weeks) {
    assert.doesNotMatch(unit.title, /Checkpoint/, unit.title);
    assert.ok(weekTitle(unit.title).german.trim(), unit.title);
  }
});

test("level preference accepts only known values", () => {
  assert.equal(parseLevel("A1"), "A1");
  assert.equal(parseLevel("A2"), "A2");
  for (const value of [null, undefined, "", "a1", "B1", "<script>"]) assert.equal(parseLevel(value), "A2");
});
