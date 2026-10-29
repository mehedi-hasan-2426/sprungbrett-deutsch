import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pluralHint } from "../src/content/recall.ts";
import { gradeItem } from "../src/lib/grade.ts";
import type { Course } from "../src/lib/types.ts";

const course = JSON.parse(readFileSync(new URL("../content/generated/course.json", import.meta.url), "utf8")) as Course;

test("every topic gets about thirty extra recall exercises with valid ids", () => {
  for (const unit of course.weeks) {
    const ids = Object.keys(unit.items).filter((id) => id.includes("-r-"));
    assert.equal(ids.length, 30, unit.id);
    for (const id of ids) assert.match(id, /^w\d+-r-[a-z]+-\d+$/);
    const retrieval = unit.sections.find((s) => s.role === "retrieval");
    const linked = new Set(retrieval?.blocks.flatMap((b) => (b.kind === "item" ? [b.itemId] : [])));
    for (const id of ids) assert.ok(linked.has(id), `${id} is not shown`);
  }
});

test("recall questions are answerable and never vague", () => {
  for (const unit of course.weeks) {
    const retrieval = unit.sections.find((s) => s.role === "retrieval");
    for (const block of retrieval?.blocks ?? []) {
      if (block.kind === "h") assert.doesNotMatch(block.text.map((t) => t.t).join(""), /^V\d+\.?$/);
      if (block.kind !== "item") continue;
      const item = unit.items[block.itemId];
      assert.ok(item, block.itemId);
      assert.doesNotMatch(item.hint, /^Read the task again carefully/, item.id);
      if (item.kind === "choice") {
        const labels = (item.options ?? []).map((o) => o.label);
        assert.equal(new Set(labels).size, labels.length, `${item.id} repeats an option`);
        assert.ok(labels.every((l) => l.trim()), `${item.id} has an empty option`);
        assert.ok(gradeItem(item, [item.correct ?? ""]).ok, item.id);
      }
      if (item.kind === "text") {
        assert.ok(item.prompt.includes("___"), `${item.id} has no gap`);
        assert.ok(gradeItem(item, item.answers[0] ?? []).ok, `${item.id} rejects its answer`);
      }
    }
  }
});

test("plural hints describe the change", () => {
  assert.equal(pluralHint("Apfel", "Äpfel"), "Only the vowel changes: add an umlaut (ä, ö, ü).");
  assert.equal(pluralHint("Wurst", "Würste"), "Add an umlaut (ä, ö, ü) and -e.");
  assert.equal(pluralHint("Flasche", "Flaschen"), "Add -n.");
  assert.equal(pluralHint("Brötchen", "Brötchen"), "The plural looks the same as the singular; only the article changes to die.");
});
