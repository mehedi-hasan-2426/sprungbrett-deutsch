import Link from "next/link";
import { protect } from "../../../src/server/protect.ts";
import type { Section, Unit } from "../../../src/lib/types.ts";
import { Layout } from "../../../src/components/Layout.tsx";
import { SectionView } from "../../../src/components/SectionView.tsx";
import type { WritingRubric } from "../../../src/components/SectionView.tsx";
import { sectionTitle, weekTitle } from "../../../src/lib/weeks.ts";
import { loadCourse } from "../../../src/server/load.ts";

interface Neighbour {
  href: string;
  label: string;
}

interface Props {
  n: number;
  unit: Unit;
  section: Section;
  rubric: WritingRubric;
  prev: Neighbour | null;
  next: Neighbour;
  index: number;
  total: number;
}

export default function LessonPage({ n, unit, section, rubric, prev, next, index, total }: Props) {
  const outline = section.blocks.flatMap((b, k) => (b.kind === "h" ? [{ id: `h-${k}`, label: b.text.map((s) => s.t).join("") }] : []));
  const week = weekTitle(unit.title).german;
  const title = sectionTitle(section.title);
  return (
    <Layout title={`${title} · Week ${n}`}>
      <div className={outline.length > 1 ? "lesson-grid" : undefined}>
        <article>
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href="/plan">Course</Link> <span aria-hidden="true">/</span> <Link href={`/woche/${n}`}>Week {n}: {week}</Link>{" "}
            <span aria-hidden="true">/</span> <span>{title}</span>
          </nav>
          <p className="eyebrow">Week {n} · Lesson {index + 1} of {total}</p>
          <h1>{title}</h1>
          <div className={`lesson-content role-${section.role}`}>
            <SectionView key={`${unit.id}-${section.id}`} unit={unit} section={section} rubric={rubric} idPrefix="h" />
          </div>
          <nav className="pager" aria-label="Lessons">
            {prev ? <Link href={prev.href}>← {prev.label}</Link> : <span />}
            <Link href={next.href}>{next.label} →</Link>
          </nav>
        </article>
        {outline.length > 1 ? (
          <nav className="outline" aria-label="On this page">
            <p className="eyebrow">On this page</p>
            <ul>
              {outline.map((h) => (
                <li key={h.id}>
                  <a href={`#${h.id}`}>{h.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </Layout>
  );
}

export const getServerSideProps = protect<Props>(({ params }) => {
  const course = loadCourse();
  const n = Number(params?.n);
  const unit = course.weeks[n - 1];
  const index = unit?.sections.findIndex((s) => s.id === params?.section) ?? -1;
  const section = unit?.sections[index];
  if (!unit || !section) return { notFound: true };
  const before = unit.sections[index - 1];
  const after = unit.sections[index + 1];
  const checkpoint = course.checkpoints.find((c) => c.week === n)?.n;
  const prev = before ? { href: `/woche/${n}/${before.id}`, label: sectionTitle(before.title) } : n > 1 ? { href: `/woche/${n - 1}`, label: `Week ${n - 1}` } : null;
  const next = after
    ? { href: `/woche/${n}/${after.id}`, label: sectionTitle(after.title) }
    : checkpoint
      ? { href: `/checkpoint/${checkpoint}`, label: `Checkpoint ${checkpoint}` }
      : { href: `/woche/${n + 1}`, label: `Week ${n + 1}` };
  return {
    props: { n, unit, section, rubric: { criteria: course.rubric.writing, max: 2, checklist: course.rubric.checklist }, prev, next, index, total: unit.sections.length },
  };
});
