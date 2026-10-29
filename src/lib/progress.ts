import type { Category } from "./types.ts";
import type { CardState } from "./leitner.ts";
import { NEW_PER_DAY_OPTIONS } from "./leitner.ts";
import type { ItemState, Status } from "./grade.ts";

export const STORAGE_KEY = "sprungbrett.progress";
export const SCHEMA_VERSION = 1;
export const MAX_IMPORT_BYTES = 1_000_000;
export const MAX_ANSWER_LENGTH = 2000;
const MAX_TEXT = 5000;
const MAX_MISTAKES = 500;
const MAX_DAYS = 400;

const ID = /^[a-z0-9-]{1,64}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES: Status[] = ["new", "hint", "solved", "revealed"];
const TAGS: Category[] = ["VP", "KA", "GE", "PL", "VF", "PR", "WS", "AU", "RS", "HÖ"];

export interface ItemRecord {
  status: Status;
  attempts: number;
  firstTry: boolean | null;
  at: number;
  inputs?: string[];
}

export interface WritingRecord {
  text: string;
  score: number[];
  at: number;
  submitted?: boolean;
}

export interface Progress {
  version: typeof SCHEMA_VERSION;
  items: Record<string, ItemRecord>;
  cards: Record<string, CardState>;
  newCards: { day: string; count: number };
  writing: Record<string, WritingRecord>;
  speaking: Record<string, number[]>;
  canDo: Record<string, number[]>;
  mistakes: { tag: Category; at: number }[];
  days: string[];
  settings: { english: boolean; newPerDay?: number };
}

export function emptyProgress(): Progress {
  return {
    version: SCHEMA_VERSION,
    items: {},
    cards: {},
    newCards: { day: "", count: 0 },
    writing: {},
    speaking: {},
    canDo: {},
    mistakes: [],
    days: [],
    settings: { english: true },
  };
}

class InvalidProgress extends Error {}

function fail(message: string): never {
  throw new InvalidProgress(message);
}

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const int = (x: unknown, min: number, max: number): x is number => typeof x === "number" && Number.isInteger(x) && x >= min && x <= max;
const time = (x: unknown): x is number => int(x, 0, 8_640_000_000_000_000);

function record<T>(x: unknown, name: string, each: (v: unknown, key: string) => T, limit = 5000): Record<string, T> {
  if (!isObject(x)) fail(name + " must be an object");
  const keys = Object.keys(x);
  if (keys.length > limit) fail(name + " has too many entries");
  const entries: [string, T][] = [];
  for (const key of keys) {
    if (!ID.test(key) || key === "constructor" || key === "prototype" || key === "__proto__") fail(`${name}: invalid key "${key.slice(0, 40)}"`);
    entries.push([key, each(x[key], key)]);
  }
  return Object.fromEntries(entries);
}

function scores(x: unknown, name: string, max: number): number[] {
  if (!Array.isArray(x) || x.length > 12 || !x.every((v) => int(v, 0, max))) fail(name + " must be a short list of small numbers");
  return [...x] as number[];
}

export function validateProgress(x: unknown): Progress {
  if (!isObject(x)) fail("not a progress object");
  if (x.version !== SCHEMA_VERSION) fail("unsupported version");
  const items = record(x.items, "items", (v, k) => {
    if (!isObject(v) || !STATUSES.includes(v.status as Status) || !int(v.attempts, 0, 100) || !(v.firstTry === null || typeof v.firstTry === "boolean") || !time(v.at)) {
      fail("items." + k + " is invalid");
    }
    const entry: ItemRecord = { status: v.status as Status, attempts: v.attempts as number, firstTry: v.firstTry as boolean | null, at: v.at as number };
    if (v.inputs !== undefined) {
      if (!Array.isArray(v.inputs) || v.inputs.length > 8 || !v.inputs.every((input) => typeof input === "string" && input.length <= MAX_ANSWER_LENGTH)) fail("items." + k + ".inputs is invalid");
      entry.inputs = [...v.inputs] as string[];
    }
    return entry;
  });
  const cards = record(x.cards, "cards", (v, k) => {
    if (!isObject(v) || !int(v.box, 1, 5) || typeof v.due !== "string" || !DAY.test(v.due) || !(v.learned === undefined || typeof v.learned === "boolean")) {
      fail("cards." + k + " is invalid");
    }
    const card: CardState = { box: v.box as number, due: v.due as string };
    if (v.learned) card.learned = true;
    return card;
  });
  if (!isObject(x.newCards) || typeof x.newCards.day !== "string" || !(x.newCards.day === "" || DAY.test(x.newCards.day)) || !int(x.newCards.count, 0, 1000)) {
    fail("newCards is invalid");
  }
  const writing = record(x.writing, "writing", (v, k) => {
    if (!isObject(v) || typeof v.text !== "string" || v.text.length > MAX_TEXT || !time(v.at)) fail("writing." + k + " is invalid");
    if (v.submitted !== undefined && typeof v.submitted !== "boolean") fail("writing." + k + ".submitted is invalid");
    return { text: v.text as string, score: scores(v.score, "writing." + k + ".score", k === "p-wr-1" ? 4 : 2), at: v.at as number, ...(typeof v.submitted === "boolean" ? { submitted: v.submitted } : {}) };
  }, 100);
  const speaking = record(x.speaking, "speaking", (v, k) => scores(v, "speaking." + k, 3), 100);
  const canDo = record(x.canDo, "canDo", (v, k) => scores(v, "canDo." + k, 3), 10);
  if (!Array.isArray(x.mistakes) || x.mistakes.length > MAX_MISTAKES) fail("mistakes is invalid");
  const mistakes = x.mistakes.map((m) => {
    if (!isObject(m) || !TAGS.includes(m.tag as Category) || !time(m.at)) fail("mistake entry is invalid");
    return { tag: m.tag as Category, at: m.at as number };
  });
  if (!Array.isArray(x.days) || x.days.length > MAX_DAYS || !x.days.every((d) => typeof d === "string" && DAY.test(d))) fail("days is invalid");
  if (!isObject(x.settings) || typeof x.settings.english !== "boolean") fail("settings is invalid");
  const perDay = x.settings.newPerDay;
  if (perDay !== undefined && !(NEW_PER_DAY_OPTIONS as readonly unknown[]).includes(perDay)) fail("settings.newPerDay is invalid");
  return {
    version: SCHEMA_VERSION,
    items,
    cards,
    newCards: { day: x.newCards.day as string, count: x.newCards.count as number },
    writing,
    speaking,
    canDo,
    mistakes,
    days: [...new Set(x.days as string[])],
    settings: { english: x.settings.english as boolean, ...(typeof perDay === "number" ? { newPerDay: perDay } : {}) },
  };
}

