import type { Block, Checkpoint, Course, Doc, Inline, Item, ScriptPart, Section, SectionRole, Unit, VocabEntry, WritingTask } from "./types.ts";
import { parseBlocks, parseTable, splitDoc, stripFrontmatter } from "./markdown.ts";
import { parseInline, plain } from "./inline.ts";
import { guessTag } from "./tags.ts";
import { DEFAULT_HINT, HINTS } from "../content/feedback-hints.ts";
import { OVERRIDES } from "../content/overrides.ts";

export interface Issue {
  where: string;
  message: string;
}

export interface SourceFiles {
  placement: string;
  placementKey: string;
  weeks: string[];
  weekKeys: string[];
  scripts: string;
  progress: string;
  portfolio: string;
  docs: Record<string, string>;
}

interface AnswerKey {
  numbered: Map<string, Map<number, string>>;
  ordered: Map<string, string>;
  models: { label: string; text: string }[];
  notes: string[];
  used: Set<string>;
}

const BLANK = /___|…/g;
const HAS_BLANK = /___|…/;
const ROLE_RULES: [RegExp, SectionRole][] = [
  [/^\d+ Wortschatz abrufen|^Teil C/, "retrieval"],
  [/^1 Wortschatz/, "vocab"],
  [/^2 Grammatik/, "grammar"],
  [/Übungen Grammatik|^Teil D/, "exercises"],
  [/^\d+ Lesen|^Teil A/, "reading"],
  [/^\d+ Hören|^Teil B/, "listening"],
  [/^\d+ Sprechen|^Teil F/, "speaking"],
  [/^\d+ Aussprache/, "pronunciation"],
  [/^\d+ Schreiben|^Teil E/, "writing"],
  [/Wiederholungsquiz/, "quiz"],
];
const ITEM_ROLES = new Set<SectionRole>(["exercises", "retrieval", "reading", "listening", "pronunciation", "quiz"]);

function roleOf(title: string): SectionRole {
  for (const [pattern, role] of ROLE_RULES) if (pattern.test(title)) return role;
  return "other";
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function splitNumbered(text: string, loose: boolean): [number, string][] {
  const re = loose ? /(?:^|\s)(\d{1,2})\.\s/g : /(?:^|\s·\s)(\d{1,2})\.\s/g;
  const marks = [...text.matchAll(re)];
  return marks.map((m, k) => {
    const start = (m.index ?? 0) + m[0].length;
    const next = marks[k + 1];
    const end = next ? next.index ?? text.length : text.length;
    return [Number(m[1]), text.slice(start, end).trim()];
  });
}

const stripMd = (s: string) => s.replace(/\*\*/g, "").replace(/\*/g, "").trim();

export function parseAnswerKey(lines: string[], sectionTitle: string): AnswerKey {
  const key: AnswerKey = { numbered: new Map(), ordered: new Map(), models: [], notes: [], used: new Set() };
  let mode: "num" | "ordered" | "model" | "note" = "num";
  let numGroup = "_";
  const addNum = (group: string, text: string, loose: boolean) => {
    const map = key.numbered.get(group) ?? new Map<number, string>();
    for (const [n, value] of splitNumbered(text, loose)) map.set(n, value);
    key.numbered.set(group, map);
  };
  for (const raw of lines) {
    const t = raw.trim();
    if (!t || t === "---") continue;
    const m = t.match(/^\*\*(.+?)\*\*\s*(.*)$/);
    if (m && !t.startsWith("**Bewertung")) {
      const label = (m[1] ?? "").replace(/:$/, "").trim();
      const rest = (m[2] ?? "").replace(/^:\s*/, "");
      if (/^[GD]\d/.test(label)) {
        mode = "num";
        numGroup = "G";
        if (rest) addNum("G", rest, false);
      } else if (/^(Quiz|Lesen|Hören)$/.test(label)) {
        mode = "num";
        numGroup = label;
        if (rest) addNum(label, rest, false);
      } else if (/^V\d/.test(label)) {
        mode = "ordered";
        key.ordered.set(label.slice(0, 2), (/Beispiel/.test(label) ? "@" : "") + rest);
      } else if (/Aussprache (A\d)/.test(label)) {
        mode = "ordered";
        key.ordered.set(label.match(/A\d/)?.[0] ?? "A1", rest);
      } else if (/Schreiben/.test(label) && /Modell/.test(label)) {
        mode = "model";
        key.models.push({ label, text: "" });
      } else {
        mode = "note";
        key.notes.push("**" + label + ":** " + rest);
      }
    } else if (/^\d{1,2}\.\s/.test(t) && mode === "num") {
      addNum(numGroup, t, false);
    } else if (t.startsWith(">")) {
      const text = t.replace(/^>\s?/, "");
      let model = key.models[key.models.length - 1];
      if (mode !== "model" || !model) {
        model = { label: sectionTitle, text: "" };
        key.models.push(model);
        mode = "model";
      }
      model.text = model.text ? model.text + "\n" + text : text;
    } else if (mode === "note" && (t.startsWith("- ") || !t.startsWith("|"))) {
      key.notes.push(t);
    }
  }
  return key;
}

interface ParsedAnswer {
  alts: string[][];
  display: string;
}

export function parseAnswer(text: string): ParsedAnswer {
  const display = stripMd(text);
  const extra: string[] = [];
  let body = text.replace(/\*?\((?:auch|oder):\s*([^)]+)\)\*?/g, (_, alt: string) => {
    extra.push(stripMd(alt));
    return "";
  });
  body = stripMd(body.replace(/\*?\([^)]*\)\*?/g, ""));
  const alts = [...body.split("/"), ...extra]
    .map((a) => a.trim())
    .filter(Boolean)
    .map((a) => a.split(/\s…\s/).map((p) => p.trim()));
  return { alts, display };
}

