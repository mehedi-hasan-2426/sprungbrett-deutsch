import type { Category } from "./types.ts";

export interface CategoryInfo {
  label: string;
  practice: { label: string; href: string }[];
}

export const CATEGORIES: Record<Category, CategoryInfo> = {
  VP: { label: "Verb position", practice: [{ label: "Word order", href: "/grammatik/conjunctions/subordinate" }, { label: "Questions", href: "/grammatik/sentence-structure/answering-questions" }] },
  KA: { label: "Case and articles", practice: [{ label: "Dative", href: "/grammatik/cases/dative" }, { label: "Choosing cases", href: "/grammatik/cases/nominative-accusative-dative" }] },
  GE: { label: "Gender (der/die/das)", practice: [{ label: "Article trainer", href: "/artikel" }] },
  PL: { label: "Plural", practice: [{ label: "Article trainer", href: "/artikel" }] },
  VF: { label: "Verb form", practice: [{ label: "Irregular verbs", href: "/grammatik/verbs/irregular" }, { label: "Present perfect", href: "/grammatik/tenses/present-perfect" }] },
  PR: { label: "Prepositions", practice: [{ label: "Accusative or dative", href: "/grammatik/cases/accusative-dative" }] },
  WS: { label: "Vocabulary and understanding", practice: [{ label: "Flashcards", href: "/karten" }] },
  AU: { label: "Pronunciation", practice: [{ label: "Speaking and pronunciation", href: "/material/sprechen" }] },
  RS: { label: "Spelling and capitals", practice: [{ label: "Grammar overview", href: "/material/grammatik" }] },
  HÖ: { label: "Listening", practice: [{ label: "Listening and reading", href: "/material/hoeren-lesen" }] },
};

const CASE_FORMS = new Set([
  "dem", "den", "der", "des", "einem", "einer", "einen", "keinem", "keiner", "keinen",
  "meinem", "meiner", "meinen", "deinem", "deinen", "seinem", "seinen", "seiner",
  "ihrem", "ihren", "ihrer", "unserem", "unseren", "unserer", "eurem", "euren",
  "mir", "dir", "ihm", "ihr", "uns", "euch", "ihnen", "mich", "dich", "sich",
  "zum", "zur", "im", "ins", "am", "ans", "beim", "vom",
]);

export function guessTag(prompt: string, answer: string, group: string): Category {
  const p = prompt.toLowerCase();
  const a = answer.toLowerCase().trim();
  if (group.startsWith("A")) return "AU";
  if (group === "Hören" || group === "B") return "HÖ";
  if (/plural/.test(p)) return "PL";
  if (/artikel/.test(p) || /^(der|die|das)$/.test(a)) return "GE";
  if (/\b(vor|seit|nach|in|für)\b oder/.test(p) || /^(vor|seit|nach|für)$/.test(a)) return "PR";
  if (CASE_FORMS.has(a) || /\((der|die|das|ein|eine|kein|mein|meine|unser|ihr|sein)[,)]/.test(p) || /zu \+/.test(p)) return "KA";
  if (/ordne|beginne|frage/.test(p)) return "VP";
  if (group === "Lesen" || group === "A" || group === "C" || group.startsWith("V")) return "WS";
  return "VF";
}

export interface Mistake {
  tag: Category;
  at: number;
}

export interface Suggestion {
  tag: Category;
  count: number;
  info: CategoryInfo;
}

export const FOCUS_THRESHOLD = 3;
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function suggest(mistakes: Mistake[], now: number, limit = 2): Suggestion[] {
  const counts = new Map<Category, number>();
  for (const m of mistakes) {
    if (now - m.at > WINDOW_MS) continue;
    counts.set(m.tag, (counts.get(m.tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= FOCUS_THRESHOLD)
    .sort((x, y) => y[1] - x[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count, info: CATEGORIES[tag] }));
}
