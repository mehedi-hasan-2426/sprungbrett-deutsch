import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { KNOWLEDGE_DECKS } from "../src/content/knowledge.ts";
import { fromKnowledge, fromVocab, interleave, newCardOrder, TOPIC_DECK } from "../src/lib/flashcards.ts";
import { MAX_NEW_PER_DAY, newCardAllowance, newPerDay } from "../src/lib/leitner.ts";
import { emptyProgress, parseImport, validateProgress } from "../src/lib/progress.ts";
import type { VocabEntry } from "../src/lib/types.ts";

const vocab = (JSON.parse(readFileSync(new URL("../content/generated/course.json", import.meta.url), "utf8")) as { vocab: VocabEntry[] }).vocab;
const knowledge = fromKnowledge(KNOWLEDGE_DECKS);

test("knowledge decks are substantial and every card is complete", () => {
  assert.ok(KNOWLEDGE_DECKS.length >= 12);
  assert.ok(knowledge.length >= 200);
  for (const c of knowledge) {
    for (const field of ["front", "ask", "back", "example", "exampleEn", "label"] as const) assert.ok(c[field]?.trim(), `${c.id}.${field}`);
    if (c.frontLang === "de") assert.ok(c.meaning?.trim(), `${c.id}.meaning`);
  }
});

test("card ids are unique, valid progress keys and never collide with topic vocabulary", () => {
  const ids = [...vocab.map((v) => v.id), ...knowledge.map((c) => c.id)];
  assert.equal(new Set(ids).size, ids.length);
  for (const c of knowledge) assert.match(c.id, /^k-[a-z0-9-]{1,62}$/);
});

test("knowledge cards do not repeat topic vocabulary words", () => {
  const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)|\+.*$/g, "").replace(/[·\s]+/g, " ").trim();
  const topic = new Set(vocab.map((v) => norm(v.term)));
  const repeats = knowledge.filter((c) => c.frontLang === "de" && topic.has(norm(c.back)));
  assert.deepEqual(repeats.map((c) => c.id), []);
});

test("topic vocabulary keeps its existing ids so review history still applies", () => {
  const cards = vocab.map(fromVocab);
  assert.deepEqual(cards.map((c) => c.id), vocab.map((v) => v.id));
  assert.ok(cards.every((c) => c.deck === TOPIC_DECK && c.front.trim()));
});

test("mixed order alternates decks; a single deck keeps its own order", () => {
  assert.deepEqual(interleave<number | string>([[1, 2, 3], ["a"], [10, 20]]), [1, "a", 10, 2, 20, 3]);
  const all = [...vocab.map(fromVocab), ...knowledge];
  const firstDecks = new Set(newCardOrder(all, "all").slice(0, KNOWLEDGE_DECKS.length + 1).map((c) => c.deck));
  assert.equal(firstDecks.size, KNOWLEDGE_DECKS.length + 1);
  assert.ok(newCardOrder(all, "phrases").every((c) => c.deck === "phrases"));
});

test("daily new-card limit is configurable and still respects the review budget", () => {
  assert.equal(newPerDay({}), MAX_NEW_PER_DAY);
  assert.equal(newPerDay({ newPerDay: 20 }), 20);
  assert.equal(newPerDay({ newPerDay: 999 }), MAX_NEW_PER_DAY);
  assert.equal(newCardAllowance(10, 5, 20), 15);
  assert.equal(newCardAllowance(46, 0, 30), 0);
});

test("progress keeps the optional daily limit and still accepts older saves", () => {
  const legacy = emptyProgress();
  assert.deepEqual(validateProgress(legacy).settings, { english: true });
  const withLimit = { ...legacy, settings: { english: true, newPerDay: 15 } };
  assert.deepEqual(validateProgress(withLimit).settings, { english: true, newPerDay: 15 });
  for (const bad of [999, 0, "10", null]) {
    assert.throws(() => parseImport(JSON.stringify({ ...legacy, settings: { english: true, newPerDay: bad } })));
  }
});
