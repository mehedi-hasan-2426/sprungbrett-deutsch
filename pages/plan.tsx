import Link from "next/link";
import { protect } from "../src/server/protect.ts";
import type { Doc } from "../src/lib/types.ts";
import { Layout } from "../src/components/Layout.tsx";
import { Blocks } from "../src/components/Blocks.tsx";
import { RoleIcon } from "../src/components/RoleIcon.tsx";
import { loadCourse, weekSummaries } from "../src/server/load.ts";
import type { WeekSummary } from "../src/lib/weeks.ts";
import { currentWeek, STAGES, weekTitle } from "../src/lib/weeks.ts";
import { groupScore } from "../src/lib/progress.ts";
import { useProgress } from "../src/state/ProgressContext.tsx";

interface Props {
  doc: Doc;
  weeks: WeekSummary[];
  placementIds: string[];
}

const GUIDES: [string, string][] = [
  ["/material/grammatik", "Grammar overview"],
  ["/material/wortschatz", "Vocabulary and review"],
  ["/material/hoeren-lesen", "Listening and reading resources"],
  ["/material/sprechen", "Speaking and pronunciation"],
  ["/material/schreiben", "Writing rubric and phrases"],
];

type Status = "done" | "current" | "todo";

function Step({ href, status, title, detail, icon, percent }: { href: string; status: Status; title: string; detail: string; icon: string; percent?: number }) {
  return (
    <li className={`path-step is-${status}`}>
      <Link href={href} className="path-node" aria-current={status === "current" ? "step" : undefined}>
        <span className="path-dot">{status === "done" ? <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> : <RoleIcon role={icon} />}</span>
        <span className="path-text">
          <span className="path-title" lang="de">{title}</span>
          <span className="path-detail">{detail}</span>
        </span>
        {percent !== undefined ? <span className="path-percent">{percent}%</span> : null}
        <span className="sr-only">{status === "done" ? "(completed)" : status === "current" ? "(current)" : ""}</span>
      </Link>
    </li>
  );
}

export default function Plan({ doc, weeks, placementIds }: Props) {
  const { progress } = useProgress();
  const current = currentWeek(weeks, progress);
  const placement = groupScore(progress, placementIds);
  const placementDone = placement.done >= placement.total;

  const topicState = (w: WeekSummary) => {
    const all = [...Object.values(w.ids), ...Object.values(w.practice ?? {})].flat();
    const score = groupScore(progress, all);
    const quiz = w.ids.quiz ?? [];
    const done = quiz.length > 0 && groupScore(progress, quiz).done >= quiz.length;
    const status: Status = done ? "done" : w.n === current?.n ? "current" : "todo";
    return { status, percent: score.total ? Math.round((score.done / score.total) * 100) : 0 };
  };

  return (
    <Layout title="Learning path">
      <header className="path-head">
        <div>
          <h1 className="accent-heading">{doc.title}</h1>
          <p className="muted">Twelve everyday topics at your own pace. Finish a topic&apos;s review quiz to move on.</p>
        </div>
        {current ? (
          <Link className="button" href={`/woche/${current.n}`}>Continue: {weekTitle(current.title).german}</Link>
        ) : null}
      </header>

      <ol className="path">
        <Step href="/einstufung" status={placementDone ? "done" : "todo"} title="Einstufungstest" detail="Placement test · optional starting point" icon="placement" />
      </ol>

      {STAGES.map((stage) => {
        const topics = weeks.filter((w) => (stage.topics as readonly number[]).includes(w.n));
        const states = topics.map(topicState);
        const stageDone = states.every((s) => s.status === "done");
        return (
          <section key={stage.n} className="path-stage" aria-labelledby={`stage-${stage.n}`}>
            <h2 id={`stage-${stage.n}`} className="path-stage-title">
              {stage.title} <span className="muted">Topics {stage.topics[0]}–{stage.topics[stage.topics.length - 1]}</span>
            </h2>
            <ol className="path">
              {topics.map((w, k) => {
                const { status, percent } = states[k] ?? { status: "todo" as Status, percent: 0 };
                const { german, english } = weekTitle(w.title);
                return <Step key={w.n} href={`/woche/${w.n}`} status={status} title={german} detail={english ? `Topic ${w.n} · ${english}` : `Topic ${w.n}`} icon="reading" percent={percent} />;
              })}
              <Step href={`/checkpoint/${stage.checkpoint}`} status={stageDone ? "current" : "todo"} title={`Checkpoint ${stage.checkpoint}`} detail={`Check what you can do after topics ${stage.topics[0]}–${stage.topics[stage.topics.length - 1]}`} icon="other" />
            </ol>
          </section>
        );
      })}

      <details className="path-more">
        <summary>Guides and resources</summary>
        <ul className="path-guides">
          {GUIDES.map(([href, label]) => <li key={href}><Link href={href}>{label}</Link></li>)}
        </ul>
      </details>
      <details className="path-more">
        <summary>How to use this path</summary>
        <div className="doc"><Blocks blocks={doc.blocks} /></div>
      </details>
    </Layout>
  );
}

export const getServerSideProps = protect<Props>(() => {
  const course = loadCourse();
  const doc = course.docs.find((d) => d.slug === "plan");
  if (!doc) return { notFound: true };
  return { props: { doc, weeks: weekSummaries(course), placementIds: Object.values(course.placement.items).filter((i) => i.kind !== "open" && !i.id.startsWith("p-b")).map((i) => i.id) } };
});
