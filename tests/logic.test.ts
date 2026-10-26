import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, dueCards, newCardAllowance, review, MAX_NEW_PER_DAY } from "../src/lib/leitner.ts";
import { advise, percent } from "../src/lib/checkpoint.ts";
import { guessTag, suggest } from "../src/lib/tags.ts";

test("correct answers move a card through 1, 3, 7, 14, 30 days", () => {
  const today = "2026-10-26";
  let card = review(undefined, true, today);
  assert.deepEqual(card, { box: 2, due: "2026-10-29" });
  card = review(card, true, today);
  assert.equal(card.due, "2026-11-02");
  card = review(card, true, today);
  assert.equal(card.due, "2026-11-09");
  card = review(card, true, today);
  assert.equal(card.box, 5);
  assert.equal(card.due, "2026-11-25");
  card = review(card, true, today);
  assert.equal(card.learned, true);
});

test("a wrong answer sends the card back to box 1 for tomorrow", () => {
  assert.deepEqual(review({ box: 4, due: "2026-10-26" }, false, "2026-10-26"), { box: 1, due: "2026-10-27" });
});

test("addDays crosses month and year boundaries", () => {
  assert.equal(addDays("2026-12-30", 3), "2027-01-02");
});

test("due cards exclude learned and future cards", () => {
  const due = dueCards({ a: { box: 1, due: "2026-10-25" }, b: { box: 2, due: "2026-10-30" }, c: { box: 5, due: "2026-10-01", learned: true } }, "2026-10-26");
  assert.deepEqual(due, ["a"]);
});

test("no new cards when reviews exceed 15 minutes", () => {
  assert.equal(newCardAllowance(46, 0), 0);
  assert.equal(newCardAllowance(10, 0), MAX_NEW_PER_DAY);
  assert.equal(newCardAllowance(10, 5), MAX_NEW_PER_DAY - 5);
  assert.equal(newCardAllowance(0, 50), 0);
});

test("checkpoint adjustment rules match the course", () => {
  assert.equal(advise([90, 85, 80]).advice, "all80");
  assert.equal(advise([90, 70, 80]).advice, "all60");
  assert.deepEqual(advise([90, 50, 80]), { advice: "one-below", below: [1] });
  assert.equal(advise([40, 50, 80]).advice, "multi-below");
  assert.equal(advise([90, null]).advice, "incomplete");
  assert.equal(advise([]).advice, "incomplete");
});

test("percent guards against bad input", () => {
  assert.equal(percent(3, 5), 60);
  assert.equal(percent(9, 5), 100);
  assert.equal(percent(1, 0), null);
  assert.equal(percent(Number.NaN, 5), null);
});

test("error tagging", () => {
  assert.equal(guessTag("Plural: die Nacht → ___", "die Nächte", "V2"), "PL");
  assert.equal(guessTag("Ich fahre mit ___ Straßenbahn.", "der", "Quiz"), "GE");
  assert.equal(guessTag("Er fährt ___ Arbeit. (zu + die)", "zur", "Quiz"), "KA");
  assert.equal(guessTag("Ordne: kann / heute / ich", "Ich kann heute nicht.", "Quiz"), "VP");
  assert.equal(guessTag("Wann ___ du ___? (aufstehen)", "stehst … auf", "Quiz"), "VF");
  assert.equal(guessTag("Wie viel?", "3", "Hören"), "HÖ");
});

test("suggestions need at least three recent mistakes in a category", () => {
  const now = Date.UTC(2026, 9, 26);
  const day = 24 * 3600 * 1000;
  const list = suggest(
    [
      { tag: "KA", at: now - day },
      { tag: "KA", at: now - 2 * day },
      { tag: "KA", at: now - 3 * day },
      { tag: "VP", at: now - day },
      { tag: "VP", at: now - 40 * day },
      { tag: "VP", at: now - 41 * day },
    ],
    now,
  );
  assert.deepEqual(list.map((s) => s.tag), ["KA"]);
});
