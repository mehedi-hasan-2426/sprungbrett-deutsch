import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Course } from "../src/lib/types.ts";
import { makeSelfPaced, topicText } from "../src/content/self-paced.ts";

test("self-paced labels replace scheduling without changing learning identities", () => {
  const course = JSON.parse(readFileSync(new URL("../content/generated/course.json", import.meta.url), "utf8")) as Course;
  const original = structuredClone(course);
  makeSelfPaced(course);
  for (const [index, unit] of course.weeks.entries()) {
    assert.match(unit.title, /^Topic \d+:/);
    assert.equal(unit.id, original.weeks[index]?.id);
    assert.deepEqual(Object.keys(unit.items), Object.keys(original.weeks[index]?.items ?? {}));
    assert.deepEqual(unit.writing, original.weeks[index]?.writing);
    assert.ok(!unit.intro.some((block) => block.kind === "p" && /^Time:/.test(block.text.map((segment) => segment.t).join(""))));
    assert.ok(!unit.intro.some((block) => block.kind === "table" && /^(Day|Week)$/.test(block.header[0]?.map((segment) => segment.t).join("") ?? "")));
  }
  assert.deepEqual(course.vocab, original.vocab);
  const plan = course.docs.find((doc) => doc.slug === "plan");
  assert.ok(plan);
  assert.doesNotMatch(JSON.stringify(plan), /12.week|\bweeks?\b/i);
  assert.equal(topicText("Wie sieht deine Woche aus?"), "Wie sieht deine Woche aus?");
});