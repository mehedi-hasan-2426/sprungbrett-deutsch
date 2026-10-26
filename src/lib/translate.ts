import type { Block, Course, Inline, Unit } from "./types.ts";
import { parseInline } from "./inline.ts";
import { textKey } from "./text-key.ts";

const plainOf = (segs: Inline[]) => segs.map((s) => s.t).join("");

export function translateCourse(course: Course, en: Record<string, string>): { course: Course; missing: string[] } {
  const missing = new Set<string>();
  const used = new Set<string>();

  const lookup = (text: string, required: boolean): string | null => {
    const t = text.trim();
    if (!t || !/[A-Za-zÄÖÜäöüß]/.test(t)) return null;
    const key = textKey(t);
    const value = en[key];
    if (value === undefined) {
      if (required) missing.add(`${key}\t${t}`);
      return null;
    }
    used.add(key);
    return value === "=" ? null : value;
  };
  const segs = (s: Inline[], required = true): Inline[] => {
    const v = lookup(plainOf(s), required);
    return v === null ? s : parseInline(v);
  };
  const str = (s: string, required = true): string => lookup(s, required) ?? s;
  const blocks = (list: Block[]): Block[] =>
    list.map((b) => {
      switch (b.kind) {
        case "h":
        case "p":
          return { ...b, text: segs(b.text) };
        case "list":
          return { ...b, items: b.items.map((i) => segs(i)) };
        case "table":
          return { ...b, header: b.header.map((h) => segs(h)), rows: b.rows.map((r) => r.map((c) => segs(c, false))) };
        default:
          return b;
      }
    });
  const writingPrompt = (s: Inline[]): Inline[] => {
    const parts = plainOf(s).split(" · ").map((p) => {
      const bullet = p.startsWith("- ");
      const body = bullet ? p.slice(2) : p;
      return (bullet ? "- " : "") + (lookup(body, true) ?? body);
    });
    return parseInline(parts.join(" · "));
  };
  const unit = (u: Unit): Unit => ({
    ...u,
    title: str(u.title),
    intro: blocks(u.intro),
    sections: u.sections.map((s) => ({ ...s, title: str(s.title), blocks: blocks(s.blocks) })),
    items: Object.fromEntries(
      Object.entries(u.items).map(([id, item]) => [id, item.kind === "open" ? { ...item, prompt: str(item.prompt, false) } : item]),
    ),
    writing: u.writing.map((w) => ({ ...w, prompt: writingPrompt(w.prompt) })),
    notes: Object.fromEntries(Object.entries(u.notes).map(([k, v]) => [k, blocks(v)])),
    shortDay: u.shortDay.length ? segs(u.shortDay) : u.shortDay,
  });

  const out: Course = {
    ...course,
    placement: unit(course.placement),
    weeks: course.weeks.map(unit),
    checkpoints: course.checkpoints.map((cp) => {
      const next = { ...cp, canDo: cp.canDo.map((c) => str(c)) };
      if (cp.writing) next.writing = { ...cp.writing, prompt: segs(cp.writing.prompt) };
      if (cp.speaking) next.speaking = segs(cp.speaking);
      return next;
    }),
    docs: course.docs.map((d) => ({ ...d, title: str(d.title), blocks: blocks(d.blocks) })),
    rubric: { writing: course.rubric.writing.map((c) => str(c)), checklist: course.rubric.checklist.map((c) => str(c)) },
  };
  return { course: out, missing: [...missing] };
}
