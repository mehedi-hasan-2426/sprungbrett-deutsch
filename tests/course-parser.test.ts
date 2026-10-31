import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAnswer, parseAnswerKey, parseScripts } from "../src/lib/course-parser.ts";

test("parseAnswer splits slash alternatives and strips markdown", () => {
  assert.deepEqual(parseAnswer("**dem** / **einem**"), { alts: [["dem"], ["einem"]], display: "dem / einem" });
});

test("parseAnswer keeps auch/oder alternatives and drops other notes", () => {
  const { alts } = parseAnswer("gehe *(auch: laufe)* *(Präsens)*");
  assert.deepEqual(alts, [["gehe"], ["laufe"]]);
});

test("parseAnswer splits multi-gap answers on ellipsis", () => {
  assert.deepEqual(parseAnswer("stehe … auf").alts, [["stehe", "auf"]]);
});

test("parseAnswer returns no alternatives for empty input", () => {
  assert.deepEqual(parseAnswer("").alts, []);
});

test("parseAnswerKey groups numbered answers by label", () => {
  const key = parseAnswerKey(["**G1:** 1. bin · 2. bist", "**Quiz:**", "1. a · 2. c", "**Lesen:** 1. richtig"], "Woche 1");
  assert.equal(key.numbered.get("G")?.get(2), "bist");
  assert.equal(key.numbered.get("Quiz")?.get(2), "c");
  assert.equal(key.numbered.get("Lesen")?.get(1), "richtig");
});

test("parseAnswerKey collects writing models and notes", () => {
  const key = parseAnswerKey(["**Schreiben (Modell):**", "> Hallo Anna,", "> bis bald!", "**Tipp:** langsam lesen", "- noch ein Hinweis"], "Woche 2");
  assert.deepEqual(key.models, [{ label: "Schreiben (Modell)", text: "Hallo Anna,\nbis bald!" }]);
  assert.deepEqual(key.notes, ["**Tipp:** langsam lesen", "- noch ein Hinweis"]);
});

test("parseAnswerKey keeps ordered vocab and pronunciation keys", () => {
  const key = parseAnswerKey(["**V1 Beispiel:** der Tisch", "**Aussprache A2:** ü"], "Woche 3");
  assert.equal(key.ordered.get("V1"), "@der Tisch");
  assert.equal(key.ordered.get("A2"), "ü");
});

test("parseAnswerKey ignores blank lines and rules", () => {
  const key = parseAnswerKey(["", "---", "   "], "Woche 4");
  assert.equal(key.numbered.size, 0);
  assert.equal(key.models.length, 0);
});

test("parseScripts reads speakers and part titles per week", () => {
  const md = "## Woche 1\n\n**Dialog 1**\n*Im Café*\n> A: Hallo!\n> B: **Guten** Tag.\n> Erzähler\n\n## Einstufung\n\n> A: Wie heißt du?\n";
  const scripts = parseScripts(md);
  assert.deepEqual(scripts.get("w1"), [{ title: "Dialog 1 · Im Café", lines: [{ speaker: "A", text: "Hallo!" }, { speaker: "B", text: "**Guten** Tag." }, { speaker: "", text: "Erzähler" }] }]);
  assert.equal(scripts.get("p")?.[0]?.lines[0]?.text, "Wie heißt du?");
});

test("parseScripts skips sections without lines", () => {
  assert.deepEqual(parseScripts("## Woche 2\n\n**Leer**\n").get("w2"), []);
});
