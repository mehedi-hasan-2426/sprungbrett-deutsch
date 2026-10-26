import type { Item } from "../lib/types.ts";

// Answers that cannot be derived mechanically from the answer key text.
export const OVERRIDES: Record<string, Partial<Pick<Item, "answers" | "blanks">>> = {
  "p-d3-10": { answers: [["einen", "eine"]], blanks: 2 },
};