export function parseImport(text: string): Progress {
  if (text.length > MAX_IMPORT_BYTES || new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) fail("file is too large");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    fail("file is not valid JSON");
  }
  return validateProgress(data);
}

export function progressStorageKey(accountKey: string): string {
  if (!/^[a-f0-9]{64}$/.test(accountKey)) fail("invalid account storage key");
  return `${STORAGE_KEY}.${accountKey}`;
}

export function load(storage: Pick<Storage, "getItem"> | undefined, key = STORAGE_KEY): Progress {
  try {
    const raw = storage?.getItem(key);
    return raw ? parseImport(raw) : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

export function save(storage: Pick<Storage, "setItem"> | undefined, progress: Progress, key = STORAGE_KEY): boolean {
  try {
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function claimLegacyProgress(storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | undefined, accountKey: string): Progress {
  const key = progressStorageKey(accountKey);
  const raw = storage?.getItem(STORAGE_KEY);
  if (!raw) fail("No previous anonymous progress is available.");
  const progress = parseImport(raw);
  if (!save(storage, progress, key)) fail("Progress could not be saved. The previous data has been kept.");
  storage?.removeItem(STORAGE_KEY);
  return progress;
}

export function markDay(p: Progress, day: string): Progress {
  if (p.days.includes(day)) return p;
  return { ...p, days: [...p.days, day].slice(-MAX_DAYS) };
}

export function recordAnswer(p: Progress, itemId: string, prev: ItemState, next: ItemState, tag: Category, now: number, inputs?: string[]): Progress {
  const firstMistake = prev.attempts === 0 && next.status !== "solved";
  return {
    ...p,
    items: { ...p.items, [itemId]: { status: next.status, attempts: next.attempts, firstTry: next.firstTry, at: now, ...(inputs ? { inputs: inputs.slice(0, 8).map((input) => input.slice(0, MAX_ANSWER_LENGTH)) } : {}) } },
    mistakes: firstMistake ? [...p.mistakes, { tag, at: now }].slice(-MAX_MISTAKES) : p.mistakes,
  };
}

export function acceptOverride(p: Progress, itemId: string, tag: Category, now: number): Progress {
  const r = p.items[itemId];
  if (!r || r.status === "solved") return p;
  const firstTry = r.attempts <= 1;
  const index = firstTry ? p.mistakes.findIndex((m) => m.tag === tag && m.at === r.at) : -1;
  return {
    ...p,
    items: { ...p.items, [itemId]: { ...r, status: "solved", firstTry, at: now } },
    mistakes: index === -1 ? p.mistakes : p.mistakes.filter((_, k) => k !== index),
  };
}

export function itemState(p: Progress, itemId: string): ItemState {
  const r = p.items[itemId];
  return r ? { status: r.status, attempts: r.attempts, firstTry: r.firstTry } : { status: "new", attempts: 0, firstTry: null };
}

export function streak(days: string[], today: string, yesterday: string): number {
  const set = new Set(days);
  let cursor = set.has(today) ? today : set.has(yesterday) ? yesterday : "";
  let count = 0;
  while (cursor && set.has(cursor)) {
    count++;
    const [y, m, d] = cursor.split("-").map(Number);
    const prev = new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) - 1);
    cursor = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-${String(prev.getDate()).padStart(2, "0")}`;
  }
  return count;
}

export function groupScore(p: Progress, itemIds: string[]): { done: number; correct: number; total: number } {
  let done = 0;
  let correct = 0;
  for (const id of itemIds) {
    const r = p.items[id];
    if (!r || (r.status !== "solved" && r.status !== "revealed")) continue;
    done++;
    if (r.firstTry) correct++;
  }
  return { done, correct, total: itemIds.length };
}
