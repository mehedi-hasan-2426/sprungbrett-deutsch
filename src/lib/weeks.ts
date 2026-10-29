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
  total?: number;
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

export const STAGES = [
  { n: 1, title: "Stage 1", topics: [1, 2, 3, 4], checkpoint: 1 },
  { n: 2, title: "Stage 2", topics: [5, 6, 7, 8], checkpoint: 2 },
  { n: 3, title: "Stage 3", topics: [9, 10, 11, 12], checkpoint: 3 },
] as const;

export const stageOf = (topic: number) => STAGES.find((s) => (s.topics as readonly number[]).includes(topic));

export function weekTitle(title: string): { german: string; english: string } {
  const m = title.match(/^(?:Week|Topic) \d+: (.+?)(?: \(([^)]*)\))?(?: · .*)?$/);
  return { german: m?.[1] ?? title, english: m?.[2] ?? "" };
}

export const sectionTitle = (title: string) => title.replace(/^\d+\s+/, "").replace(/\s*\([^)]*\)$/, "");

export function currentWeek(weeks: WeekSummary[], p: Progress): WeekSummary | undefined {
  return weeks.find((w) => {
    const quiz = w.ids.quiz ?? [];
    return groupScore(p, quiz).done < quiz.length;
  }) ?? weeks[weeks.length - 1];
}
