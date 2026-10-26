import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Course } from "../lib/types.ts";
import type { WeekSummary } from "../lib/weeks.ts";

let cached: Course | null = null;

export function loadCourse(): Course {
  cached ??= JSON.parse(readFileSync(join(process.cwd(), "content", "generated", "course.json"), "utf8")) as Course;
  return cached;
}

export function weekSummaries(course: Course): WeekSummary[] {
  return course.weeks.map((w, k) => {
    const ids: Record<string, string[]> = {};
    for (const section of w.sections) {
      if (section.role === "listening") continue;
      for (const block of section.blocks) {
        if (block.kind === "item") (ids[section.role] ??= []).push(block.itemId);
      }
    }
    return { n: k + 1, title: w.title, ids, writing: w.writing.map((t) => t.id) };
  });
}
