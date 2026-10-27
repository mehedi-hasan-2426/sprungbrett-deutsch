import Link from "next/link";
import { protect } from "../../../src/server/protect.ts";
import type { Unit } from "../../../src/lib/types.ts";
import { Layout } from "../../../src/components/Layout.tsx";
import { Blocks, InlineText } from "../../../src/components/Blocks.tsx";
import { groupScore } from "../../../src/lib/progress.ts";
import { ROLE_LABEL, sectionTitle, weekTitle } from "../../../src/lib/weeks.ts";
import { useProgress } from "../../../src/state/ProgressContext.tsx";
import { loadCourse } from "../../../src/server/load.ts";

interface Lesson {
  id: string;
  title: string;
  role: string;
  itemIds: string[];
}

interface Props {
  n: number;
  title: string;
  intro: Unit["intro"];
  shortDay: Unit["shortDay"];
  lessons: Lesson[];
  checkpoint: number | null;
}

export default function WeekPage({ n, title, intro, shortDay, lessons, checkpoint }: Props) {
  const { progress, ready } = useProgress();
  const t = weekTitle(title);
  return (
    <Layout title={`Week ${n}`}>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/plan">Course</Link> <span aria-hidden="true">/</span> <span>Week {n}</span>
      </nav>
      <header className="week-head">
        <p className="eyebrow">Week {n} of 12</p>
        <h1>{t.german}</h1>
        {t.english ? <p className="lede">{t.english}</p> : null}
      </header>
      <div className="intro">
        <Blocks blocks={intro} />
      </div>
      <ol className="lessons">
        {lessons.map((l, k) => {
          const s = groupScore(progress, l.itemIds);
          const soon = l.role === "listening";
          return (
            <li key={l.id}>
              <Link href={`/woche/${n}/${l.id}`} className={soon ? "lesson soon-card" : "lesson"}>
                <span className="lesson-num">{k + 1}</span>
                <span className="lesson-body">
                  {ROLE_LABEL[l.role] && ROLE_LABEL[l.role] !== sectionTitle(l.title) ? <span className="lesson-role">{ROLE_LABEL[l.role]}</span> : null}
                  <span className="lesson-title">{sectionTitle(l.title)}</span>
                  <span className="lesson-meta">
                    {soon ? "Coming soon" : s.total ? (ready ? `${s.done} of ${s.total} exercises done` : `${s.total} exercises`) : "Read and practise"}
                  </span>
                </span>
                {!soon && s.total ? (
                  <meter className="lesson-meter" min={0} max={s.total} value={ready ? s.done : 0} aria-label={`${sectionTitle(l.title)} progress`} />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>
      {shortDay.length ? (
        <section className="card">
          <h2>Short on time? (15 min)</h2>
          <p>
            <InlineText segs={shortDay} />
          </p>
        </section>
      ) : null}
      {checkpoint ? (
        <p>
          <Link className="button" href={`/checkpoint/${checkpoint}`}>
            Open checkpoint {checkpoint}
          </Link>
        </p>
      ) : null}
      <nav className="pager" aria-label="Weeks">
        {n > 1 ? <Link href={`/woche/${n - 1}`}>← Week {n - 1}</Link> : <span />}
        {n < 12 ? <Link href={`/woche/${n + 1}`}>Week {n + 1} →</Link> : <Link href="/checkpoint/3">Checkpoint 3 →</Link>}
      </nav>
    </Layout>
  );
}

export const getServerSideProps = protect<Props>(({ params }) => {
  const course = loadCourse();
  const n = Number(params?.n);
  const unit = course.weeks[n - 1];
  if (!unit) return { notFound: true };
  const checkpoint = course.checkpoints.find((c) => c.week === n)?.n ?? null;
  const lessons = unit.sections.map((s) => ({
    id: s.id,
    title: s.title,
    role: s.role,
    itemIds: s.role === "listening" ? [] : s.blocks.flatMap((b) => (b.kind === "item" ? [b.itemId] : [])),
  }));
  return { props: { n, title: unit.title, intro: unit.intro, shortDay: unit.shortDay, lessons, checkpoint } };
});
