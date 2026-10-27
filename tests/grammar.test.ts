import { test } from "node:test";
import assert from "node:assert/strict";
import { createGrammarTopics } from "../src/content/grammar.ts";
import { gradeItem } from "../src/lib/grade.ts";
import { emptyProgress, parseImport, recordAnswer } from "../src/lib/progress.ts";
import { step } from "../src/lib/grade.ts";

const topics = createGrammarTopics();

test("grammar catalogue has all requested topics and original graded practice", () => {
  assert.equal(topics.length, 28);
  assert.equal(topics.reduce((sum, topic) => sum + topic.items.length, 0), 252);
  const ids = topics.flatMap((topic) => topic.items.map((item) => item.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => /^[a-z0-9-]{1,64}$/.test(id)));
  for (const topic of topics) {
    for (const level of ["easy", "medium", "hard"]) assert.equal(topic.items.filter((item) => item.difficulty === level).length, 3);
    assert.ok(topic.rule.length > 50);
    if (topic.group === "Passive voice" || topic.slug === "verbs/lassen") assert.equal(topic.level, "Extension");
  }
});

test("all grammar answer keys grade correctly and choices have one model option", () => {
  for (const topic of topics) {
    for (const item of topic.items) {
      if (item.kind === "choice") {
        const answer = item.options?.find((option) => option.key === item.correct);
        assert.equal(answer?.label, item.display, item.id);
        assert.ok(gradeItem(item, [item.correct ?? ""]).ok, item.id);
      } else {
        assert.ok(gradeItem(item, item.answers[0] ?? []).ok, `${item.id} rejects ${item.display}`);
      }
    }
  }
});

test("source links match the 25 requested grammar subjects without shipping book assets", () => {
  const linked = topics.filter((topic) => topic.source !== null);
  assert.equal(linked.length, 25);
  assert.ok(linked.every((topic) => topic.source === `https://studygerman.io/exercises/grammar/${topic.slug}`));
  assert.ok(topics.some((topic) => topic.slug === "cases/dative-pronouns"));
  assert.ok(topics.some((topic) => topic.slug === "sentence-structure/dass-das"));
  assert.ok(topics.some((topic) => topic.slug === "conjunctions/als-wenn-wann"));
});

test("grammar completion uses the existing import and account-sync progress schema", () => {
  const item = topics[0]?.items[0];
  assert.ok(item);
  const initial = { status: "new" as const, attempts: 0, firstTry: null };
  const next = step(initial, true);
  const progress = recordAnswer(emptyProgress(), item.id, initial, next, item.tag, 1, [item.correct ?? ""]);
  const restored = parseImport(JSON.stringify(progress));
  assert.equal(restored.items[item.id]?.status, "solved");
  assert.deepEqual(restored.items[item.id]?.inputs, [item.correct]);
});