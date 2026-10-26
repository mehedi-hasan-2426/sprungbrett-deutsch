import Link from "next/link";
import type { GetStaticPaths, GetStaticProps } from "next";
import type { Unit } from "../../src/lib/types.ts";
import { Layout } from "../../src/components/Layout.tsx";
import { UnitView } from "../../src/components/UnitView.tsx";
import type { WritingRubric } from "../../src/components/UnitView.tsx";
import { loadCourse } from "../../src/server/load.ts";

interface Props {
  n: number;
  unit: Unit;
  rubric: WritingRubric;
  checkpoint: number | null;
}

export default function WeekPage({ n, unit, rubric, checkpoint }: Props) {
  return (
    <Layout title={`Week ${n}`}>
      <h1>{unit.title}</h1>
      <UnitView unit={unit} rubric={rubric} />
      {checkpoint ? (
        <p className="card">
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

export const getStaticPaths: GetStaticPaths = () => ({
  paths: Array.from({ length: 12 }, (_, k) => ({ params: { n: String(k + 1) } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<Props> = ({ params }) => {
  const course = loadCourse();
  const n = Number(params?.n);
  const unit = course.weeks[n - 1];
  if (!unit) return { notFound: true };
  const checkpoint = course.checkpoints.find((c) => c.week === n)?.n ?? null;
  return { props: { n, unit, rubric: { criteria: course.rubric.writing, max: 2, checklist: course.rubric.checklist }, checkpoint } };
};
