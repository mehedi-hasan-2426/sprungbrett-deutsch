import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCourse, validateCourse } from "../src/lib/course-parser.ts";
import { translateCourse } from "../src/lib/translate.ts";
import { EN } from "../src/content/en.ts";
import { enrichCoreVocabulary } from "../src/content/vocabulary.ts";
import { addWeeklyPractice } from "../src/content/enrichment.ts";
import { addRecallPractice } from "../src/content/recall.ts";
import { addWritingPractice } from "../src/content/writing.ts";
import { addGrammarPractice } from "../src/content/grammar.ts";
import { makeSelfPaced } from "../src/content/self-paced.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "content", "source");
const OUT = join(ROOT, "content", "generated", "course.json");
const read = (...p: string[]) => readFileSync(join(SRC, ...p), "utf8");

const { course, issues } = parseCourse({
  placement: read("02_Einstufungstest.md"),
  placementKey: read("Loesungen", "Loesungen_Einstufung.md"),
  weeks: Array.from({ length: 12 }, (_, i) => read("Wochen", `Woche_${String(i + 1).padStart(2, "0")}.md`)),
  weekKeys: ["Loesungen_Wochen_01-04.md", "Loesungen_Wochen_05-08.md", "Loesungen_Wochen_09-12.md"].map((f) => read("Loesungen", f)),
  scripts: read("Material", "Hoerskripte.md"),
  progress: read("Material", "Fortschritt.md"),
  portfolio: read("Material", "Schreibportfolio.md"),
  docs: {
    plan: read("03_Lernplan.md"),
    grammatik: read("Material", "Grammatik.md"),
    wortschatz: read("Material", "Wortschatz.md"),
    "hoeren-lesen": read("Material", "Hoeren_Lesen.md"),
    sprechen: read("Material", "Sprechen_Aussprache.md"),
    schreiben: read("Material", "Schreibportfolio.md"),
  },
});

const all = [...issues, ...validateCourse(course)];
const itemCount = [course.placement, ...course.weeks].reduce((sum, u) => sum + Object.keys(u.items).length, 0);

if (all.length) {
  for (const issue of all) console.error(`  ${issue.where}: ${issue.message}`);
  console.error(`\ncontent: ${all.length} problem(s); fix the source or the parser`);
  process.exit(1);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(join(dirname(OUT), "course.source.json"), JSON.stringify(course));

const { course: english, missing } = translateCourse(course, EN);
if (missing.length) {
  for (const m of missing) console.error("  missing English: " + m);
  console.error(`\ncontent: ${missing.length} instruction(s) without an English translation in src/content/en.ts`);
  process.exit(1);
}

english.vocab = enrichCoreVocabulary(english.vocab);
addWeeklyPractice(english);
addRecallPractice(english);
addWritingPractice(english);
makeSelfPaced(english);
addGrammarPractice(english);
for (const entry of english.vocab) {
  if (!entry.meaning?.trim() || !entry.exampleEn?.trim() || !entry.example.trim() || !entry.forms.trim()) {
    throw new Error(`Incomplete bilingual vocabulary: ${entry.id}`);
  }
}
writeFileSync(OUT, JSON.stringify(english));
const nav = english.weeks.map((w, k) => ({ n: k + 1, title: w.title, sections: w.sections.map((s) => ({ id: s.id, title: s.title, role: s.role })) }));
writeFileSync(join(dirname(OUT), "nav.json"), JSON.stringify(nav));
const enrichedCount = [english.placement, ...english.weeks].reduce((sum, unit) => sum + Object.keys(unit.items).length, 0) + (english.grammar ?? []).reduce((sum, topic) => sum + topic.items.length, 0);
console.log(`content: ${english.weeks.length} everyday topics, ${english.grammar?.length ?? 0} grammar topics, ${itemCount} -> ${enrichedCount} exercises, ${english.vocab.length} bilingual words`);
