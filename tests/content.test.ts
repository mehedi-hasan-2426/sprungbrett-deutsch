import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Course, Item } from "../src/lib/types.ts";
import { gradeItem } from "../src/lib/grade.ts";
import { weekSummaries } from "../src/server/load.ts";

const course = JSON.parse(readFileSync(new URL("../content/generated/course.json", import.meta.url), "utf8")) as Course;
const REQUIRED = ["vocab", "grammar", "exercises", "retrieval", "reading", "listening", "speaking", "pronunciation", "writing", "quiz"];

test("every week covers all skills", () => {
  assert.equal(course.weeks.length, 12);
  for (const week of course.weeks) {
    const roles = new Set(week.sections.map((s) => s.role));
    for (const role of REQUIRED) assert.ok(roles.has(role as never), `${week.id} missing ${role}`);
    assert.ok(week.script.length > 0, week.id + " has no listening script");
    assert.ok(week.writing.every((w) => w.model.length > 0), week.id + " writing without model");
  }
});

test("every exercise has a usable solution", () => {
  for (const unit of [course.placement, ...course.weeks]) {
    for (const item of Object.values(unit.items) as Item[]) {
      if (item.kind === "choice") assert.ok(item.options?.some((o) => o.key === item.correct), item.id);
      if (item.kind === "open") assert.ok(item.display.length > 0, item.id);
      if (item.kind === "text") assert.ok(item.answers.length > 0, item.id);
    }
  }
});

test("free completions use self-assessment instead of exact-answer grading", () => {
  const week = course.weeks[8];
  assert.equal(week?.items["w9-g2-9"]?.kind, "open");
  assert.ok(week?.items["w9-g2-9"]?.display);
  assert.equal(week?.items["w9-g2-6"]?.kind, "text");
});

test("embedded instructions are English without translating German practice sentences", () => {
  assert.equal(course.weeks[0]?.items["w1-quiz-2"]?.prompt, "Write the number: 47 → ___");
  assert.ok(course.weeks[1]?.items["w2-quiz-2"]?.prompt.startsWith("Put in order:"));
  assert.ok(course.weeks[8]?.items["w9-g2-9"]?.prompt.startsWith("Complete freely:"));
  assert.equal(course.weeks[0]?.items["w1-g1-1"]?.prompt, "Er ___ jeden Tag mit dem Fahrrad. (fahren)");
  for (const unit of [course.placement, ...course.weeks]) {
    const reading = new Set(unit.sections.filter((s) => s.role === "reading").flatMap((s) => s.blocks.flatMap((b) => b.kind === "item" ? [b.itemId] : [])));
    for (const item of Object.values(unit.items)) {
      if (reading.has(item.id)) continue;
      assert.doesNotMatch(item.prompt, /^(?:Schreib|Ordne|Ergänze|Bilde|Benutze|Gegenteil|Höflich|Antwort)\b/, item.id);
    }
  }
});

test("reading and writing retain German exam instructions and stable IDs", () => {
  const source = JSON.parse(readFileSync(new URL("../content/generated/course.source.json", import.meta.url), "utf8")) as Course;
  for (const original of [source.placement, ...source.weeks]) {
    const translated = [course.placement, ...course.weeks].find((u) => u.id === original.id);
    assert.ok(translated);
    assert.deepEqual(translated.writing, original.writing);
    for (const section of original.sections.filter((s) => s.role === "reading" || s.role === "writing")) {
      assert.deepEqual(translated.sections.find((s) => s.id === section.id)?.blocks.slice(0, section.blocks.length), section.blocks);
      for (const block of section.blocks) {
        if (block.kind === "item") assert.equal(translated.items[block.itemId]?.prompt, original.items[block.itemId]?.prompt);
      }
    }
  }
});

test("every vocabulary entry has an English meaning, forms and a bilingual example", () => {
  assert.equal(course.vocab.length, 366);
  assert.equal(new Set(course.vocab.map((entry) => entry.id)).size, course.vocab.length);
  for (const entry of course.vocab) {
    assert.ok(entry.meaning?.trim(), entry.id);
    assert.ok(entry.forms.trim(), entry.id);
    assert.ok(entry.example.trim(), entry.id);
    assert.ok(entry.exampleEn?.trim(), entry.id);
  }
});

test("extra practice and listening never alter core checkpoint scoring", () => {
  for (const week of weekSummaries(course)) {
    assert.equal(week.ids.listening, undefined);
    const core = Object.values(week.ids).flat();
    assert.ok(core.every((id) => !id.includes("-plus-") && !id.includes("-r-")));
    for (const level of ["easy", "medium", "hard"]) {
      const practice = week.practice?.[level] ?? [];
      assert.equal(practice.filter((id) => id.includes("-plus-")).length, 3);
      assert.ok(practice.every((id) => !core.includes(id)));
    }
  }
});

test("recognition exercises place the actual English meaning at their answer key", () => {
  for (const unit of course.weeks) {
    for (const item of Object.values(unit.items).filter((entry) => entry.difficulty === "easy")) {
      assert.equal(item.options?.find((option) => option.key === item.correct)?.label, item.display, item.id);
    }
  }
});

test("every week adds ten words and three exercises per difficulty without changing core IDs", () => {
  const source = JSON.parse(readFileSync(new URL("../content/generated/course.source.json", import.meta.url), "utf8")) as Course;
  for (const unit of course.weeks) {
    const original = source.weeks.find((week) => week.id === unit.id);
    assert.ok(original);
    assert.equal(Object.keys(unit.items).length, Object.keys(original.items).length + 9 + 30);
    assert.equal(course.vocab.filter((entry) => entry.id.startsWith(`${unit.id}-plus-word-`)).length, 10);
    for (const difficulty of ["easy", "medium", "hard"]) {
      assert.equal(Object.values(unit.items).filter((item) => item.difficulty === difficulty && item.id.includes("-plus-")).length, 3);
    }
    for (const id of Object.keys(original.items)) assert.ok(unit.items[id], id);
    const terms = course.vocab.filter((entry) => entry.week === Number(unit.id.slice(1))).map((entry) => entry.term);
    assert.equal(new Set(terms).size, terms.length, unit.id);
  }
});

test("every auto-graded exercise accepts its own answer key", () => {
  for (const unit of [course.placement, ...course.weeks]) {
    for (const item of Object.values(unit.items) as Item[]) {
      if (item.kind !== "text") continue;
      const first = item.answers[0] ?? [];
      const inputs = item.blanks > 1 ? first : [first.join(" ")];
      assert.ok(gradeItem(item, inputs).ok, `${item.id} rejects its own answer: ${JSON.stringify(first)}`);
    }
  }
});

test("exercise numbering is contiguous within each numbered group", () => {
  for (const unit of [course.placement, ...course.weeks]) {
    const byGroup = new Map<string, number[]>();
    for (const item of Object.values(unit.items) as Item[]) {
      const key = /^[GD]\d/.test(item.group) ? "G" : item.group;
      byGroup.set(key, [...(byGroup.get(key) ?? []), item.n]);
    }
    for (const [group, numbers] of byGroup) {
      const sorted = [...numbers].sort((a, b) => a - b);
      sorted.forEach((n, k) => assert.equal(n, (sorted[0] ?? 1) + k, `${unit.id} ${group} numbering gap at ${n}`));
    }
  }
});

test("published content contains no learner name", () => {
  assert.equal(/tisha/i.test(JSON.stringify(course)), false);
});