function choiceFrom(prompt: string): { prompt: string; options: { key: string; label: string }[] } | null {
  if (/richtig\s*\/\s*falsch\?|☐\s*richtig\s*☐\s*falsch/.test(prompt)) {
    return {
      prompt: prompt.replace(/\s*[–-]?\s*(richtig\s*\/\s*falsch\?|☐\s*richtig\s*☐\s*falsch)\s*$/, "").trim(),
      options: [{ key: "richtig", label: "richtig" }, { key: "falsch", label: "falsch" }],
    };
  }
  const cleaned = prompt.replace(/☐\s*/g, "");
  const first = cleaned.search(/\sa\)\s/);
  if (first === -1 || !/\sb\)\s/.test(cleaned)) return null;
  const options = [...cleaned.slice(first).matchAll(/([a-d])\)\s(.+?)(?=\s[a-d]\)\s|$)/g)].map((m) => ({
    key: m[1] ?? "",
    label: (m[2] ?? "").trim(),
  }));
  return { prompt: cleaned.slice(0, first).trim(), options };
}

function variants(prompt: string, alts: string[][]): string[][] {
  const out = [...alts];
  const idx = prompt.search(HAS_BLANK);
  if (idx === -1) return out;
  const before = stripMd(prompt.slice(0, idx)).split(/→|:/).pop()?.trim() ?? "";
  const afterRaw = stripMd(prompt.slice(idx).replace(/^(___|…)/, ""));
  const after = (afterRaw.split(/[(→]/)[0] ?? "").trim().replace(/[.?!,]+$/, "");
  for (const alt of alts) {
    if (alt.length !== 1) continue;
    const a = alt[0] ?? "";
    const lower = a.toLowerCase();
    if (before && lower.startsWith(before.toLowerCase() + " ")) out.push([a.slice(before.length).trim()]);
    else if (before && before.split(" ").length <= 8 && !/[.?!]$/.test(before)) out.push([before + " " + a]);
    if (after && !HAS_BLANK.test(after) && lower.endsWith(" " + after.toLowerCase())) out.push([a.slice(0, a.length - after.length).trim()]);
  }
  return out;
}

function capStartFor(prompt: string, alts: string[][], blanks: number): boolean {
  if (blanks === 0 || alts.some((a) => a.some((p) => p.includes(" ")))) return true;
  const idx = prompt.search(HAS_BLANK);
  const before = stripMd(prompt.slice(0, Math.max(idx, 0))).trim();
  return before === "" || /[.?!:→]$/.test(before);
}

interface Ctx {
  unitId: string;
  hintKey: string;
  issues: Issue[];
}

function hintFor(ctx: Ctx, group: string, prompt: string, display: string) {
  const known = HINTS[`${ctx.hintKey}:${group}`];
  const tag = known?.tag ?? guessTag(prompt, display, group);
  const fallback = DEFAULT_HINT[tag];
  return { tag, hint: known?.hint ?? fallback.hint, rule: known?.rule ?? fallback.rule };
}

function makeItem(ctx: Ctx, role: SectionRole, group: string, n: number, rawPrompt: string, answer: string | undefined, forceOpen = false): Item {
  const id = `${ctx.unitId}-${slug(group)}-${n}`;
  const where = `${ctx.unitId} ${group} ${n}`;
  if (answer === undefined || answer.trim() === "" || answer.trim() === "@") {
    ctx.issues.push({ where, message: "no answer in the answer key" });
  }
  const examples = (answer ?? "").startsWith("@");
  const parsed = parseAnswer((answer ?? "").replace(/^@/, ""));
  const base = { id, n, group, display: parsed.display, ...hintFor(ctx, group, rawPrompt, parsed.display) };

  const choice = choiceFrom(rawPrompt);
  const letter = parsed.display.match(/^([a-d])(?:\)|$|\s)/)?.[1];
  if (choice || (letter && (role === "reading" || role === "listening"))) {
    const options = choice?.options ?? ["a", "b", "c", "d"].map((k) => ({ key: k, label: k }));
    const correct = choice?.options.length === 2 ? parsed.display.split(/\s/)[0]?.toLowerCase() : letter;
    if (!correct || !options.some((o) => o.key === correct)) ctx.issues.push({ where, message: "choice answer not among options: " + parsed.display });
    return { ...base, prompt: choice?.prompt ?? rawPrompt, kind: "choice", blanks: 0, capStart: true, options, correct: correct ?? "", answers: [] };
  }
  if (forceOpen || examples || role === "reading" || role === "listening" || role === "pronunciation") {
    return { ...base, prompt: rawPrompt, kind: "open", blanks: 0, capStart: true, answers: [] };
  }

  let blanks = (rawPrompt.match(BLANK) ?? []).length;
  const counts = new Set(parsed.alts.map((a) => a.length));
  if (blanks > 1 && !(counts.size === 1 && counts.has(blanks))) {
    if (counts.size === 1 && counts.has(1)) blanks = 0;
    else ctx.issues.push({ where, message: `prompt has ${blanks} blanks but answer has ${[...counts].join("/")} parts` });
  }
  const item: Item = {
    ...base,
    prompt: rawPrompt,
    kind: "text",
    blanks,
    capStart: capStartFor(rawPrompt, parsed.alts, blanks),
    answers: blanks <= 1 ? variants(rawPrompt, parsed.alts) : parsed.alts,
  };
  const override = OVERRIDES[id];
  return override ? { ...item, ...override } : item;
}

