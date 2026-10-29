import type { Item } from "./types.ts";

export type Note = "case" | "umlaut" | "punctuation";

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

const PUNCTUATION = /[.,!?;:¡¿…–—-]/g;
const withoutPunctuation = (s: string) => s.replace(PUNCTUATION, " ").replace(/\s+/g, " ").trim();
const punctuationOf = (s: string) => s.replace(/[^.,!?;:¡¿…–—-]/g, "");

export function compareOne(input: string, expected: string, relaxFirst = true): Verdict {
  const fail: Verdict = { ok: false, notes: [], spellingOnly: false };
  const a = normalize(input);
  const e = normalize(expected);
  const x = withoutPunctuation(a);
  const y = withoutPunctuation(e);
  if (!x) return fail;
  const tx = transliterate(x);
  const ty = transliterate(y);
  if (tx.toLowerCase() !== ty.toLowerCase()) return fail;
  const notes: Note[] = [];
  if (x.toLowerCase() !== y.toLowerCase()) notes.push("umlaut");
  if (tx !== ty && !(relaxFirst && tx.slice(1) === ty.slice(1))) notes.push("case");
  if (punctuationOf(a) !== punctuationOf(e)) notes.push("punctuation");
  return { ok: true, notes, spellingOnly: false };
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
