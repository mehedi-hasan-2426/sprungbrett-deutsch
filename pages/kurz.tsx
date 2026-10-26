import { useState } from "react";
import Link from "next/link";
import type { GetStaticProps } from "next";
import { Layout } from "../src/components/Layout.tsx";
import { InlineText } from "../src/components/Blocks.tsx";
import { ListeningPlayer } from "../src/components/ListeningPlayer.tsx";
import { loadCourse, weekSummaries } from "../src/server/load.ts";
import { currentWeek } from "../src/lib/weeks.ts";
import type { WeekSummary } from "../src/lib/weeks.ts";
import type { Inline, ScriptPart } from "../src/lib/types.ts";
import { useProgress } from "../src/state/ProgressContext.tsx";

interface Props {
  weeks: WeekSummary[];
  scripts: ScriptPart[][];
  shortDays: Inline[][];
}

export default function ShortDay({ weeks, scripts, shortDays }: Props) {
  const { progress, update } = useProgress();
  const [done, setDone] = useState(false);
  const week = currentWeek(weeks, progress);
  const k = (week?.n ?? 1) - 1;

  return (
    <Layout title="Short day">
      <h1>Short day (15 minutes)</h1>
      <p>15 minutes is better than nothing. A short day counts as a study day.</p>
      <section className="card">
        <h2>1. Flashcards (5 min)</h2>
        <p>Only the cards that are due.</p>
        <Link className="button" href="/karten">Open flashcards</Link>
      </section>
      <section className="card">
        <h2>2. Listening (5 min): {week?.title}</h2>
        <ListeningPlayer parts={scripts[k] ?? []} itemIds={week?.ids.listening ?? []} />
      </section>
      <section className="card">
        <h2>3. Speaking (5 min)</h2>
        <p>
          <InlineText segs={shortDays[k] ?? []} />
        </p>
        <p className="muted">Say three sentences aloud. If you like, write them here (not saved).</p>
        <label className="sr-only" htmlFor="kurz-notes">Your sentences</label>
        <textarea id="kurz-notes" lang="de" rows={3} />
      </section>
      <button
        type="button"
        onClick={() => {
          update((p) => p);
          setDone(true);
        }}
        disabled={done}
      >
        {done ? "Short day saved ✓" : "Short day done"}
      </button>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<Props> = () => {
  const course = loadCourse();
  return {
    props: {
      weeks: weekSummaries(course),
      scripts: course.weeks.map((w) => w.script),
      shortDays: course.weeks.map((w) => w.shortDay),
    },
  };
};
