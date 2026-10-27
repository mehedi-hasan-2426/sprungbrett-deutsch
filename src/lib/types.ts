export type Category = "VP" | "KA" | "GE" | "PL" | "VF" | "PR" | "WS" | "AU" | "RS" | "HÖ";

export interface Inline {
  t: string;
  b?: boolean;
  i?: boolean;
  href?: string;
}

export type Block =
  | { kind: "h"; text: Inline[] }
  | { kind: "p"; text: Inline[] }
  | { kind: "list"; items: Inline[][]; checks?: boolean }
  | { kind: "table"; header: Inline[][]; rows: Inline[][][]; variant?: "vocabulary" }
  | { kind: "quote"; lines: Inline[][] }
  | { kind: "code"; text: string }
  | { kind: "item"; itemId: string };

export type ItemKind = "text" | "choice" | "open";

export interface Item {
  id: string;
  n: number;
  group: string;
  prompt: string;
  kind: ItemKind;
  blanks: number;
  capStart: boolean;
  options?: { key: string; label: string }[];
  correct?: string;
  answers: string[][];
  display: string;
  tag: Category;
  hint: string;
  rule: string;
  difficulty?: "easy" | "medium" | "hard";
}

export interface Section {
  id: string;
  title: string;
  role: SectionRole;
  blocks: Block[];
}

export type SectionRole =
  | "vocab"
  | "grammar"
  | "exercises"
  | "retrieval"
  | "reading"
  | "listening"
  | "speaking"
  | "pronunciation"
  | "writing"
  | "quiz"
  | "other";

export interface ScriptLine {
  speaker: string;
  text: string;
}

export interface ScriptPart {
  title: string;
  lines: ScriptLine[];
}

export interface WritingTask {
  id: string;
  prompt: Inline[];
  min: number;
  max: number;
  model: string;
}

export interface VocabEntry {
  id: string;
  week: number;
  term: string;
  forms: string;
  example: string;
  meaning?: string;
  exampleEn?: string;
  article?: "der" | "die" | "das";
  noun?: string;
  plural?: string;
}

export interface Unit {
  id: string;
  title: string;
  intro: Block[];
  sections: Section[];
  items: Record<string, Item>;
  script: ScriptPart[];
  writing: WritingTask[];
  notes: Record<string, Block[]>;
  shortDay: Inline[];
}

export interface Checkpoint {
  n: number;
  week: number;
  writing?: WritingTask;
  speaking?: Inline[];
  canDo: string[];
}

export interface Doc {
  slug: string;
  title: string;
  blocks: Block[];
}

export interface Course {
  placement: Unit;
  weeks: Unit[];
  vocab: VocabEntry[];
  checkpoints: Checkpoint[];
  docs: Doc[];
  rubric: { writing: string[]; checklist: string[] };
}
