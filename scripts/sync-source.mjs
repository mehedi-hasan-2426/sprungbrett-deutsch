import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = join(ROOT, "content", "source");
const source = process.argv[2];

if (!source || !existsSync(source)) {
  console.error("usage: node scripts/sync-source.mjs <path to the course folder>");
  process.exit(1);
}

// Learner profile, start note and personal logs are never copied into the repository.
const FILES = [
  "02_Einstufungstest.md",
  "03_Lernplan.md",
  ...Array.from({ length: 12 }, (_, i) => `Wochen/Woche_${String(i + 1).padStart(2, "0")}.md`),
  "Loesungen/Loesungen_Einstufung.md",
  "Loesungen/Loesungen_Wochen_01-04.md",
  "Loesungen/Loesungen_Wochen_05-08.md",
  "Loesungen/Loesungen_Wochen_09-12.md",
  "Material/Hoerskripte.md",
  "Material/Grammatik.md",
  "Material/Fortschritt.md",
  "Material/Schreibportfolio.md",
  "Material/Sprechen_Aussprache.md",
  "Material/Wortschatz.md",
  "Material/Hoeren_Lesen.md",
];

const NEUTRAL_NAME = "Alex";

rmSync(TARGET, { recursive: true, force: true });
for (const file of FILES) {
  const from = join(source, file);
  if (!existsSync(from)) throw new Error("missing source file " + file);
  const to = join(TARGET, file);
  mkdirSync(dirname(to), { recursive: true });
  const text = readFileSync(from, "utf8").replace(/Tisha/g, NEUTRAL_NAME);
  if (/tisha/i.test(text)) throw new Error("learner name still present in " + file);
  writeFileSync(to, text);
}
copyFileSync(join(ROOT, "content", "source-README.txt"), join(TARGET, "README.txt"));
console.log("copied " + FILES.length + " files to content/source");
