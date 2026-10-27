import Link from "next/link";
import { useState } from "react";
import { protect } from "../src/server/protect.ts";
import { Layout } from "../src/components/Layout.tsx";
import { loadCourse, weekSummaries } from "../src/server/load.ts";
import { currentWeek, ROLE_LABEL } from "../src/lib/weeks.ts";
import type { WeekSummary } from "../src/lib/weeks.ts";
import { useProgress } from "../src/state/ProgressContext.tsx";
import { dayKey, dueCards, newCardAllowance, addDays } from "../src/lib/leitner.ts";
import { groupScore, streak } from "../src/lib/progress.ts";
import { suggest } from "../src/lib/tags.ts";

interface Props {
  weeks: WeekSummary[];
  placementIds: string[];
  roleOrder: string[];
}

export default function Home({ weeks, placementIds, roleOrder }: Props) {
  const { progress, ready } = useProgress();
  const [now] = useState(() => Date.now());
  const today = dayKey(new Date(now));
  const due = dueCards(progress.cards, today).length;
  const introduced = progress.newCards.day === today ? progress.newCards.count : 0;
  const fresh = newCardAllowance(due, introduced);
  const placement = groupScore(progress, placementIds);
  const week = currentWeek(weeks, progress);
  const nextRole = week ? roleOrder.find((r) => {
    const ids = week.ids[r] ?? [];
    return ids.length && groupScore(progress, ids).done < ids.length;
  }) : undefined;
  const tips = suggest(progress.mistakes, now);
  const days = streak(progress.days, today, addDays(today, -1));

  return (
    <Layout>
      <h1>Today</h1>
      <p className="muted">Your plan for today. Check the save status above before switching devices.</p>
      {!ready ? <p className="muted">Loading progress …</p> : null}
      <div className="grid">
        {placement.done < placement.total ? (
          <section className="card highlight">
            <h2>1. Placement test</h2>
            <p>Start with the placement test. It shows what you already know well ({placement.done} / {placement.total} exercises).</p>
            <Link className="button" href="/einstufung">Start the placement test</Link>
          </section>
        ) : null}
        <section className="card">
          <h2>Flashcards</h2>
          <p>
            {due} due · {fresh} new allowed
          </p>
          <p className="muted">10 minutes. Reviews after 1, 3, 7, 14 and 30 days.</p>
          <Link className="button" href="/karten">Practise cards</Link>
        </section>
        {week ? (
          <section className="card">
            <h2>{week.title}</h2>
            <p>{nextRole ? <>Continue with: <strong>{ROLE_LABEL[nextRole]}</strong></> : "Exercises done – don't forget speaking and writing."}</p>
            <Link className="button" href={`/woche/${week.n}`}>Open topic {week.n}</Link>
          </section>
        ) : null}
        <section className="card">
          <h2>Tired? Short day</h2>
          <p>15 minutes: cards and three sentences said aloud. A short day counts.</p>
          <Link className="button secondary" href="/kurz">Start a short day</Link>
        </section>
      </div>

      <section className="card">
        <h2>Tips for you</h2>
        {tips.length ? (
          <ul>
            {tips.map((t) => (
              <li key={t.tag}>
                <strong>{t.info.label}</strong>: {t.count} mistakes in the last 30 days. Practise:{" "}
                {t.info.practice.map((pr, k) => (
                  <span key={pr.href}>
                    {k ? ", " : ""}
                    <Link href={pr.href}>{pr.label}</Link>
                  </span>
                ))}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No focus areas yet. When the same type of mistake happens three times, I'll suggest an exercise here.</p>
        )}
        <p className="muted">Study days in a row: {days}</p>
      </section>

      <section className="card">
        <h2>Everyday topics</h2>
        <ol className="weeks">
          {weeks.map((w) => {
            const all = Object.values(w.ids).flat();
            const s = groupScore(progress, all);
            return (
              <li key={w.n}>
                <Link href={`/woche/${w.n}`}>{w.title.replace(/^Topic \d+: /, "")}</Link>{" "}
                <meter min={0} max={s.total || 1} value={s.done} aria-label={`Topic ${w.n} done`} /> <span className="muted">{s.done}/{s.total}</span>
              </li>
            );
          })}
        </ol>
      </section>
    </Layout>
  );
}

export const getServerSideProps = protect<Props>(() => {
  const course = loadCourse();
  return {
    props: {
      weeks: weekSummaries(course),
      placementIds: Object.values(course.placement.items).filter((i) => i.kind !== "open" && !i.id.startsWith("p-b")).map((i) => i.id),
      roleOrder: ["exercises", "retrieval", "reading", "pronunciation", "quiz"],
    },
  };
});
