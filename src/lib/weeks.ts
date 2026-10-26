import type { Progress } from "./progress.ts";
import { groupScore } from "./progress.ts";

export interface WeekSummary {
  n: number;
  title: string;
  ids: Record<string, string[]>;
  writing: string[];
}

export function currentWeek(weeks: WeekSummary[], p: Progress): WeekSummary | undefined {
  return weeks.find((w) => {
    const quiz = w.ids.quiz ?? [];
    return groupScore(p, quiz).done < quiz.length;
  }) ?? weeks[weeks.length - 1];
}
