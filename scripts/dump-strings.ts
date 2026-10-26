import { writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import type { Block, Course } from "../src/lib/types.ts";
import { textKey } from "../src/lib/text-key.ts";

const course = JSON.parse(readFileSync("content/generated/course.source.json", "utf8")) as Course;
const plain = (segs: { t: string }[]) => segs.map((s) => s.t).join("");
const seen = new Set<string>();
const lines: string[] = [];
const add = (where: string, text: string) => {
  const t = text.trim();
  if (!t || seen.has(t) || !/[A-Za-zÄÖÜäöüß]/.test(t)) return;
  seen.add(t);
  lines.push(`${textKey(t)}\t${where}\t${t}`);
};
const walk = (where: string, blocks: Block[]) => {
  for (const b of blocks) {
    if (b.kind === "h") add(where + ":h", plain(b.text));
    if (b.kind === "p") add(where + ":p", plain(b.text));
    if (b.kind === "list") b.items.forEach((i) => add(where + ":li", plain(i)));
    if (b.kind === "table") {
      b.header.forEach((h) => add(where + ":th", plain(h)));
      if (!/grammar|vocab|grammatik|doc-wortschatz/.test(where)) b.rows.forEach((r) => r.forEach((c) => add(where + ":td", plain(c))));
    }
  }
};
for (const u of [course.placement, ...course.weeks]) {
  add(u.id + ":title", u.title);
  walk(u.id + ":intro", u.intro);
  for (const s of u.sections) {
    add(u.id + ":section", s.title);
    walk(`${u.id}:${s.role}`, s.blocks);
    for (const b of s.blocks) {
      if (b.kind !== "item") continue;
      const item = u.items[b.itemId];
      if (item?.kind === "open" && /retrieval|pronunciation/.test(s.role)) add(item.id + ":open", item.prompt);
    }
  }
  if (u.notes.speaking) walk(u.id + ":notes", u.notes.speaking);
  add(u.id + ":short", plain(u.shortDay));
}
for (const cp of course.checkpoints) {
  if (cp.writing) add(`cp${cp.n}:writing`, plain(cp.writing.prompt));
  if (cp.speaking) add(`cp${cp.n}:speaking`, plain(cp.speaking));
  cp.canDo.forEach((c) => add(`cp${cp.n}:cando`, c));
}
course.rubric.writing.forEach((c) => add("rubric", c));
course.rubric.checklist.forEach((c) => add("checklist", c));
for (const d of course.docs) {
  add(d.slug + ":title", d.title);
  walk("doc-" + d.slug, d.blocks);
}
writeFileSync("content/generated/strings.tsv", lines.join("\n"));
console.log(lines.length + " strings, " + lines.reduce((a, l) => a + l.length, 0) + " chars");