interface OrderedGroup {
  group: string;
  title: string;
  rest: string;
  sub: string[];
  extra: string[];
}

function buildOrdered(ctx: Ctx, role: SectionRole, g: OrderedGroup, key: AnswerKey): Item[] {
  const raw = key.ordered.get(g.group);
  key.used.add("o:" + g.group);
  const where = `${ctx.unitId} ${g.group}`;
  if (raw === undefined) {
    ctx.issues.push({ where, message: "no answer in the answer key" });
    return [];
  }
  const examples = raw.startsWith("@");
  const parts = raw.replace(/^@/, "").split(/\s·\s/).map((p) => p.trim());
  let instruction = "";
  let prompts = g.sub;
  if (!prompts.length && g.rest.includes("___") && !g.group.startsWith("A")) {
    let rest = g.rest;
    const m = rest.match(/^([^·]*?:)\s*(.*)$/);
    if (m && !(m[1] ?? "").includes("___") && !((m[2] ?? "").split(/\s·\s/)[0] ?? "").trim().startsWith("___")) {
      instruction = m[1] ?? "";
      rest = m[2] ?? "";
    }
    prompts = rest.split(/\s·\s/).map((p) => p.trim());
  }
  g.title = [g.title, instruction].filter(Boolean).join(" ");
  if (!prompts.length) {
    const prompt = [g.rest, ...g.extra].filter(Boolean).join("\n");
    return [makeItem(ctx, role, g.group, 1, prompt, raw.replace(/^@/, ""), true)];
  }
  const tag = examples ? "@" : "";
  if (prompts.length === parts.length) return prompts.map((p, k) => makeItem(ctx, role, g.group, k + 1, p, tag + (parts[k] ?? "")));
  if (prompts.length === 1 && (prompts[0]?.match(/___/g) ?? []).length === parts.length) {
    return [makeItem(ctx, role, g.group, 1, prompts[0] ?? "", tag + parts.join(" … "))];
  }
  ctx.issues.push({ where, message: `${prompts.length} prompts but ${parts.length} answers` });
  return [];
}

