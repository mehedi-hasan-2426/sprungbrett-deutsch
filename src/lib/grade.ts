import type { Item } from "./types.ts";

export type Note = "case" | "umlaut" | "comma" | "first-letter";

export interface Verdict {
  ok: boolean;
  notes: Note[];
  spellingOnly: boolean;
}

const TRAILING = /[\s.!?;:,]+$/;

export function normalize(input: string): string {
  return input
    .normalize("NFC")
    .replace(/[„“”"«»]/g, "")
    .replace(/[‘’`´]/g, "'")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim()
    .replace(TRAILING, "")
    .trim();
}

export function transliterate(input: string): string {
  return input
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss");
}

const noComma = (s: string) => s.replace(/,/g, "").replace(/\s+/g, " ");

export function compareOne(input: string, expected: string, relaxFirst = true): Verdict {
  const notes: Note[] = [];
  let a = normalize(input);
  let e = normalize(expected);
  if (!a) return { ok: false, notes, spellingOnly: false };
  if (a !== e && noComma(a) === noComma(e)) {
    notes.push("comma");
    a = noComma(a);
    e = noComma(e);
  }
  if (a === e) return { ok: true, notes, spellingOnly: false };
  const firstOnly = (x: string, y: string) => relaxFirst && x.slice(1) === y.slice(1) && x[0]?.toLowerCase() === y[0]?.toLowerCase();
  if (firstOnly(a, e)) {
    notes.push("first-letter");
    return { ok: true, notes, spellingOnly: false };
  }
  const ta = transliterate(a);
  const te = transliterate(e);
  if (ta === te || firstOnly(ta, te)) {
    notes.push("umlaut");
    return { ok: true, notes, spellingOnly: false };
  }
  if (ta.toLowerCase() === te.toLowerCase()) {
    notes.push("case");
    return { ok: false, notes, spellingOnly: true };
  }
  return { ok: false, notes, spellingOnly: false };
}

export function gradeItem(item: Item, inputs: string[]): Verdict {
  if (item.kind === "choice") {
    const ok = (inputs[0] ?? "") === item.correct;
    return { ok, notes: [], spellingOnly: false };
  }
  let best: Verdict = { ok: false, notes: [], spellingOnly: false };
  for (const parts of item.answers) {
    const verdicts =
      item.blanks > 1 && parts.length === item.blanks
        ? parts.map((part, k) => compareOne(inputs[k] ?? "", part, k === 0 && item.capStart))
        : [compareOne(inputs.join(" "), parts.join(" "), item.capStart)];
    const ok = verdicts.every((v) => v.ok);
    const merged: Verdict = {
      ok,
      notes: [...new Set(verdicts.flatMap((v) => v.notes))],
      spellingOnly: !ok && verdicts.every((v) => v.ok || v.spellingOnly),
    };
    if (merged.ok) return merged;
    if (merged.spellingOnly) best = merged;
  }
  return best;
}

export type Status = "new" | "hint" | "solved" | "revealed";

export interface ItemState {
  status: Status;
  attempts: number;
  firstTry: boolean | null;
}

export const START: ItemState = { status: "new", attempts: 0, firstTry: null };

export function step(state: ItemState, ok: boolean): ItemState {
  if (state.status === "solved" || state.status === "revealed") return state;
  const firstTry = state.firstTry ?? ok;
  if (ok) return { status: "solved", attempts: state.attempts + 1, firstTry };
  const attempts = state.attempts + 1;
  return { status: attempts >= 2 ? "revealed" : "hint", attempts, firstTry };
}
