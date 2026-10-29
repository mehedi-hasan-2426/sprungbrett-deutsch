export type Level = "A1" | "A2";
export const LEVEL_KEY = "sprungbrett.level";

export function parseLevel(value: string | null | undefined): Level {
  return value === "A1" ? "A1" : "A2";
}
