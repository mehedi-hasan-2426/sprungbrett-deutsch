export const INTERVALS = [1, 3, 7, 14, 30] as const;
export const MAX_NEW_PER_DAY = 7;
export const SECONDS_PER_REVIEW = 20;
export const REVIEW_BUDGET_SECONDS = 15 * 60;

export interface CardState {
  box: number;
  due: string;
  learned?: boolean;
}

export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return dayKey(new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + n));
}

export function review(state: CardState | undefined, ok: boolean, today: string): CardState {
  const box = state?.box ?? 1;
  if (!ok) return { box: 1, due: addDays(today, INTERVALS[0]) };
  if (box >= INTERVALS.length) return { box: INTERVALS.length, due: addDays(today, INTERVALS[INTERVALS.length - 1] ?? 30), learned: true };
  const next = box + 1;
  return { box: next, due: addDays(today, INTERVALS[next - 1] ?? 30) };
}

export function dueCards(states: Record<string, CardState>, today: string): string[] {
  return Object.entries(states)
    .filter(([, s]) => !s.learned && s.due <= today)
    .sort((a, b) => a[1].due.localeCompare(b[1].due) || a[1].box - b[1].box)
    .map(([id]) => id);
}

export function newCardAllowance(dueCount: number, introducedToday: number): number {
  if (dueCount * SECONDS_PER_REVIEW > REVIEW_BUDGET_SECONDS) return 0;
  return Math.max(0, MAX_NEW_PER_DAY - introducedToday);
}
