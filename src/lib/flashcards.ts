import type { VocabEntry } from "./types.ts";
import type { KnowledgeDeck } from "../content/knowledge.ts";

export interface Flashcard {
  id: string;
  deck: string;
  label: string;
  front: string;
  frontLang: "de" | "en";
  ask: string;
  back: string;
  meaning?: string;
  forms?: string;
  example?: string;
  exampleEn?: string;
}

export interface DeckOption {
  id: string;
  title: string;
  total: number;
}

export const TOPIC_DECK = "topics";

export function fromVocab(v: VocabEntry): Flashcard {
  const base = { id: v.id, deck: TOPIC_DECK, label: `Topic ${v.week}`, frontLang: "de" as const, back: v.term, meaning: v.meaning ?? "", forms: v.forms, example: v.example, exampleEn: v.exampleEn ?? "" };
  if (v.article && v.noun) return { ...base, front: `___ ${v.noun}`, ask: v.plural ? "Article and plural?" : "Article?" };
  if (/·/.test(v.forms) || /hat |ist /.test(v.forms)) return { ...base, front: v.term, ask: "Which forms? (er/sie, perfect tense)" };
  return { ...base, front: v.term, ask: "Meaning, or an example sentence?" };
}

export function fromKnowledge(decks: KnowledgeDeck[]): Flashcard[] {
  return decks.flatMap((d) => d.cards.map((c) => ({ ...c, label: d.title })));
}

export function interleave<T>(lists: T[][]): T[] {
  const out: T[] = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) for (const list of lists) if (i < list.length) out.push(list[i] as T);
  return out;
}

export function newCardOrder(cards: Flashcard[], deck: string): Flashcard[] {
  if (deck !== "all") return cards.filter((c) => c.deck === deck);
  const groups = new Map<string, Flashcard[]>();
  for (const c of cards) {
    const group = groups.get(c.deck);
    if (group) group.push(c);
    else groups.set(c.deck, [c]);
  }
  return interleave([...groups.values()]);
}