function parseItemSection(ctx: Ctx, role: SectionRole, lines: string[], key: AnswerKey, defaultGroup: string, items: Record<string, Item>): Block[] {
  const blocks: Block[] = [];
  let buf: string[] = [];
  let group = defaultGroup;
  let ordered: OrderedGroup | null = null;
  const flush = () => {
    if (buf.length) blocks.push(...parseBlocks(buf));
    buf = [];
  };
  const push = (item: Item) => {
    items[item.id] = item;
    blocks.push({ kind: "item", itemId: item.id });
  };
  const closeOrdered = () => {
    if (!ordered) return;
    const built = buildOrdered(ctx, role, ordered, key);
    blocks.push({ kind: "h", text: parseInline(`${ordered.group}. ${ordered.title}`.trim()) });
    built.forEach(push);
    ordered = null;
  };
  const numberedGroup = (g: string) => (/^[GD]\d/.test(g) ? "G" : key.numbered.has(g) ? g : "_");
  const pushNumbered = (entries: [number, string][]) => {
    flush();
    for (const [n, prompt] of entries) {
      const mapKey = numberedGroup(group);
      key.used.add(`n:${mapKey}:${n}`);
      push(makeItem(ctx, role, group, n, prompt, key.numbered.get(mapKey)?.get(n)));
    }
  };

  for (const line of lines) {
    const t = line.trim();
    const label = t.match(/^\*\*([GVDA]\d+)\.?\s*(.*?)\*\*\s*(.*)$/);
    if (label) {
      closeOrdered();
      flush();
      group = label[1] ?? defaultGroup;
      if (/^[VA]/.test(group)) {
        ordered = { group, title: stripMd(label[2] ?? ""), rest: label[3] ?? "", sub: [], extra: [] };
      } else {
        blocks.push({ kind: "h", text: parseInline(`${group}. ${label[2] ?? ""}`.trim()) });
        const rest = label[3] ?? "";
        if (/\d{1,2}\.\s/.test(rest)) pushNumbered(splitNumbered(rest, true));
        else if (rest) buf.push(rest);
      }
      continue;
    }
    const current: OrderedGroup | null = ordered;
    if (current) {
      if (!t) {
        closeOrdered();
        buf.push("");
        continue;
      }
      if (current.group.startsWith("A")) current.extra.push(t);
      else if (/^\d{1,2}\.\s/.test(t)) current.sub.push(t.replace(/^\d{1,2}\.\s/, ""));
      else if (t.startsWith("- ") && t.includes("___")) current.sub.push(t.slice(2));
      else current.extra.push(t);
      continue;
    }
    if (role === "listening" && /Skript/.test(t)) continue;
    if (/^\d{1,2}\.\s/.test(t)) pushNumbered(splitNumbered(t, false));
    else buf.push(line);
  }
  closeOrdered();
  flush();
  return blocks;
}

function writingTasks(ctx: Ctx, lines: string[], key: AnswerKey, prefix: string): WritingTask[] {
  const tasks: WritingTask[] = [];
  let k = 0;
  while (k < lines.length) {
    const t = (lines[k] ?? "").trim();
    const range = t.match(/(\d+)–(\d+) Wörter/);
    if (range) {
      const text = [t];
      while ((lines[k + 1] ?? "").trim().startsWith("- ")) text.push((lines[++k] ?? "").trim());
      const model = key.models[tasks.length];
      if (!model) ctx.issues.push({ where: `${ctx.unitId} writing ${tasks.length + 1}`, message: "no model text" });
      tasks.push({
        id: `${prefix}-wr-${tasks.length + 1}`,
        prompt: parseInline(text.join(" · ")),
        min: Number(range[1]),
        max: Number(range[2]),
        model: model?.text ?? "",
      });
    }
    k++;
  }
  return tasks;
}

