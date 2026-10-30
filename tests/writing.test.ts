import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Course } from "../src/lib/types.ts";
import { EXTRA_WRITING, isExtraWriting } from "../src/content/writing.ts";

const course = JSON.parse(readFileSync(new URL("../content/generated/course.json", import.meta.url), "utf8")) as Course;
const words = (text: string) => text.trim().split(/\s+/).length;

test("every topic has at least five writing tasks with unique, valid ids", () => {
  const ids = new Set<string>();
  for (const unit of course.weeks) {
    assert.ok(unit.writing.length >= 5, `${unit.id} has ${unit.writing.length} writing tasks`);
    for (const task of unit.writing) {
      assert.match(task.id, /^[a-z0-9-]+$/);
      assert.ok(!ids.has(task.id), task.id);
      ids.add(task.id);
      assert.ok(task.model.trim(), `${task.id} has no model text`);
    }
  }
});

test("extra model texts stay inside their word range; messages and e-mails open with a greeting", () => {
  for (const unit of course.weeks) {
    for (const task of unit.writing.filter((t) => isExtraWriting(t.id))) {
      const n = words(task.model);
      assert.ok(n >= task.min && n <= task.max, `${task.id}: ${n} words, expected ${task.min}-${task.max}`);
      if (task.max <= 40) assert.match(task.model, /^(Hallo|Hi|Liebe|Lieber|Sehr geehrte)/, task.id);
    }
  }
});

test("each topic gets two short messages, two e-mails and one free text", () => {
  for (let n = 1; n <= 12; n++) {
    const kinds = (EXTRA_WRITING[n] ?? []).map(([kind]) => kind).sort();
    assert.deepEqual(kinds, ["mail", "mail", "sms", "sms", "text"], `topic ${n}`);
  }
});
