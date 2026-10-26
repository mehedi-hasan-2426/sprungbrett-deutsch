export type Advice = "incomplete" | "all80" | "all60" | "one-below" | "multi-below";

export function percent(points: number, max: number): number | null {
  if (!Number.isFinite(points) || !Number.isFinite(max) || max <= 0) return null;
  return Math.round((Math.min(Math.max(points, 0), max) / max) * 100);
}

export function advise(areas: (number | null)[]): { advice: Advice; below: number[] } {
  if (!areas.length || areas.some((a) => a === null)) return { advice: "incomplete", below: [] };
  const values = areas as number[];
  const below = values.flatMap((v, k) => (v < 60 ? [k] : []));
  if (below.length >= 2) return { advice: "multi-below", below };
  if (below.length === 1) return { advice: "one-below", below };
  return { advice: values.every((v) => v >= 80) ? "all80" : "all60", below };
}

export const ADVICE_TEXT: Record<Advice, string> = {
  incomplete: "Not all areas are done yet.",
  all80: "Continue as planned. Spend more time on speaking and free listening.",
  all60: "Continue as planned. Note areas under 80 % as focus points.",
  "one-below": "Before the next week, add one extra day just for the weak area.",
  "multi-below": "Repeat the weakest of the last 4 weeks. That is normal.",
};
