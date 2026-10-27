import type { Progress } from "./progress.ts";
import { groupScore } from "./progress.ts";

export interface WeekSummary {
  n: number;
  title: string;
  ids: Record<string, string[]>;
  writing: string[];
  practice?: Record<string, string[]>;
}

export interface NavWeek {
  n: number;
  title: string;
  sections: { id: string; title: string; role: string }[];
}

export const ROLE_LABEL: Record<string, string> = {
  vocab: "Vocabulary",
  grammar: "Grammar",
  exercises: "Grammar practice",
  retrieval: "Word recall",
  reading: "Reading",
  listening: "Listening",
  speaking: "Speaking",
  pronunciation: "Pronunciation",
  writing: "Writing",
  quiz: "Review quiz",
  other: "Checkpoint",
};

export function weekTitle(title: string): { german: string; english: string } {
  const m = title.match(/^Week \d+: (.+?)(?: \(([^)]*)\))?(?: · .*)?$/);
  return { german: m?.[1] ?? title, english: m?.[2] ?? "" };
}

export const sectionTitle = (title: string) => title.replace(/^\d+\s+/, "").replace(/\s*\([^)]*\)$/, "");

export function currentWeek(weeks: WeekSummary[], p: Progress): WeekSummary | undefined {
  return weeks.find((w) => {
    const quiz = w.ids.quiz ?? [];
    return groupScore(p, quiz).done < quiz.length;
  }) ?? weeks[weeks.length - 1];
}