export function parseScripts(md: string): Map<string, ScriptPart[]> {
  const out = new Map<string, ScriptPart[]>();
  for (const section of splitDoc(md).sections) {
    const parts: ScriptPart[] = [];
    let part: ScriptPart = { title: "", lines: [] };
    for (const raw of section.lines) {
      const t = raw.trim();
      const head = t.match(/^\*\*(.+)\*\*$/);
      if (head) {
        if (part.lines.length) parts.push(part);
        part = { title: head[1] ?? "", lines: [] };
      } else if (/^\*[^*].*\*$/.test(t) && !part.lines.length) {
        part.title = [part.title, t.replace(/\*/g, "")].filter(Boolean).join(" · ");
      } else if (t.startsWith(">")) {
        const text = t.replace(/^>\s?/, "");
        const m = text.match(/^([A-Z]):\s(.*)$/);
        part.lines.push(m ? { speaker: m[1] ?? "", text: m[2] ?? "" } : { speaker: "", text: stripMd(text) });
      }
    }
    if (part.lines.length) parts.push(part);
    const week = section.title.match(/^Woche (\d+)/);
    out.set(week ? "w" + week[1] : section.title.startsWith("Einstufung") ? "p" : section.title, parts);
  }
  return out;
}

function parseVocab(week: number, lines: string[]): VocabEntry[] {
  const entries: VocabEntry[] = [];
  const seen = new Set<string>();
  let k = 0;
  while (k < lines.length) {
    if (!(lines[k] ?? "").trim().startsWith("|")) {
      k++;
      continue;
    }
    const raw: string[] = [];
    while ((lines[k] ?? "").trim().startsWith("|")) raw.push(lines[k++] ?? "");
    const { header, rows } = parseTable(raw);
    const verbStyle = /er\/sie/.test(header[1] ?? "");
    for (const row of rows) {
      const groups = row.length >= 5 && row[2] === "" ? [row.slice(0, 2), row.slice(3, 5)] : [row];
      for (const cells of groups) {
        const term = plain(cells[0] ?? "").trim();
        if (!term) continue;
        const forms = plain(verbStyle ? [cells[1], cells[2]].filter(Boolean).join(" · ") : cells[1] ?? "").trim();
        const example = plain((verbStyle ? cells[3] : cells[2]) ?? "").trim();
        const id = `w${week}-${slug(term)}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const entry: VocabEntry = { id, week, term, forms, example };
        const noun = term.match(/^(der|die|das) ([A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]*)$/);
        if (noun && !/nur Pl/.test(forms)) {
          entry.article = noun[1] as VocabEntry["article"];
          entry.noun = noun[2] ?? "";
          const plural = forms.match(/^die ([A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]*)$/);
          if (plural) entry.plural = plural[1] ?? "";
        }
        entries.push(entry);
      }
    }
  }
  return entries;
}

const NAV = /^\[←|Lösungen:|Hörskript:/;

function parseUnit(md: string, keys: Map<string, AnswerKey>, script: ScriptPart[], unitId: string, hintKey: string, issues: Issue[], placement: boolean): Unit {
  const doc = splitDoc(md);
  const ctx: Ctx = { unitId, hintKey, issues };
  const items: Record<string, Item> = {};
  const sections: Section[] = [];
  const unit: Unit = {
    id: unitId,
    title: doc.title,
    intro: parseBlocks(doc.intro.filter((l) => !NAV.test(l.trim()))),
    sections,
    items,
    script,
    writing: [],
    notes: {},
    shortDay: [],
  };
  const firstKey = keys.values().next().value;
  for (const raw of doc.sections) {
    const role = roleOf(raw.title);
    const teil = raw.title.match(/^Teil ([A-F])/)?.[1];
    const key = (placement ? keys.get(teil ?? "") : firstKey) ?? emptyKey();
    const id = slug(raw.title);
    if (/^Kurztag/.test(raw.title)) {
      unit.shortDay = parseInline(raw.lines.filter((l) => l.trim()).join(" "));
      continue;
    }
    let blocks: Block[];
    if (ITEM_ROLES.has(role)) {
      const defaultGroup = placement ? teil ?? "X" : role === "reading" ? "Lesen" : role === "listening" ? "Hören" : role === "quiz" ? "Quiz" : "X";
      blocks = parseItemSection(ctx, role, raw.lines, key, defaultGroup, items);
    } else {
      blocks = parseBlocks(raw.lines.filter((l) => !NAV.test(l.trim())));
    }
    if (role === "writing") unit.writing.push(...writingTasks(ctx, raw.lines, key, unitId));
    if (role === "speaking" && key.notes.length) unit.notes.speaking = parseBlocks(key.notes.map((n) => (n.startsWith("- ") ? n : n + "\n")).flatMap((n) => n.split("\n")));
    sections.push({ id, title: raw.title, role, blocks });
  }
  for (const key of keys.values()) {
    for (const [group, map] of key.numbered) {
      for (const n of map.keys()) {
        if (!key.used.has(`n:${group}:${n}`)) issues.push({ where: `${unitId} ${group} ${n}`, message: "answer has no matching exercise" });
      }
    }
    for (const group of key.ordered.keys()) {
      if (!key.used.has("o:" + group)) issues.push({ where: `${unitId} ${group}`, message: "answer has no matching exercise" });
    }
  }
  return unit;
}

function emptyKey(): AnswerKey {
  return { numbered: new Map(), ordered: new Map(), models: [], notes: [], used: new Set() };
}

function parseCheckpoints(progressMd: string, keyMds: string[], issues: Issue[]): Checkpoint[] {
  const models = new Map<number, string>();
  for (const md of keyMds) {
    for (const s of splitDoc(md).sections) {
      const m = s.title.match(/^Checkpoint (\d) – Schreiben/);
      if (m) models.set(Number(m[1]), parseAnswerKey(s.lines, s.title).models[0]?.text ?? "");
    }
  }
  const out: Checkpoint[] = [];
  for (const s of splitDoc(progressMd).sections) {
    const m = s.title.match(/^Checkpoint (\d) \(Ende Woche (\d+)\)/);
    if (!m) continue;
    const n = Number(m[1]);
    const cp: Checkpoint = { n, week: Number(m[2]), canDo: [] };
    let k = 0;
    while (k < s.lines.length) {
      const t = (s.lines[k] ?? "").trim();
      const range = t.match(/(\d+)–(\d+) Wörter/);
      if (/^\*\*Teil 2: Neue Schreibaufgabe/.test(t) && range) {
        if (!models.get(n)) issues.push({ where: `checkpoint ${n}`, message: "no model text" });
        cp.writing = { id: `cp${n}-wr-1`, prompt: parseInline(t), min: Number(range[1]), max: Number(range[2]), model: models.get(n) ?? "" };
      } else if (/^\*\*Teil 3: Neue Sprechaufgabe/.test(t)) {
        cp.speaking = parseInline(t);
      } else if (t.startsWith("| Ich kann")) {
        const raw: string[] = [];
        while ((s.lines[k] ?? "").trim().startsWith("|")) raw.push(s.lines[k++] ?? "");
        cp.canDo = parseTable(raw).rows.map((r) => plain(r[0] ?? ""));
        continue;
      }
      k++;
    }
    if (!cp.canDo.length) issues.push({ where: `checkpoint ${n}`, message: "no can-do statements" });
    out.push(cp);
  }
  return out;
}

const DOC_EXCLUDE = /^(Übersicht meiner Texte|Meine Texte|Meine eigenen Wörter|Aufnahme-Log|Partner finden)/;

function parseDoc(slugName: string, md: string): Doc {
  const doc = splitDoc(md);
  const lines: string[] = doc.intro.filter((l) => !NAV.test(l.trim()));
  for (const s of doc.sections) {
    if (DOC_EXCLUDE.test(s.title)) continue;
    lines.push("", "### " + s.title, ...s.lines.filter((l) => !NAV.test(l.trim())));
  }
  return { slug: slugName, title: doc.title, blocks: parseBlocks(lines) };
}

function parseRubric(md: string): Course["rubric"] {
  const doc = splitDoc(stripFrontmatter(md));
  const checklist = doc.sections.find((s) => s.title.startsWith("Checkliste"))?.lines.filter((l) => l.trim().startsWith("- [ ]")).map((l) => l.trim().slice(6)) ?? [];
  const table = doc.sections.find((s) => s.title.startsWith("Bewertungsraster"))?.lines.filter((l) => l.trim().startsWith("|")) ?? [];
  const writing = parseTable(table).rows.map((r) => plain(r[0] ?? ""));
  return { writing, checklist };
}

export function parseCourse(src: SourceFiles): { course: Course; issues: Issue[] } {
  const issues: Issue[] = [];
  const scripts = parseScripts(src.scripts);

  const placementKeys = new Map<string, AnswerKey>();
  for (const s of splitDoc(src.placementKey).sections) {
    const teil = s.title.match(/^Teil ([A-F])/)?.[1];
    if (teil) placementKeys.set(teil, parseAnswerKey(s.lines, s.title));
  }
  const placement = parseUnit(src.placement, placementKeys, scripts.get("p") ?? [], "p", "p", issues, true);

  const weekKeys = new Map<number, AnswerKey>();
  for (const md of src.weekKeys) {
    for (const s of splitDoc(md).sections) {
      const m = s.title.match(/^Woche (\d+)$/);
      if (m) weekKeys.set(Number(m[1]), parseAnswerKey(s.lines, s.title));
    }
  }
  const weeks: Unit[] = [];
  const vocab: VocabEntry[] = [];
  src.weeks.forEach((md, k) => {
    const n = k + 1;
    const key = weekKeys.get(n);
    if (!key) issues.push({ where: `w${n}`, message: "no answer key section" });
    const unit = parseUnit(md, new Map([["w", key ?? emptyKey()]]), scripts.get("w" + n) ?? [], "w" + n, "w" + n, issues, false);
    weeks.push(unit);
    const vocabSection = splitDoc(md).sections.find((s) => roleOf(s.title) === "vocab");
    if (vocabSection) vocab.push(...parseVocab(n, vocabSection.lines));
  });

  const checkpoints = parseCheckpoints(src.progress, src.weekKeys, issues);
  const docs = Object.entries(src.docs).map(([slugName, md]) => parseDoc(slugName, md));
  return { course: { placement, weeks, vocab, checkpoints, docs, rubric: parseRubric(src.portfolio) }, issues };
}

const REQUIRED_ROLES: SectionRole[] = ["vocab", "grammar", "exercises", "retrieval", "reading", "listening", "speaking", "pronunciation", "writing", "quiz"];

export function validateCourse(course: Course): Issue[] {
  const issues: Issue[] = [];
  if (course.weeks.length !== 12) issues.push({ where: "course", message: `expected 12 weeks, found ${course.weeks.length}` });
  for (const unit of [course.placement, ...course.weeks]) {
    const roles = new Set(unit.sections.map((s) => s.role));
    if (unit !== course.placement) {
      for (const role of REQUIRED_ROLES) if (!roles.has(role)) issues.push({ where: unit.id, message: "missing section: " + role });
    }
    if (!unit.script.length) issues.push({ where: unit.id, message: "no listening script" });
    if (!unit.writing.length) issues.push({ where: unit.id, message: "no writing task" });
    for (const task of unit.writing) if (!task.model) issues.push({ where: task.id, message: "writing task without model" });
    for (const item of Object.values(unit.items)) {
      if (item.kind === "text" && (!item.answers.length || item.answers.some((a) => a.some((p) => !p)))) issues.push({ where: item.id, message: "empty answer" });
      if (item.kind === "choice" && !item.correct) issues.push({ where: item.id, message: "choice without correct option" });
      if (item.kind === "open" && !item.display) issues.push({ where: item.id, message: "open item without solution" });
    }
  }
  if (course.checkpoints.length !== 3) issues.push({ where: "checkpoints", message: `expected 3, found ${course.checkpoints.length}` });
  if (!course.vocab.length) issues.push({ where: "vocab", message: "no vocabulary parsed" });
  return issues;
}

export type { Inline };
