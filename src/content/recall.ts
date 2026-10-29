import type { Block, Course, Item, Unit, VocabEntry } from "../lib/types.ts";

const KEYS = ["a", "b", "c"] as const;
const VAGUE = /^(Read the task again carefully\.?|Look for key words\.?)$/i;

const plain = (term: string) => term.replace(/·/g, "");
const usable = (v: VocabEntry) => Boolean(v.meaning) && !/[/(↔→+]/.test(v.term) && v.term.split(" ").length <= 3;
const heading = (text: string): Block => ({ kind: "h", text: [{ t: text }] });
const para = (text: string): Block => ({ kind: "p", text: [{ t: text }] });

function rotate<T>(list: T[], start: number, count: number): T[] {
  if (!list.length) return [];
  return Array.from({ length: Math.min(count, list.length) }, (_, k) => list[(start + k) % list.length] as T);
}

function describe(items: Item[]): { title: string; text: string } | null {
  const text = items.filter((i) => i.kind === "text");
  if (!items.length) return null;
  if (text.length && text.every((i) => i.prompt.includes("→") && /^die /.test(i.answers[0]?.[0] ?? ""))) {
    return { title: "Plural forms", text: "Write the plural with the article die. Example: der Tisch → die Tische." };
  }
  if (text.length && text.every((i) => /^(der|die|das) /.test(i.answers[0]?.[0] ?? ""))) {
    return { title: "Find the noun", text: "Read the German description. Write the matching noun with der, die or das." };
  }
  if (text.length && text.every((i) => i.blanks === 1 && /^[a-zäöüß]+n$/.test(i.answers[0]?.[0] ?? ""))) {
    return { title: "Which verb fits?", text: "Complete each phrase with the matching verb in the infinitive (the dictionary form)." };
  }
  if (items.every((i) => i.kind === "open")) {
    return { title: "Your own answer", text: "Write your own answer. Several answers can be right; compare yours with the example answer." };
  }
  return { title: "Complete the phrases", text: "Fill in the gaps with words from this topic's vocabulary list." };
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wholeWord = (word: string) => new RegExp(`(?<![\\p{L}])${escape(word)}(?![\\p{L}])`, "u");
const unumlaut = (s: string) => s.replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/Ä/g, "A").replace(/Ö/g, "O").replace(/Ü/g, "U");

export function pluralHint(noun: string, plural: string): string {
  const umlaut = unumlaut(plural) !== plural && unumlaut(noun) === noun;
  const base = unumlaut(plural);
  const ending = base.startsWith(noun) ? base.slice(noun.length) : "";
  if (umlaut && ending) return `Add an umlaut (ä, ö, ü) and -${ending}.`;
  if (umlaut) return "Only the vowel changes: add an umlaut (ä, ö, ü).";
  if (ending) return `Add -${ending}.`;
  return "The plural looks the same as the singular; only the article changes to die.";
}

function betterHint(item: Item): string {
  const answer = item.answers[0]?.join(" … ") ?? "";
  if (!answer) return "Use a word from this topic's vocabulary list. Other fitting answers are possible.";
  const word = answer.replace(/^(der|die|das) /, "");
  const singular = item.prompt.split("→")[0]?.replace(/^(der|die|das) /, "").replace(/\(.*\)/, "").trim() ?? "";
  if (/^die /.test(answer) && item.prompt.includes("→") && singular) return pluralHint(singular, word);
  if (/^(der|die|das) /.test(answer)) return `The noun starts with "${word.slice(0, 2)}…".`;
  return `The answer starts with "${answer.slice(0, 2)}…".`;
}

function clarifyExisting(unit: Unit, blocks: Block[]): Block[] {
  const out: Block[] = [];
  for (let k = 0; k < blocks.length; k++) {
    const block = blocks[k] as Block;
    if (block.kind === "h" && /^V\d+\b/.test(block.text.map((t) => t.t).join(""))) {
      const following: Item[] = [];
      for (let j = k + 1; j < blocks.length; j++) {
        const next = blocks[j] as Block;
        if (next.kind !== "item") break;
        const item = unit.items[next.itemId];
        if (item && !item.difficulty) following.push(item);
      }
      const label = describe(following);
      const own = block.text.map((t) => t.t).join("").replace(/^V\d+\.?\s*/, "").replace(/:$/, "").trim();
      if (label) {
        out.push(heading(own && !/^plural$/i.test(own) ? own : label.title), para(label.text));
        continue;
      }
    }
    if (block.kind === "item") {
      const item = unit.items[block.itemId];
      if (item && !item.difficulty) {
        item.prompt = item.prompt.replace(/^Welches Verb passt\?\s*/, "");
        item.answers = item.answers.filter((alt) => !alt.join(" ").startsWith("Welches Verb passt?"));
        if (VAGUE.test(item.hint)) item.hint = betterHint(item);
        if (VAGUE.test(item.rule)) item.rule = item.display ? `Answer: ${item.display}` : item.rule;
      }
    }
    out.push(block);
  }
  return out;
}

function choice(id: string, n: number, group: string, difficulty: Item["difficulty"], prompt: string, labels: string[], correct: number, tag: Item["tag"], hint: string, rule: string): Item {
  return {
    id, n, group, difficulty, prompt, kind: "choice", blanks: 0, capStart: false,
    options: labels.map((label, k) => ({ key: KEYS[k] as string, label })), correct: KEYS[correct],
    answers: [], display: labels[correct] ?? "", tag, hint, rule,
  };
}

function text(id: string, n: number, group: string, difficulty: Item["difficulty"], prompt: string, answers: string[][], tag: Item["tag"], hint: string, rule: string): Item {
  return { id, n, group, difficulty, prompt, kind: "text", blanks: 1, capStart: false, answers, display: answers[0]?.[0] ?? "", tag, hint, rule };
}

export function recallExercises(unitId: string, words: VocabEntry[]): { blocks: Block[]; items: Item[] } {
  const pool = words.filter(usable);
  const nouns = pool.filter((w) => w.article && w.noun);
  const plurals = nouns.filter((w) => w.plural && w.plural !== w.noun);
  const gaps = pool.map((w) => ({ w, target: [w.noun, w.plural, plain(w.term)].find((t) => t && t.length > 2 && wholeWord(t).test(w.example)) })).filter((g): g is { w: VocabEntry; target: string } => Boolean(g.target));
  const blocks: Block[] = [heading("More recall practice"), para("Thirty extra exercises with the words of this topic, from easy to hard. Capital letters and punctuation are not marked wrong.")];
  const items: Item[] = [];
  const add = (title: string, instruction: string, made: Item[]) => {
    if (!made.length) return;
    blocks.push(heading(title), para(instruction), ...made.map((i) => ({ kind: "item", itemId: i.id }) as Block));
    items.push(...made);
  };

  add("What does it mean?", "Choose the correct English meaning.", rotate(pool, 0, 6).map((w, k) => {
    const others = [...new Set(pool.map((o) => o.meaning ?? "").filter((m) => m && m !== w.meaning))];
    const wrong = rotate(others, k * 3 + 1, 2);
    const correct = k % 3;
    const labels = [...wrong];
    labels.splice(correct, 0, w.meaning ?? "");
    return choice(`${unitId}-r-meaning-${k + 1}`, k + 1, "R-meaning", "easy", `What does „${w.term}“ mean?`, labels, correct, "WS", `Look at it in a sentence: ${w.example}`, `${w.term}: ${w.meaning}`);
  }));

  add("der, die or das?", "Choose the correct article for each noun.", rotate(nouns, 3, 6).map((w, k) => {
    const labels = ["der", "die", "das"];
    return choice(`${unitId}-r-article-${k + 1}`, k + 1, "R-article", "easy", `___ ${w.noun} (${w.meaning})`, labels, labels.indexOf(w.article ?? "der"), "GE", `Think of the example: ${w.example}`, `${w.term}: ${w.meaning}`);
  }));

  add("From English to German", "Write the German word. For nouns, include der, die or das.", rotate(pool, 6, 8).map((w, k) => {
    const answer = plain(w.term);
    return text(`${unitId}-r-german-${k + 1}`, k + 1, "R-german", "medium", `${w.meaning}: ___`, [[answer]], w.article ? "GE" : "WS", `It starts with "${answer.replace(/^(der|die|das) /, "").slice(0, 2)}…".`, `${answer}: ${w.meaning}`);
  }));

  add("Write the plural", "Write the plural form with the article die.", rotate(plurals, 2, 5).map((w, k) =>
    text(`${unitId}-r-plural-${k + 1}`, k + 1, "R-plural", "medium", `${w.term} (${w.meaning}) → ___`, [[`die ${w.plural}`], [w.plural ?? ""]], "PL", pluralHint(w.noun ?? "", w.plural ?? ""), `${w.term} → die ${w.plural}`)));

  add("Complete the sentence", "Write the missing word. The English meaning is in brackets.", rotate(gaps, 4, 5).map(({ w, target }, k) =>
    text(`${unitId}-r-sentence-${k + 1}`, k + 1, "R-sentence", "hard", `${w.example.replace(wholeWord(target), "___")} (${w.meaning})`, [[target]], "WS", `The missing word starts with "${target.slice(0, 2)}…".`, `${w.example} (${w.exampleEn ?? w.meaning})`)));

  return { blocks, items };
}

export function addRecallPractice(course: Course): Course {
  for (const [index, unit] of course.weeks.entries()) {
    const retrieval = unit.sections.find((s) => s.role === "retrieval");
    if (!retrieval) throw new Error(`Missing recall section in ${unit.id}`);
    retrieval.blocks = clarifyExisting(unit, retrieval.blocks);
    const { blocks, items } = recallExercises(unit.id, course.vocab.filter((v) => v.week === index + 1));
    for (const item of items) {
      if (unit.items[item.id]) throw new Error(`Duplicate recall item ${item.id}`);
      unit.items[item.id] = item;
    }
    retrieval.blocks.push(...blocks);
  }
  return course;
}
